from pathlib import Path
from typing import Dict, List
import hashlib
import re

from models import Document
from observability import new_trace, log_event, StageTimer


def make_doc_id(relative_path: str, text: str) -> str:
    raw = f"{relative_path}::{text[:500]}".encode("utf-8")
    return hashlib.md5(raw).hexdigest()


def derive_title(file_path: Path, text: str) -> str:
    for line in text.splitlines():
        line = line.strip()
        if line.startswith("# "):
            return line.replace("# ", "", 1).strip()

    return file_path.stem.replace("_", " ").replace("-", " ").title()


def extract_frontmatter(text: str) -> tuple[Dict[str, str], str]:
    """
    Extract simple YAML-style frontmatter.

    Expected:

    ---
    service_id: content_strategy_seo
    doc_type: service
    ---
    """
    metadata: Dict[str, str] = {}

    text = text.lstrip()

    if not text.startswith("---"):
        return metadata, text

    parts = text.split("---", 2)

    if len(parts) < 3:
        return metadata, text

    frontmatter = parts[1].strip()
    body = parts[2].strip()

    for line in frontmatter.splitlines():
        line = line.strip()

        if not line or ":" not in line:
            continue

        key, value = line.split(":", 1)
        metadata[key.strip()] = value.strip()

    return metadata, body


def load_markdown_corpus(corpus_dir: str) -> List[Document]:
    trace = new_trace("load_corpus")
    base = Path(corpus_dir)

    with StageTimer(trace, "validate_corpus_path", extra={"corpus_dir": corpus_dir}):
        if not base.exists():
            raise FileNotFoundError(f"Corpus directory not found: {corpus_dir}")

    documents: List[Document] = []
    markdown_files = sorted(base.rglob("*.md"))

    log_event(
        trace,
        "discover_files",
        "completed",
        total_markdown_files=len(markdown_files),
    )

    for file_path in markdown_files:
        rel_path = str(file_path.relative_to(base))

        try:
            with StageTimer(trace, "read_file", extra={"file": rel_path}):
                raw_text = file_path.read_text(
                    encoding="utf-8",
                    errors="replace",
                ).strip()

            if not raw_text:
                log_event(trace, "read_file", "skip_empty_file", file=rel_path)
                continue

            frontmatter, text = extract_frontmatter(raw_text)
            print(
                "FRONTMATTER DEBUG:",
                rel_path,
                frontmatter,
                flush=True,
            )

            doc_id = make_doc_id(rel_path, text)
            title = derive_title(file_path, text)

            doc = Document(
                doc_id=doc_id,
                source_path=str(file_path),
                relative_path=rel_path,
                title=title,
                description="",
                keywords=[],
                text=text,
                metadata={
                    "source_type": "markdown",
                    "relative_path": rel_path,
                    **frontmatter,
                },
            )

            documents.append(doc)

            log_event(
                trace,
                "read_file",
                "loaded",
                file=rel_path,
                doc_id=doc_id,
                title=title,
                doc_type=frontmatter.get("doc_type"),
                service_id=frontmatter.get("service_id"),
                char_count=len(text),
            )

        except Exception as exc:
            log_event(trace, "read_file", "failed", file=rel_path, error=str(exc))
            raise

    log_event(trace, "load_corpus", "completed", total_docs=len(documents))
    return documents


def evaluate_corpus(documents: List[Document]) -> Dict[str, object]:
    total_docs = len(documents)
    total_chars = sum(len(d.text) for d in documents)

    by_folder: Dict[str, int] = {}
    by_doc_type: Dict[str, int] = {}
    by_service: Dict[str, int] = {}

    for doc in documents:
        folder = str(Path(doc.relative_path).parent)
        by_folder[folder] = by_folder.get(folder, 0) + 1

        doc_type = doc.metadata.get("doc_type", "unknown")
        by_doc_type[doc_type] = by_doc_type.get(doc_type, 0) + 1

        service_id = doc.metadata.get("service_id", "unknown")
        by_service[service_id] = by_service.get(service_id, 0) + 1

    return {
        "total_docs": total_docs,
        "total_chars": total_chars,
        "avg_chars_per_doc": round(total_chars / total_docs, 2) if total_docs else 0,
        "docs_by_folder": dict(sorted(by_folder.items())),
        "docs_by_doc_type": dict(sorted(by_doc_type.items())),
        "docs_by_service": dict(sorted(by_service.items())),
    }


def print_evaluation_summary(summary: Dict[str, object]) -> None:
    print("\n=== CORPUS EVALUATION SUMMARY ===")
    print(f"Total docs: {summary['total_docs']}")
    print(f"Total chars: {summary['total_chars']}")
    print(f"Avg chars/doc: {summary['avg_chars_per_doc']}")

    print("\nDocs by folder:")
    for folder, count in summary["docs_by_folder"].items():
        print(f"  {folder}: {count}")

    print("\nDocs by doc_type:")
    for doc_type, count in summary["docs_by_doc_type"].items():
        print(f"  {doc_type}: {count}")

    print("\nDocs by service:")
    for service, count in summary["docs_by_service"].items():
        print(f"  {service}: {count}")


if __name__ == "__main__":
    docs = load_markdown_corpus("./data/corpus")
    summary = evaluate_corpus(docs)
    print_evaluation_summary(summary)