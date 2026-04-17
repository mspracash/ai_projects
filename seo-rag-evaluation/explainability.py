from typing import Dict, List


def explain_route(query: str, route: str, matched_terms: List[str]) -> Dict[str, object]:
    return {
        "route": route,
        "reason": (
            f"Selected route '{route}' because the query matched route-indicative terms: "
            f"{matched_terms}" if matched_terms else
            f"Selected default route '{route}' because no negotiation-specific terms were found."
        ),
        "matched_terms": matched_terms,
    }


def explain_retrieval(query: str, scored_docs: List[Dict[str, object]]) -> Dict[str, object]:
    top_reasons = []
    for item in scored_docs:
        top_reasons.append(
            {
                "doc_id": item["doc_id"],
                "score": item["score"],
                "why": (
                    f"Matched terms {item['matched_terms']} with tag bonus {item['tag_bonus']}"
                ),
            }
        )
    return {
        "query": query,
        "top_documents": top_reasons,
    }


def explain_response(route: str, used_doc_ids: List[str], applied_rules: List[str]) -> Dict[str, object]:
    return {
        "route": route,
        "used_doc_ids": used_doc_ids,
        "applied_rules": applied_rules,
        "reason": (
            f"Generated response using route '{route}', grounded in documents {used_doc_ids}, "
            f"with applied business/policy rules: {applied_rules}"
        ),
    }