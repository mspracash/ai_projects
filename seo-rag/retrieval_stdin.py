import json
import math
import pickle
import re
import sys
from collections import Counter
from pathlib import Path
from typing import Any, Dict, List, Optional, Sequence, Tuple

import duckdb
import faiss
import numpy as np
import requests

from observability import new_trace, log_event, StageTimer
from query_classifier import classify_query_with_llm


DB_PATH = "./data/rag.duckdb"
FAISS_INDEX_PATH = "./data/faiss.index"
FAISS_META_PATH = "./data/faiss_meta.pkl"

EMBED_MODEL_NAME = "all-minilm"
OLLAMA_EMBED_URL = "http://localhost:11434/api/embed"

FAISS_SEARCH_K = 200
FILTERED_CANDIDATE_TARGET = 100
FINAL_TOP_K = 5

BM25_K1 = 1.5
BM25_B = 0.75
FAISS_WEIGHT = 0.35
BM25_WEIGHT = 0.65

# Retrieval-based service inference.
# Used when the LLM route has service=None.
SERVICE_INFERENCE_MIN_SCORE = 0.45
SERVICE_INFERENCE_MIN_COUNT = 1
SERVICE_INFERENCE_TOP_N = 10

VALID_DOC_TYPES = {"overview", "service", "concern", "pricing"}
VALID_SERVICES = {
    "technical_seo_audit",
    "on_page_seo_optimization",
    "content_strategy_seo",
    "local_seo",
    "link_building",
    "ecommerce_seo",
    "seo_retainer",
    "seo_migration",
    "seo_analytics_reporting",
    "general",
}

NON_INFERABLE_SERVICES = {
    "service_overview",
    "overview",
    "general",
    "unknown",
    "",
    None,
}

TOKEN_RE = re.compile(r"[a-z0-9]+")


def normalize_text(text: str) -> str:
    return (
        str(text)
        .replace("\u2019", "'")
        .replace("\u2018", "'")
        .replace("\u201c", '"')
        .replace("\u201d", '"')
        .replace("\u2013", "-")
        .replace("\u2014", "-")
        .replace("\u00a0", " ")
        .strip()
    )


def tokenize(text: str) -> List[str]:
    return TOKEN_RE.findall(normalize_text(text).lower())


def l2_normalize(vecs: np.ndarray) -> np.ndarray:
    norms = np.linalg.norm(vecs, axis=1, keepdims=True)
    norms = np.clip(norms, 1e-12, None)
    return vecs / norms


def clean_service_value(service: Any) -> Optional[str]:
    if service is None:
        return None

    service_str = normalize_text(str(service))

    # Some older corpus rows may have visually truncated values in console output,
    # but the DB value is usually complete. Keep this guard for safety.
    if service_str == "service_overview" or service_str.startswith("service_overview"):
        return None

    if service_str not in VALID_SERVICES:
        return None

    return service_str


def clean_route(route: Dict[str, Any]) -> Dict[str, Any]:
    doc_type = route.get("doc_type")
    service = route.get("service")

    if doc_type not in VALID_DOC_TYPES:
        doc_type = None

    service = clean_service_value(service)

    return {
        "doc_type": doc_type,
        "service": service,
    }


def build_semantic_text(chunk: Dict[str, Any]) -> str:
    return normalize_text(
        " ".join(
            [
                str(chunk.get("title") or ""),
                str(chunk.get("description") or ""),
                str(chunk.get("text") or ""),
            ]
        )
    )


def build_bm25_text(chunk: Dict[str, Any]) -> str:
    return normalize_text(
        " ".join(
            [
                str(chunk.get("title") or ""),
                str(chunk.get("description") or ""),
                str(chunk.get("keywords") or ""),
                str(chunk.get("text") or ""),
            ]
        )
    )


