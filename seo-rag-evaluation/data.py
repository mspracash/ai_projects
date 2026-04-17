from dataclasses import dataclass
from typing import List


@dataclass
class Document:
    doc_id: str
    text: str
    tags: List[str]


DOCUMENTS = [
    Document(
        doc_id="discount_policy",
        text=(
            "Discount policy: Standard SEO packages are not discounted by default. "
            "For long-term contracts of 12 months or more, a discount up to 10 percent "
            "may be offered with approval. Discounts above 10 percent are not allowed."
        ),
        tags=["negotiation", "pricing", "policy"],
    ),
    Document(
        doc_id="pricing_retainer",
        text=(
            "Pricing guide: Monthly SEO retainer starts at 2000 dollars. "
            "Advanced package starts at 3500 dollars. Enterprise package starts at 5000 dollars."
        ),
        tags=["pricing", "services"],
    ),
    Document(
        doc_id="technical_seo_service",
        text=(
            "Technical SEO service includes site audit, crawl diagnostics, page speed review, "
            "indexing analysis, and structured data recommendations."
        ),
        tags=["service", "technical_seo"],
    ),
    Document(
        doc_id="content_strategy_service",
        text=(
            "Content strategy service includes keyword research, content briefs, topical clustering, "
            "and editorial planning."
        ),
        tags=["service", "content"],
    ),
    Document(
        doc_id="general_seo_faq",
        text=(
            "SEO usually takes 3 to 6 months to show meaningful results depending on competition, "
            "site health, and content quality."
        ),
        tags=["knowledge", "faq"],
    ),
]