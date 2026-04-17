from typing import Literal, Dict, Any, List

from explainability import explain_route


Route = Literal["knowledge", "negotiation"]


def route_query(query: str) -> Dict[str, Any]:
    q = query.lower()

    negotiation_terms = [
        "discount",
        "price",
        "pricing",
        "cost",
        "contract",
        "retainer",
        "deal",
        "offer",
        "budget",
    ]

    matched_terms: List[str] = [term for term in negotiation_terms if term in q]

    route: Route = "negotiation" if matched_terms else "knowledge"

    return {
        "route": route,
        "explanation": explain_route(query, route, matched_terms),
    }