class BM25Scorer:
    def __init__(self, documents: Sequence[str], k1: float = BM25_K1, b: float = BM25_B):
        self.k1 = k1
        self.b = b
        self.docs_tokens = [tokenize(doc) for doc in documents]
        self.doc_lens = [len(toks) for toks in self.docs_tokens]
        self.avgdl = sum(self.doc_lens) / max(len(self.doc_lens), 1)

        self.doc_freqs: List[Dict[str, int]] = []
        self.df: Dict[str, int] = {}

        for toks in self.docs_tokens:
            freqs: Dict[str, int] = {}

            for token in toks:
                freqs[token] = freqs.get(token, 0) + 1

            self.doc_freqs.append(freqs)

            for token in freqs:
                self.df[token] = self.df.get(token, 0) + 1

        self.N = len(self.docs_tokens)

    def idf(self, term: str) -> float:
        df = self.df.get(term, 0)
        return math.log(1 + (self.N - df + 0.5) / (df + 0.5))

    def score(self, query: str) -> List[float]:
        q_terms = tokenize(query)
        scores: List[float] = []

        for idx, freqs in enumerate(self.doc_freqs):
            dl = self.doc_lens[idx]
            score = 0.0

            for term in q_terms:
                f = freqs.get(term, 0)
                if f == 0:
                    continue

                numerator = f * (self.k1 + 1)
                denominator = f + self.k1 * (
                    1 - self.b + self.b * dl / max(self.avgdl, 1e-9)
                )

                score += self.idf(term) * (numerator / denominator)

            scores.append(score)

        return scores


def init_db(db_path: str) -> duckdb.DuckDBPyConnection:
    return duckdb.connect(db_path)


def load_faiss_index(index_path: str) -> faiss.Index:
    return faiss.read_index(index_path)


def load_faiss_meta(meta_path: str) -> List[Dict[str, Any]]:
    with open(meta_path, "rb") as f:
        return pickle.load(f)


def embed_query(text: str) -> np.ndarray:
    response = requests.post(
        OLLAMA_EMBED_URL,
        json={
            "model": EMBED_MODEL_NAME,
            "input": f"query: {text}",
        },
        timeout=120,
    )
    response.raise_for_status()

    data = response.json()
    emb = data.get("embeddings")

    if not emb:
        raise ValueError("No embedding returned from Ollama")

    if isinstance(emb[0], list):
        arr = np.asarray(emb, dtype=np.float32)
    else:
        arr = np.asarray([emb], dtype=np.float32)

    return l2_normalize(arr)


def build_metadata_filters(route: Dict[str, Any]) -> List[Dict[str, Optional[str]]]:
    route = clean_route(route)

    doc_type = route.get("doc_type")
    service = route.get("service")

    filters: List[Dict[str, Optional[str]]] = []

    if doc_type == "overview":
        filters.append({"doc_type": "overview", "service": None})
        filters.append({"doc_type": "service", "service": None})
        
    elif doc_type:
        if service:
            filters.append({"doc_type": doc_type, "service": service})

        filters.append({"doc_type": doc_type, "service": None})
        filters.append({"doc_type": None, "service": None})
        filters.append({"doc_type": "overview", "service": None})

    else:
        filters.append({"doc_type": None, "service": None})
        filters.append({"doc_type": "overview", "service": None})

    deduped = []
    seen = set()

    for filt in filters:
        key = (filt["doc_type"], filt["service"])
        if key in seen:
            continue
        seen.add(key)
        deduped.append(filt)

    return deduped


def fetch_allowed_chunk_ids(
    conn: duckdb.DuckDBPyConnection,
    doc_type: Optional[str],
    service: Optional[str],
) -> set[str]:
    where_clauses = []
    params: List[Any] = []

    if doc_type:
        where_clauses.append("doc_type = ?")
        params.append(doc_type)

    if service:
        where_clauses.append("service = ?")
        params.append(service)

    sql = "SELECT chunk_id FROM chunks"

    if where_clauses:
        sql += " WHERE " + " AND ".join(where_clauses)

    rows = conn.execute(sql, params).fetchall()
    return {row[0] for row in rows}


