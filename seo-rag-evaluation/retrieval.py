import math
import re
from collections import Counter
from typing import List, Tuple, Dict, Any

from data import DOCUMENTS, Document
from explainability import explain_retrieval


def tokenize(text: str) -> List[str]:
    return re.findall(r"[a-zA-Z0-9]+", text.lower())


def score_doc_details(query: str, doc: Document) -> Dict[str, Any]:
    q_tokens = tokenize(query)
    d_tokens = tokenize(doc.text)

    q_counts = Counter(q_tokens)
    d_counts = Counter(d_tokens)

    overlap = 0.0
    matched_terms = []
    for token, q_count in q_counts.items():
        d_count = d_counts.get(token, 0)
        if d_count > 0:
            matched_terms.append(token)
            overlap += min(q_count, d_count)

    tag_bonus = 0.0
    for token in q_tokens:
        if token in doc.tags:
            tag_bonus += 0.5

    length_penalty = math.log(len(d_tokens) + 5)
    score = (overlap + tag_bonus) / length_penalty

    return {
        "doc": doc,
        "doc_id": doc.doc_id,
        "score": round(score, 4),
        "matched_terms": matched_terms,
        "tag_bonus": round(tag_bonus, 4),
    }


def retrieve(query: str, top_k: int = 2) -> Dict[str, Any]:
    scored = [score_doc_details(query, doc) for doc in DOCUMENTS]
    scored.sort(key=lambda x: x["score"], reverse=True)

    top_scored = scored[:top_k]

    return {
        "documents": [item["doc"] for item in top_scored],
        "retrieved_doc_ids": [item["doc_id"] for item in top_scored],
        "scored_docs": top_scored,
        "explanation": explain_retrieval(query, top_scored),
    }