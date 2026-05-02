import json
import pickle
from pathlib import Path
from typing import Any, Dict, List

import duckdb
import faiss
import numpy as np
import requests

from observability import new_trace, log_event, StageTimer


DB_PATH = "./data/rag.duckdb"
FAISS_INDEX_PATH = "./data/faiss.index"
FAISS_META_PATH = "./data/faiss_meta.pkl"

EMBED_MODEL_NAME = "all-minilm"
OLLAMA_EMBED_URL = "http://localhost:11434/api/embed"
BATCH_SIZE = 64


def init_db(db_path: str) -> duckdb.DuckDBPyConnection:
    return duckdb.connect(db_path)

def log_service_sample(chunks: List[Dict[str, Any]], service_name: str) -> None:
    matches = [c for c in chunks if c.get("service") == service_name]

    print("")
    print(f"VERIFY SERVICE: {service_name}")
    print(f"Count: {len(matches)}")

    for i, c in enumerate(matches, start=1):
        print(
            f"{i}. "
            f"doc_type={c.get('doc_type')} | "
            f"title={c.get('title')} | "
            f"chunk_id={c.get('chunk_id')}"
        )

    print("")

def load_chunks(conn: duckdb.DuckDBPyConnection) -> List[Dict[str, Any]]:
    rows = conn.execute(
        """
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
        ORDER BY chunk_id
        """
    ).fetchall()

    return [
        {
            "chunk_id": row[0],
            "doc_id": row[1],
            "title": row[2] or "",
            "description": row[3] or "",
            "keywords": row[4] or "",
            "text": row[5] or "",
            "relative_path": row[6] or "",
            "service": row[7] or "",
            "doc_type": row[8] or "",
        }
        for row in rows
    ]


def ensure_parent(path: str) -> None:
    p = Path(path)
    if p.parent and not p.parent.exists():
        p.parent.mkdir(parents=True, exist_ok=True)


def l2_normalize(vecs: np.ndarray) -> np.ndarray:
    norms = np.linalg.norm(vecs, axis=1, keepdims=True)
    norms = np.clip(norms, 1e-12, None)
    return vecs / norms


def build_embed_text(chunk: Dict[str, Any]) -> str:
    return " ".join(
        [
            str(chunk.get("title") or ""),
            str(chunk.get("title") or ""),        # boost title
            str(chunk.get("description") or ""),
            str(chunk.get("keywords") or ""),
            str(chunk.get("text") or "")[:500],   # limit length
        ]
    ).strip()


def embed_batch(texts: List[str]) -> List[List[float]]:
    response = requests.post(
        OLLAMA_EMBED_URL,
        json={
            "model": EMBED_MODEL_NAME,
            "input": texts,
        },
        timeout=300,
    )
    response.raise_for_status()

    data = response.json()
    embeddings = data.get("embeddings")

    if not embeddings:
        raise ValueError("No embeddings returned from Ollama")

    return embeddings


def embed_texts(texts: List[str], batch_size: int = BATCH_SIZE) -> np.ndarray:
    all_embeddings: List[List[float]] = []

    total = len(texts)
    for start in range(0, total, batch_size):
        batch = texts[start : start + batch_size]
        batch_embeddings = embed_batch(batch)

        if len(batch_embeddings) != len(batch):
            raise ValueError(
                f"Embedding count mismatch: got {len(batch_embeddings)} "
                f"for batch of {len(batch)}"
            )

        all_embeddings.extend(batch_embeddings)
        print(f"Embedded {min(start + batch_size, total)}/{total}", flush=True)

    arr = np.asarray(all_embeddings, dtype=np.float32)
    return l2_normalize(arr)


def build_and_save_faiss(embeddings: np.ndarray, index_path: str) -> faiss.Index:
    dim = embeddings.shape[1]
    index = faiss.IndexFlatIP(dim)
    index.add(embeddings)
    faiss.write_index(index, index_path)
    return index


def save_faiss_meta(chunks: List[Dict[str, Any]], meta_path: str) -> None:
    meta = [
        {
            "chunk_id": c["chunk_id"],
            "doc_id": c["doc_id"],
            "title": c["title"],
            "relative_path": c["relative_path"],
            "service": c["service"],
            "doc_type": c["doc_type"],
        }
        for c in chunks
    ]

    with open(meta_path, "wb") as f:
        pickle.dump(meta, f)


def run_build_faiss(
    db_path: str = DB_PATH,
    index_path: str = FAISS_INDEX_PATH,
    meta_path: str = FAISS_META_PATH,
) -> None:
    trace = new_trace("build_faiss")

    ensure_parent(index_path)
    ensure_parent(meta_path)

    conn = None

    try:
        with StageTimer(trace, "connect_db", extra={"db_path": db_path}):
            conn = init_db(db_path)

        with StageTimer(trace, "load_chunks"):
            chunks = load_chunks(conn)
            log_service_sample(chunks, "content_strategy_seo")

        if not chunks:
            raise RuntimeError("No chunks found in DuckDB. Run store first.")

        embed_texts_for_chunks = [build_embed_text(c) for c in chunks]

        if any(not t for t in embed_texts_for_chunks):
            raise RuntimeError("One or more chunks have empty title + description embed text.")

        log_event(
            trace,
            "load_chunks",
            "completed",
            chunk_count=len(chunks),
        )

        print(f"Chunks loaded: {len(chunks)}", flush=True)
        print(f"Sample embed text: {embed_texts_for_chunks[0][:250]}", flush=True)

        with StageTimer(
            trace,
            "embed_chunks",
            extra={
                "chunk_count": len(embed_texts_for_chunks),
                "model_name": EMBED_MODEL_NAME,
                "semantic_fields": "title+title+description+keywords+text[:500]",
            },
        ):
            embeddings = embed_texts(embed_texts_for_chunks)

        with StageTimer(trace, "build_faiss_index", extra={"vector_count": len(chunks)}):
            index = build_and_save_faiss(embeddings, index_path)

        with StageTimer(trace, "save_faiss_meta"):
            save_faiss_meta(chunks, meta_path)

        result = {
            "status": "ok",
            "chunk_count": len(chunks),
            "embedding_dim": int(embeddings.shape[1]),
            "index_path": index_path,
            "meta_path": meta_path,
            "ntotal": int(index.ntotal),
            "model_name": EMBED_MODEL_NAME,
            "semantic_fields": "title+title+description+keywords+text[:500]",
        }

        log_event(trace, "build_faiss", "completed", **result)
        print(json.dumps(result, indent=2), flush=True)

    finally:
        if conn is not None:
            conn.close()


if __name__ == "__main__":
    run_build_faiss()