def fetch_chunks_by_ids(
    conn: duckdb.DuckDBPyConnection,
    chunk_ids: Sequence[str],
) -> Dict[str, Dict[str, Any]]:
    if not chunk_ids:
        return {}

    placeholders = ", ".join(["?"] * len(chunk_ids))

    sql = f"""
        SELECT
            chunk_id,
            doc_id,
            title,
            description,
            keywords,
            text,
            relative_path,
            service,
            doc_type
        FROM chunks
        WHERE chunk_id IN ({placeholders})
    """

    rows = conn.execute(sql, list(chunk_ids)).fetchall()

    out: Dict[str, Dict[str, Any]] = {}

    for row in rows:
        out[row[0]] = {
            "chunk_id": row[0],
            "doc_id": row[1],
            "title": row[2],
            "description": row[3],
            "keywords": row[4],
            "text": row[5],
            "relative_path": row[6],
            "service": row[7],
            "doc_type": row[8],
        }

    return out


def semantic_search_filtered(
    query: str,
    index: faiss.Index,
    faiss_meta: List[Dict[str, Any]],
    allowed_chunk_ids: set[str],
    candidate_target: int = FILTERED_CANDIDATE_TARGET,
    search_k: int = FAISS_SEARCH_K,
) -> List[Tuple[str, float]]:
    if not allowed_chunk_ids:
        return []

    query_vec = embed_query(query)
    scores, indices = index.search(query_vec, search_k)

    filtered: List[Tuple[str, float]] = []
    seen = set()

    for score, idx in zip(scores[0], indices[0]):
        if idx < 0 or idx >= len(faiss_meta):
            continue

        chunk_id = faiss_meta[idx]["chunk_id"]

        if chunk_id not in allowed_chunk_ids:
            continue

        if chunk_id in seen:
            continue

        seen.add(chunk_id)
        filtered.append((chunk_id, float(score)))

        if len(filtered) >= candidate_target:
            break

    return filtered


def minmax_normalize(values: List[float]) -> List[float]:
    if not values:
        return []

    lo = min(values)
    hi = max(values)

    if abs(hi - lo) < 1e-9:
        return [1.0 for _ in values]

    return [(v - lo) / (hi - lo) for v in values]


def keyword_overlap_boost(query: str, keywords: str) -> float:
    query_terms = set(tokenize(query))
    keyword_terms = set(tokenize(keywords))

    if not query_terms or not keyword_terms:
        return 0.0

    overlap = query_terms.intersection(keyword_terms)

    if not overlap:
        return 0.0

    return min(0.1, 0.02 * len(overlap))


def rerank_candidates(
    query: str,
    candidates: List[Dict[str, Any]],
    faiss_weight: float = FAISS_WEIGHT,
    bm25_weight: float = BM25_WEIGHT,
) -> List[Dict[str, Any]]:
    if not candidates:
        return []

    bm25_documents = [build_bm25_text(c) for c in candidates]
    bm25 = BM25Scorer(bm25_documents)

    bm25_scores = bm25.score(query)
    faiss_scores = [float(c["faiss_score"]) for c in candidates]

    faiss_norm = minmax_normalize(faiss_scores)
    bm25_norm = minmax_normalize(bm25_scores)

    ranked: List[Dict[str, Any]] = []

    for i, candidate in enumerate(candidates):
        item = dict(candidate)

        raw_boost = keyword_overlap_boost(
            query,
            str(candidate.get("keywords") or "")
        )

        # controlled keyword influence
        keyword_signal = min(0.15, raw_boost * 2.0)

        item["bm25_score"] = round(bm25_scores[i], 6)
        item["faiss_score_norm"] = round(faiss_norm[i], 6)
        item["bm25_score_norm"] = round(bm25_norm[i], 6)
        item["keyword_boost"] = round(keyword_signal, 6)

        item["final_score"] = round(
            faiss_weight * faiss_norm[i]
            + bm25_weight * bm25_norm[i]
            + keyword_signal,
            6,
        )

        ranked.append(item)

    ranked.sort(key=lambda x: x["final_score"], reverse=True)
    return ranked


