import argparse
import sys
from pathlib import Path
from typing import Dict

from rich.console import Console
from rich.panel import Panel
from rich.table import Table

from load_corpus import load_markdown_corpus, evaluate_corpus
from chunker import chunk_documents
from store import init_db, reset_chunks_table, insert_chunks, evaluate_chunks


if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")


console = Console()


def print_banner() -> None:
    console.print(
        Panel.fit(
            "[bold cyan]RAG Corpus CLI[/bold cyan]\n"
            "[dim]load | chunk | store[/dim]",
            border_style="cyan",
        )
    )


def print_corpus_summary(summary: Dict[str, object]) -> None:
    table = Table(title="Corpus Evaluation Summary", show_lines=False)
    table.add_column("Metric", style="bold green")
    table.add_column("Value", style="white")

    table.add_row("Total docs", str(summary["total_docs"]))
    table.add_row("Total chars", str(summary["total_chars"]))
    table.add_row("Avg chars / doc", str(summary["avg_chars_per_doc"]))

    console.print(table)

    folder_table = Table(title="Docs by Folder")
    folder_table.add_column("Folder", style="bold yellow")
    folder_table.add_column("Count", justify="right", style="white")

    for folder, count in summary["docs_by_folder"].items():
        folder_table.add_row(str(folder), str(count))

    console.print(folder_table)

    if "docs_by_doc_type" in summary:
        type_table = Table(title="Docs by Doc Type")
        type_table.add_column("Doc Type", style="bold yellow")
        type_table.add_column("Count", justify="right", style="white")

        for doc_type, count in summary["docs_by_doc_type"].items():
            type_table.add_row(str(doc_type), str(count))

        console.print(type_table)

    if "docs_by_service" in summary:
        service_table = Table(title="Docs by Service")
        service_table.add_column("Service", style="bold yellow")
        service_table.add_column("Count", justify="right", style="white")

        for service, count in summary["docs_by_service"].items():
            service_table.add_row(str(service), str(count))

        console.print(service_table)


def print_chunk_db_summary(summary: Dict[str, object]) -> None:
    table = Table(title="Chunk Storage Summary")
    table.add_column("Metric", style="bold green")
    table.add_column("Value", style="white")

    table.add_row("Total chunks", str(summary["total_chunks"]))
    table.add_row("Avg text length", str(summary["avg_text_length"]))
    table.add_row("Avg description length", str(summary["avg_description_length"]))
    table.add_row("Avg keywords length", str(summary["avg_keywords_length"]))

    console.print(table)

    type_table = Table(title="Chunks by Doc Type")
    type_table.add_column("Doc Type", style="bold yellow")
    type_table.add_column("Count", justify="right", style="white")

    for doc_type, count in summary["chunks_by_doc_type"].items():
        type_table.add_row(str(doc_type), str(count))

    console.print(type_table)

    if "chunks_by_service" in summary:
        service_table = Table(title="Chunks by Service")
        service_table.add_column("Service", style="bold yellow")
        service_table.add_column("Count", justify="right", style="white")

        for service, count in summary["chunks_by_service"].items():
            service_table.add_row(str(service), str(count))

        console.print(service_table)


def run_load(corpus_dir: str) -> None:
    print_banner()

    if not Path(corpus_dir).exists():
        console.print(f"[bold red]Error:[/bold red] corpus path not found: {corpus_dir}")
        raise SystemExit(1)

    with console.status("[bold cyan]Loading corpus...[/bold cyan]", spinner="dots"):
        docs = load_markdown_corpus(corpus_dir)
        summary = evaluate_corpus(docs)

    console.print(f"[bold green][OK] Loaded {len(docs)} documents[/bold green]")
    print_corpus_summary(summary)


def run_chunk(corpus_dir: str) -> None:
    print_banner()

    if not Path(corpus_dir).exists():
        console.print(f"[bold red]Error:[/bold red] corpus path not found: {corpus_dir}")
        raise SystemExit(1)

    with console.status("[bold cyan]Loading + chunking...[/bold cyan]", spinner="dots"):
        docs = load_markdown_corpus(corpus_dir)
        chunks = chunk_documents(docs)

    console.print(f"[bold green][OK] Created {len(chunks)} chunks[/bold green]")

    counts_by_doc_type: Dict[str, int] = {}
    counts_by_service: Dict[str, int] = {}

    for chunk in chunks:
        doc_type = chunk.get("doc_type") or "unknown"
        service = chunk.get("service") or "unknown"

        counts_by_doc_type[doc_type] = counts_by_doc_type.get(doc_type, 0) + 1
        counts_by_service[service] = counts_by_service.get(service, 0) + 1

    type_table = Table(title="Chunks by Doc Type")
    type_table.add_column("Doc Type", style="bold yellow")
    type_table.add_column("Count", justify="right", style="white")

    for doc_type, count in sorted(counts_by_doc_type.items()):
        type_table.add_row(str(doc_type), str(count))

    console.print(type_table)

    service_table = Table(title="Chunks by Service")
    service_table.add_column("Service", style="bold yellow")
    service_table.add_column("Count", justify="right", style="white")

    for service, count in sorted(counts_by_service.items()):
        service_table.add_row(str(service), str(count))

    console.print(service_table)

    preview_count = min(5, len(chunks))
    if preview_count == 0:
        console.print("[bold yellow]No chunks created[/bold yellow]")
        return

    for i, chunk in enumerate(chunks[:preview_count], start=1):
        keywords = chunk.get("keywords", "")
        if isinstance(keywords, list):
            keywords_display = ", ".join(keywords)
        else:
            keywords_display = str(keywords)

        console.print("")
        console.print(f"[bold cyan]Chunk {i}[/bold cyan]")
        console.print(f"[bold yellow]chunk_id:[/bold yellow] {chunk.get('chunk_id')}")
        console.print(f"[bold yellow]doc_type:[/bold yellow] {chunk.get('doc_type')}")
        console.print(f"[bold yellow]service:[/bold yellow] {chunk.get('service')}")
        console.print(f"[bold yellow]relative_path:[/bold yellow] {chunk.get('relative_path')}")

        console.print(Panel(chunk.get("title", ""), title="title", border_style="cyan"))
        console.print(Panel(chunk.get("description", ""), title="description", border_style="blue"))
        console.print(Panel(keywords_display, title="keywords", border_style="magenta"))
        console.print(Panel(chunk.get("text", "")[:700], title="text preview", border_style="green"))


