from typing import Dict, List, Any

from app import run_pipeline
from models import QueryCase, TEST_CASES


def precision_at_k(expected: List[str], actual: List[str], k: int) -> float:
    actual_k = actual[:k]
    if not actual_k:
        return 0.0
    hits = sum(1 for doc_id in actual_k if doc_id in expected)
    return hits / len(actual_k)


def recall_at_k(expected: List[str], actual: List[str], k: int) -> float:
    if not expected:
        return 0.0
    actual_k = actual[:k]
    hits = sum(1 for doc_id in expected if doc_id in actual_k)
    return hits / len(expected)


def reciprocal_rank(expected: List[str], actual: List[str]) -> float:
    for idx, doc_id in enumerate(actual, start=1):
        if doc_id in expected:
            return 1.0 / idx
    return 0.0


def routing_accuracy(expected_route: str, actual_route: str) -> float:
    return 1.0 if expected_route == actual_route else 0.0


def keyword_coverage(required_phrases: List[str], response: str) -> float:
    if not required_phrases:
        return 1.0
    response_l = response.lower()
    hits = sum(1 for phrase in required_phrases if phrase.lower() in response_l)
    return hits / len(required_phrases)


def forbidden_phrase_rate(forbidden_phrases: List[str], response: str) -> float:
    if not forbidden_phrases:
        return 0.0
    response_l = response.lower()
    hits = sum(1 for phrase in forbidden_phrases if phrase.lower() in response_l)
    return hits / len(forbidden_phrases)


def policy_compliance_score(forbidden_phrases: List[str], response: str) -> float:
    violation_rate = forbidden_phrase_rate(forbidden_phrases, response)
    return 1.0 - violation_rate


def response_score(required_phrases: List[str], forbidden_phrases: List[str], response: str) -> float:
    coverage = keyword_coverage(required_phrases, response)
    compliance = policy_compliance_score(forbidden_phrases, response)
    return 0.7 * coverage + 0.3 * compliance


def trace_completeness_score(trace: Dict[str, Any]) -> float:
    required_stages = {"routing", "retrieval", "response_generation"}
    actual_stages = {event["stage"] for event in trace.get("events", [])}
    return len(required_stages.intersection(actual_stages)) / len(required_stages)


def explanation_completeness_score(result: Dict[str, Any]) -> float:
    checks = [
        bool(result.get("route_explanation", {}).get("reason")),
        bool(result.get("retrieval_explanation", {}).get("top_documents")),
        bool(result.get("response_explanation", {}).get("applied_rules")),
    ]
    return sum(1 for check in checks if check) / len(checks)


def evaluate_case(case: QueryCase) -> Dict[str, Any]:
    result = run_pipeline(case.query, top_k=2)

    actual_docs = result["retrieved_doc_ids"]
    actual_route = result["route"]
    response = result["response"]

    metrics = {
        "case_id": case.case_id,
        "query": case.query,
        "expected_route": case.expected_route,
        "actual_route": actual_route,
        "retrieved_doc_ids": actual_docs,
        "response": response,
        "retrieval_precision_at_2": precision_at_k(case.expected_doc_ids, actual_docs, 2),
        "retrieval_recall_at_2": recall_at_k(case.expected_doc_ids, actual_docs, 2),
        "retrieval_mrr": reciprocal_rank(case.expected_doc_ids, actual_docs),
        "routing_accuracy": routing_accuracy(case.expected_route, actual_route),
        "response_keyword_coverage": keyword_coverage(case.reference_answer_must_include, response),
        "response_policy_compliance": policy_compliance_score(case.forbidden_answer_phrases, response),
        "response_overall_score": response_score(
            case.reference_answer_must_include,
            case.forbidden_answer_phrases,
            response,
        ),
        "trace_completeness_score": trace_completeness_score(result["trace"]),
        "explanation_completeness_score": explanation_completeness_score(result),
        "trace": result["trace"],
        "route_explanation": result["route_explanation"],
        "retrieval_explanation": result["retrieval_explanation"],
        "response_explanation": result["response_explanation"],
    }

    return metrics


def evaluate_all() -> Dict[str, Any]:
    results = [evaluate_case(case) for case in TEST_CASES]

    if not results:
        return {"results": [], "summary": {}}

    summary = {
        "avg_precision_at_2": sum(r["retrieval_precision_at_2"] for r in results) / len(results),
        "avg_recall_at_2": sum(r["retrieval_recall_at_2"] for r in results) / len(results),
        "avg_mrr": sum(r["retrieval_mrr"] for r in results) / len(results),
        "avg_routing_accuracy": sum(r["routing_accuracy"] for r in results) / len(results),
        "avg_response_keyword_coverage": sum(r["response_keyword_coverage"] for r in results) / len(results),
        "avg_response_policy_compliance": sum(r["response_policy_compliance"] for r in results) / len(results),
        "avg_response_overall_score": sum(r["response_overall_score"] for r in results) / len(results),
        "avg_trace_completeness_score": sum(r["trace_completeness_score"] for r in results) / len(results),
        "avg_explanation_completeness_score": sum(r["explanation_completeness_score"] for r in results) / len(results),
    }

    return {"results": results, "summary": summary}