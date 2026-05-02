import json
import argparse
from typing import Any, Dict, List, Optional

from rich.console import Console
from rich.panel import Panel
from rich.table import Table

from retrieval_stdin import (
    init_db,
    load_faiss_index,
    load_faiss_meta,
    handle_request,
)

console = Console()

DEFAULT_DB_PATH = "./data/rag.duckdb"
DEFAULT_EVAL_PATH = "./data/eval.json"
DEFAULT_FAISS_INDEX_PATH = "./data/faiss.index"
DEFAULT_FAISS_META_PATH = "./data/faiss_meta.pkl"

VALID_DOC_TYPES = {"overview", "service", "concern", "pricing"}

def query_number(q: Dict[str, Any]) -> int:
    qid = str(q.get("id", ""))
    digits = "".join(ch for ch in qid if ch.isdigit())
    return int(digits) if digits else 0


def get_batch_number(q: Dict[str, Any], batch_size: int) -> int:
    n = query_number(q)
    if n <= 0:
        return 0
    return ((n - 1) // batch_size) + 1


def parse_batches(value: Optional[str]) -> Optional[List[int]]:
    if not value:
        return None

    batches: List[int] = []

    for part in value.split(","):
        part = part.strip()
        if not part:
            continue

        if "-" in part:
            start, end = part.split("-", 1)
            batches.extend(range(int(start), int(end) + 1))
        else:
            batches.append(int(part))

    return sorted(set(batches))


def filter_queries_by_batches(
    queries: List[Dict[str, Any]],
    batches: Optional[List[int]],
    batch_size: int,
) -> List[Dict[str, Any]]:
    if not batches:
        return queries

    return [
        q for q in queries
        if get_batch_number(q, batch_size) in batches
    ]

def load_eval_queries(path: str) -> List[Dict[str, Any]]:
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def normalize_doc_type(value: Optional[str]) -> Optional[str]:
    if value == "general":
        return "overview"
    return value


def get_expected_list(q: Dict[str, Any], plural_key: str, single_key: str) -> List[Any]:
    if plural_key in q:
        value = q[plural_key]
        return value if isinstance(value, list) else [value]

    if single_key in q:
        value = q[single_key]
        return [] if value is None else [value]

    return []


def normalize_expected_doc_types(values: List[str]) -> List[str]:
    return [normalize_doc_type(v) for v in values if v]


def normalize_expected_services(values: List[Optional[str]]) -> List[str]:
    return [v for v in values if v]


def evaluate_route_doc_type(
    route: Dict[str, Any],
    expected_doc_types: List[str],
) -> Dict[str, bool]:
    actual_doc_type = normalize_doc_type(route.get("doc_type"))

    doc_type_ok = (
        not expected_doc_types
        or actual_doc_type in expected_doc_types
    )

    return {
        "route_doc_type_ok": doc_type_ok,
    }


def evaluate_retrieval(
    results: List[Dict[str, Any]],
    expected_doc_types: List[str],
    expected_services: List[str],
) -> Dict[str, bool]:
    result_doc_types = {
        normalize_doc_type(r.get("doc_type"))
        for r in results
    }

    result_services = {
        r.get("service")
        for r in results
    }

    doc_type_hit = (
        not expected_doc_types
        or any(dt in result_doc_types for dt in expected_doc_types)
    )

    service_hit = (
        not expected_services
        or any(s in result_services for s in expected_services)
    )

    return {
        "retrieval_doc_type_hit": doc_type_hit,
        "retrieval_service_hit": service_hit,
        "retrieval_route_hit": doc_type_hit and service_hit,
    }


def summarize(hit: Dict[str, Any], max_chars: int = 120) -> str:
    text = (hit.get("text") or "").replace("\n", " ")
    return text[:max_chars] + "..." if len(text) > max_chars else text


def print_result(
    q: Dict[str, Any],
    response: Dict[str, Any],
    route_checks: Dict[str, bool],
    retrieval_checks: Dict[str, bool],
    expected_doc_types: List[str],
    expected_services: List[str],
) -> None:
    route = response.get("route", {})
    chosen_filter = response.get("chosen_filter")
    results = response.get("results", [])

    console.print("")
    console.print(Panel.fit(f"[bold cyan]{q.get('id', '')}[/bold cyan]\n{q['query']}"))

    expected_table = Table(title="Expected")
    expected_table.add_column("Field")
    expected_table.add_column("Value")
    expected_table.add_row("doc_types", str(expected_doc_types))
    expected_table.add_row("services", str(expected_services))
    console.print(expected_table)

    route_table = Table(title="Actual LLM Route")
    route_table.add_column("Field")
    route_table.add_column("Value")
    route_table.add_row("intent", str(route.get("intent")))
    route_table.add_row("doc_type", str(route.get("doc_type")))
    route_table.add_row("service", str(route.get("service")))
    route_table.add_row("confidence", str(route.get("confidence")))
    route_table.add_row("chosen_filter", str(chosen_filter))
    route_table.add_row("final_filter", str(response.get("final_filter")))
    console.print(route_table)

    checks_table = Table(title="Checks")
    checks_table.add_column("Metric")
    checks_table.add_column("Value")
    checks_table.add_row("route_doc_type_ok", str(route_checks["route_doc_type_ok"]))
    checks_table.add_row("retrieval_doc_type_hit@k", str(retrieval_checks["retrieval_doc_type_hit"]))
    checks_table.add_row("retrieval_service_hit@k", str(retrieval_checks["retrieval_service_hit"]))
    checks_table.add_row("retrieval_route_hit@k", str(retrieval_checks["retrieval_route_hit"]))
    console.print(checks_table)

    res_table = Table(title="Top Results")
    res_table.add_column("Rank")
    res_table.add_column("Final Score")
    res_table.add_column("Service")
    res_table.add_column("Doc Type")
    res_table.add_column("Title")
    res_table.add_column("Preview")

    for i, r in enumerate(results, 1):
        res_table.add_row(
            str(i),
            str(r.get("final_score", "")),
            str(r.get("service", "")),
            str(r.get("doc_type", "")),
            str(r.get("title", "")),
            summarize(r),
        )

    console.print(res_table)


def run_eval(
    db_path: str,
    eval_path: str,
    faiss_index_path: str,
    faiss_meta_path: str,
    top_k: int,
    batches: Optional[List[int]] = None,
    batch_size: int = 10,
) -> None:
    conn = init_db(db_path)
    index = load_faiss_index(faiss_index_path)
    faiss_meta = load_faiss_meta(faiss_meta_path)

    all_queries = load_eval_queries(eval_path)
    queries = filter_queries_by_batches(
        queries=all_queries,
        batches=batches,
        batch_size=batch_size,
    )
    total = len(queries)

    console.print(
        f"[bold cyan]Running eval[/bold cyan]: "
        f"{total}/{len(all_queries)} queries "
        f"| batch_size={batch_size} "
        f"| batches={batches if batches else 'all'}"
    )

    route_doc_type_hits = 0
    retrieval_doc_type_hits = 0
    retrieval_service_hits = 0
    retrieval_route_hits = 0

    try:
        for q in queries:
            expected_doc_types = normalize_expected_doc_types(
                get_expected_list(q, "doc_types", "expected_doc_type")
            )

            expected_services = normalize_expected_services(
                get_expected_list(q, "services", "expected_service")
            )

            response = handle_request(
                request={
                    "query": q["query"],
                    "top_k": top_k,
                },
                conn=conn,
                index=index,
                faiss_meta=faiss_meta,
            )

            if "error" in response:
                console.print(f"[red]Error for {q.get('id')}:[/red] {response['error']}")
                continue

            route_checks = evaluate_route_doc_type(
                route=response.get("route", {}),
                expected_doc_types=expected_doc_types,
            )

            retrieval_checks = evaluate_retrieval(
                results=response.get("results", []),
                expected_doc_types=expected_doc_types,
                expected_services=expected_services,
            )

            if route_checks["route_doc_type_ok"]:
                route_doc_type_hits += 1

            if retrieval_checks["retrieval_doc_type_hit"]:
                retrieval_doc_type_hits += 1

            if retrieval_checks["retrieval_service_hit"]:
                retrieval_service_hits += 1

            if retrieval_checks["retrieval_route_hit"]:
                retrieval_route_hits += 1

            print_result(
                q=q,
                response=response,
                route_checks=route_checks,
                retrieval_checks=retrieval_checks,
                expected_doc_types=expected_doc_types,
                expected_services=expected_services,
            )

        summary = Table(title="Pipeline Evaluation Summary")
        summary.add_column("Metric")
        summary.add_column("Value")

        summary.add_row("total_queries", str(total))
        summary.add_row("route_doc_type_accuracy", f"{route_doc_type_hits}/{total}")
        summary.add_row("retrieval_doc_type_hit@k", f"{retrieval_doc_type_hits}/{total}")
        summary.add_row("retrieval_service_hit@k", f"{retrieval_service_hits}/{total}")
        summary.add_row("retrieval_route_hit@k", f"{retrieval_route_hits}/{total}")

        console.print(summary)

    finally:
        conn.close()


def main() -> None:
    parser = argparse.ArgumentParser()

    parser.add_argument("--db-path", default=DEFAULT_DB_PATH)
    parser.add_argument("--eval-path", default=DEFAULT_EVAL_PATH)
    parser.add_argument("--faiss-index-path", default=DEFAULT_FAISS_INDEX_PATH)
    parser.add_argument("--faiss-meta-path", default=DEFAULT_FAISS_META_PATH)
    parser.add_argument("--top-k", type=int, default=5)
    parser.add_argument(
    "--batches",
    default=None,
    help="Comma-separated batch numbers or ranges. Example: 1,2,3 or 1-3",
    )

    parser.add_argument(
        "--batch-size",
        type=int,
        default=10,
        help="Number of eval queries per batch",
    )

    args = parser.parse_args()

    run_eval(
        db_path=args.db_path,
        eval_path=args.eval_path,
        faiss_index_path=args.faiss_index_path,
        faiss_meta_path=args.faiss_meta_path,
        top_k=args.top_k,
        batches=parse_batches(args.batches),
        batch_size=args.batch_size,
    )


if __name__ == "__main__":
    main()