def dedupe_near_duplicates(results: List[Dict[str, Any]], top_k: int) -> List[Dict[str, Any]]:
    out: List[Dict[str, Any]] = []
    seen = set()

    for result in results:
        key = normalize_text(
            f"{result.get('title', '')} {result.get('description', '')}"
        ).lower()

        if key in seen:
            continue

        seen.add(key)
        out.append(result)

        if len(out) >= top_k:
            break

    return out


def infer_service_from_retrieval(
    results: List[Dict[str, Any]],
    min_final_score: float = 0.35,
) -> Optional[str]:

    if not results:
        return None

    # Early dominance check
    top_services = [
        clean_service_value(r.get("service"))
        for r in results[:3]
        if clean_service_value(r.get("service")) not in NON_INFERABLE_SERVICES
    ]

    if top_services and len(set(top_services)) == 1:
        return top_services[0]

    service_scores: Dict[str, float] = {}

    TOP_K_SERVICE = 5

    for rank, r in enumerate(results[:TOP_K_SERVICE], start=1):
        service = clean_service_value(r.get("service"))

        if not service or service in NON_INFERABLE_SERVICES:
            continue

        final_score = float(r.get("final_score", 0.0))
        faiss_score = float(r.get("faiss_score_norm", r.get("faiss_score", 0.0)))
        keyword_boost = float(r.get("keyword_boost", 0.0))

        if final_score < min_final_score:
            continue

        keyword_signal = min(1.0, keyword_boost * 10.0)

        rank_boost = 1.0 / (rank ** 0.5)

        combined_score = (
            0.50 * final_score
            + 0.25 * faiss_score
            + 0.15 * keyword_signal
            + 0.10 * rank_boost
        )

        service_scores[service] = service_scores.get(service, 0.0) + combined_score

    if not service_scores:
        return None

    return max(service_scores.items(), key=lambda item: item[1])[0]

def maybe_apply_retrieval_service_inference(
    route: Dict[str, Any],
    ranked_results: List[Dict[str, Any]],
    trace: str,
) -> Dict[str, Any]:
    cleaned_route = clean_route(route)

    # Do not infer service for pure overview routes.
    if cleaned_route.get("doc_type") == "overview":
        return {
            **cleaned_route,
            "service": None,
            "service_source": "not_applicable",
            "inferred_service": None,
        }

    inferred_service = infer_service_from_retrieval(ranked_results)

    if inferred_service:
        log_event(
            trace,
            "service_inference",
            "completed",
            inferred_service=inferred_service,
            source="retrieval",
        )

        return {
            **cleaned_route,
            "service": inferred_service,
            "service_source": "retrieval",
            "inferred_service": inferred_service,
        }

    return {
        **cleaned_route,
        "service_source": "llm_none",
        "inferred_service": None,
    }

def fetch_allowed_chunk_ids_for_doc_types(conn, doc_types):
    placeholders = ",".join(["?"] * len(doc_types))

    query = f"""
        SELECT chunk_id
        FROM chunks
        WHERE doc_type IN ({placeholders})
    """

    rows = conn.execute(query, doc_types).fetchall()
    return [r[0] for r in rows]

