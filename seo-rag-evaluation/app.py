from typing import Dict, Any

from observability import new_trace, StageTimer
from retrieval import retrieve
from responder import build_response
from router import route_query


def run_pipeline(query: str, top_k: int = 2) -> Dict[str, Any]:
    trace = new_trace(query)

    with StageTimer() as timer:
        routing_result = route_query(query)
    trace.add_event(
        "routing",
        duration_ms=timer.elapsed_ms,
        route=routing_result["route"],
        explanation=routing_result["explanation"],
    )

    with StageTimer() as timer:
        retrieval_result = retrieve(query, top_k=top_k)
    trace.add_event(
        "retrieval",
        duration_ms=timer.elapsed_ms,
        retrieved_doc_ids=retrieval_result["retrieved_doc_ids"],
        scored_docs=retrieval_result["scored_docs"],
        explanation=retrieval_result["explanation"],
    )

    with StageTimer() as timer:
        response_result = build_response(
            query=query,
            route=routing_result["route"],
            retrieved_docs=retrieval_result["documents"],
        )
    trace.add_event(
        "response_generation",
        duration_ms=timer.elapsed_ms,
        response=response_result["response"],
        applied_rules=response_result["applied_rules"],
        explanation=response_result["explanation"],
    )

    return {
        "trace_id": trace.trace_id,
        "query": query,
        "route": routing_result["route"],
        "route_explanation": routing_result["explanation"],
        "retrieved_doc_ids": retrieval_result["retrieved_doc_ids"],
        "retrieval_explanation": retrieval_result["explanation"],
        "response": response_result["response"],
        "response_explanation": response_result["explanation"],
        "applied_rules": response_result["applied_rules"],
        "trace": trace.to_dict(),
    }