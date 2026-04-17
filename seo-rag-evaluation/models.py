from dataclasses import dataclass, field
from typing import List


@dataclass
class QueryCase:
    case_id: str
    query: str
    expected_route: str
    expected_doc_ids: List[str]
    reference_answer_must_include: List[str]
    forbidden_answer_phrases: List[str] = field(default_factory=list)


TEST_CASES = [
    QueryCase(
        case_id="c1",
        query="Do you offer discounts for long-term SEO contracts?",
        expected_route="negotiation",
        expected_doc_ids=["discount_policy", "pricing_retainer"],
        reference_answer_must_include=["12 months", "10 percent"],
        forbidden_answer_phrases=["20 percent", "15 percent"],
    ),
    QueryCase(
        case_id="c2",
        query="What is included in technical SEO?",
        expected_route="knowledge",
        expected_doc_ids=["technical_seo_service"],
        reference_answer_must_include=["site audit", "page speed", "indexing"],
    ),
    QueryCase(
        case_id="c3",
        query="How long does SEO usually take?",
        expected_route="knowledge",
        expected_doc_ids=["general_seo_faq"],
        reference_answer_must_include=["3 to 6 months"],
    ),
]