def retrieve(
    query: str,
    conn: duckdb.DuckDBPyConnection,
    index: faiss.Index,
    faiss_meta: List[Dict[str, Any]],
    top_k: int = FINAL_TOP_K,
) -> Dict[str, Any]:
    trace = new_trace("retrieve")

    log_event(trace, "input", "received", query=query, top_k=top_k)

    with StageTimer(trace, "classify_query"):
        route = clean_route(classify_query_with_llm(query))

    filter_attempts = build_metadata_filters(route)

    semantic_hits: List[Tuple[str, float]] = []
    chosen_filter: Optional[Dict[str, Optional[str]]] = None

    for filt in filter_attempts:
        with StageTimer(trace, "fetch_allowed_ids", extra=filt):
            if route.get("doc_type") == "overview" and filt.get("doc_type") == "overview":
                allowed_ids = fetch_allowed_chunk_ids_for_doc_types(
                    conn,
                    ["overview", "service"],
                )
                effective_filter = {
                    "doc_type": "overview+service",
                    "service": None,
                }
            else:
                allowed_ids = fetch_allowed_chunk_ids(
                    conn=conn,
                    doc_type=filt["doc_type"],
                    service=filt["service"],
                )
                effective_filter = filt

        log_event(
            trace,
            "filter_attempt",
            "completed",
            allowed_count=len(allowed_ids),
            **effective_filter,
        )

        if not allowed_ids:
            continue

        with StageTimer(
            trace,
            "semantic_search_filtered",
            extra={"allowed_count": len(allowed_ids)},
        ):
            hits = semantic_search_filtered(
                query=query,
                index=index,
                faiss_meta=faiss_meta,
                allowed_chunk_ids=allowed_ids,
            )

        if hits:
            semantic_hits = hits
            chosen_filter = effective_filter
            break

    if not semantic_hits:
        log_event(trace, "retrieve", "no_results", route=route)

        return {
            "query": query,
            "route": route,
            "chosen_filter": chosen_filter,
            "final_filter": {
                "doc_type": route.get("doc_type"),
                "service": route.get("service"),
            },
            "results": [],
        }

    hit_ids = [chunk_id for chunk_id, _ in semantic_hits]
    chunk_map = fetch_chunks_by_ids(conn, hit_ids)

    candidates: List[Dict[str, Any]] = []

    for chunk_id, faiss_score in semantic_hits:
        chunk = chunk_map.get(chunk_id)

        if not chunk:
            continue

        item = dict(chunk)
        item["faiss_score"] = round(float(faiss_score), 6)
        candidates.append(item)

    ranked = rerank_candidates(query, candidates)

    final_route = maybe_apply_retrieval_service_inference(
        route=route,
        ranked_results=ranked,
        trace=trace,
    )

    final_results = dedupe_near_duplicates(ranked, top_k)

    log_event(
        trace,
        "retrieve",
        "completed",
        route=final_route,
        chosen_filter=chosen_filter,
        candidate_count=len(candidates),
        final_count=len(final_results),
    )

    return {
        "query": query,
        "route": final_route,
        "chosen_filter": chosen_filter,
        "final_filter": {
            "doc_type": final_route.get("doc_type"),
            "service": final_route.get("service"),
        },
        "results": final_results,
    }

def handle_request(
    request: Dict[str, Any],
    conn: duckdb.DuckDBPyConnection,
    index: faiss.Index,
    faiss_meta: List[Dict[str, Any]],
) -> Dict[str, Any]:
    query = request.get("query")
    top_k = int(request.get("top_k", FINAL_TOP_K))

    if not query or not isinstance(query, str):
        return {"error": "Missing or invalid 'query'"}

    return retrieve(
        query=query,
        conn=conn,
        index=index,
        faiss_meta=faiss_meta,
        top_k=top_k,
    )


def main() -> None:
    trace = new_trace("retrieval_stdin_main")

    for path in [DB_PATH, FAISS_INDEX_PATH, FAISS_META_PATH]:
        if not Path(path).exists():
            print(json.dumps({"error": f"Required file not found: {path}"}), flush=True)
            return

    with StageTimer(trace, "startup"):
        conn = init_db(DB_PATH)
        index = load_faiss_index(FAISS_INDEX_PATH)
        faiss_meta = load_faiss_meta(FAISS_META_PATH)

    log_event(trace, "startup", "completed")

    try:
        for line in sys.stdin:
            line = line.strip()

            if not line:
                continue

            try:
                request = json.loads(line)

                response = handle_request(
                    request=request,
                    conn=conn,
                    index=index,
                    faiss_meta=faiss_meta,
                )

            except Exception as exc:
                response = {"error": str(exc)}

            print(json.dumps(response, ensure_ascii=False), flush=True)

    finally:
        conn.close()


if __name__ == "__main__":
    main()
