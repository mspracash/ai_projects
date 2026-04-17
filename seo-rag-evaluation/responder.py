from typing import List, Dict, Any

from data import Document
from explainability import explain_response


def build_response(query: str, route: str, retrieved_docs: List[Document]) -> Dict[str, Any]:
    query_l = query.lower()
    joined_context = " ".join(doc.text for doc in retrieved_docs).lower()
    used_doc_ids = [doc.doc_id for doc in retrieved_docs]
    applied_rules: List[str] = []

    if route == "negotiation":
        parts = []

        if "12 months or more" in joined_context:
            parts.append(
                "For long-term SEO contracts of 12 months or more, we may offer up to 10 percent discount with approval."
            )
            applied_rules.append("long_term_contract_discount_rule")
        else:
            parts.append("Discounts are not typically offered by default.")
            applied_rules.append("default_no_discount_rule")

        if "starts at 2000 dollars" in joined_context:
            parts.append("Our monthly SEO retainer starts at 2000 dollars.")
            applied_rules.append("pricing_anchor_rule")

        parts.append("Discounts above 10 percent are not allowed by policy.")
        applied_rules.append("max_discount_policy_rule")

        response_text = " ".join(parts)

        return {
            "response": response_text,
            "applied_rules": applied_rules,
            "explanation": explain_response(route, used_doc_ids, applied_rules),
        }

    if "technical seo" in query_l:
        applied_rules.append("technical_seo_template_rule")
        response_text = (
            "Technical SEO includes site audit, crawl diagnostics, page speed review, "
            "indexing analysis, and structured data recommendations."
        )
        return {
            "response": response_text,
            "applied_rules": applied_rules,
            "explanation": explain_response(route, used_doc_ids, applied_rules),
        }

    if "how long" in query_l or "seo usually take" in query_l:
        applied_rules.append("seo_timeline_template_rule")
        response_text = (
            "SEO usually takes 3 to 6 months to show meaningful results, depending on competition, "
            "site health, and content quality."
        )
        return {
            "response": response_text,
            "applied_rules": applied_rules,
            "explanation": explain_response(route, used_doc_ids, applied_rules),
        }

    if retrieved_docs:
        applied_rules.append("grounded_fallback_rule")
        response_text = retrieved_docs[0].text
        return {
            "response": response_text,
            "applied_rules": applied_rules,
            "explanation": explain_response(route, used_doc_ids, applied_rules),
        }

    applied_rules.append("insufficient_context_rule")
    response_text = "I do not have enough information to answer that."
    return {
        "response": response_text,
        "applied_rules": applied_rules,
        "explanation": explain_response(route, used_doc_ids, applied_rules),
    }