def run_store(
    corpus_dir: str,
    db_path: str,
    recreate: bool = False,
    batch_size: int = 5,
) -> None:
    print_banner()

    console.print(f"[bold cyan]DB:[/bold cyan] {db_path}")
    console.print(f"[bold cyan]Reset mode:[/bold cyan] {'drop+recreate' if recreate else 'delete-only'}")
    console.print(f"[bold cyan]Batch size:[/bold cyan] {batch_size}")

    if not Path(corpus_dir).exists():
        console.print(f"[bold red]Error:[/bold red] corpus path not found: {corpus_dir}")
        raise SystemExit(1)

    conn = None

    try:
        with console.status("[bold cyan]Loading corpus...[/bold cyan]", spinner="dots"):
            docs = load_markdown_corpus(corpus_dir)

        conn = init_db(db_path)
        reset_chunks_table(conn, recreate=recreate)

        total_docs = len(docs)
        total_chunks_inserted = 0

        for start in range(0, total_docs, batch_size):
            end = min(start + batch_size, total_docs)
            batch_docs = docs[start:end]

            with console.status(
                f"[bold cyan]Chunking + storing docs {start + 1}-{end} of {total_docs}...[/bold cyan]",
                spinner="dots",
            ):
                batch_chunks = chunk_documents(batch_docs)
                insert_chunks(conn, batch_chunks)

            total_chunks_inserted += len(batch_chunks)

            console.print(
                f"[bold cyan]Processed docs {start + 1}-{end} of {total_docs}[/bold cyan] | "
                f"batch chunks: [bold]{len(batch_chunks)}[/bold] | "
                f"total chunks: [bold]{total_chunks_inserted}[/bold]"
            )

            if batch_chunks:
                example = batch_chunks[0]
                console.print(f"[dim]Example title:[/dim] {example.get('title', '')[:120]}")
                console.print(f"[dim]Example description:[/dim] {example.get('description', '')[:160]}")

        summary = evaluate_chunks(conn)

        console.print(f"[bold green][OK] Stored {summary['total_chunks']} chunks in DuckDB[/bold green]")
        print_chunk_db_summary(summary)

    finally:
        if conn is not None:
            conn.close()


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="rag-cli",
        description="CLI for loading, chunking, and storing a structured RAG corpus",
    )

    subparsers = parser.add_subparsers(dest="command", required=True)

    load_parser = subparsers.add_parser("load", help="Load corpus and print summary")
    load_parser.add_argument("--corpus-dir", default="./data/corpus")

    chunk_parser = subparsers.add_parser("chunk", help="Load corpus and preview chunks")
    chunk_parser.add_argument("--corpus-dir", default="./data/corpus")

    store_parser = subparsers.add_parser("store", help="Load, chunk, and store chunks in DuckDB")
    store_parser.add_argument("--corpus-dir", default="./data/corpus")
    store_parser.add_argument("--db-path", default="./data/rag.duckdb")
    store_parser.add_argument(
        "--recreate",
        action="store_true",
        help="Drop and recreate chunks table before loading",
    )
    store_parser.add_argument(
        "--batch-size",
        type=int,
        default=5,
        help="Number of documents to process per batch",
    )

    return parser


def main() -> None:
    parser = build_parser()
    args = parser.parse_args()

    try:
        if args.command == "load":
            run_load(args.corpus_dir)

        elif args.command == "chunk":
            run_chunk(args.corpus_dir)

        elif args.command == "store":
            run_store(
                corpus_dir=args.corpus_dir,
                db_path=args.db_path,
                recreate=args.recreate,
                batch_size=args.batch_size,
            )

        else:
            console.print(f"[bold red]Unknown command:[/bold red] {args.command}")
            raise SystemExit(1)

    except KeyboardInterrupt:
        console.print("\n[bold yellow]Interrupted by user[/bold yellow]")
        raise SystemExit(1)

    except Exception as exc:
        console.print(f"[bold red]Failed:[/bold red] {exc}")
        raise SystemExit(1)


if __name__ == "__main__":
    main()