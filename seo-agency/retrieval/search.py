import json
import pickle
import requests
import faiss
import numpy as np

from retrieval.config import STORAGE_DIR, FAISS_PATH, META_PATH, EMBED_MODEL, OLLAMA_URL

def embed(text:str):
    response = requests.post(OLLAMA_URL, json={"model": EMBED_MODEL, "prompt": text})
    response.raise_for_status()
    data = response.json()
    return data["embedding"]

def load_index():
    index = faiss.read_index(str(FAISS_PATH))
    with open(META_PATH, "rb") as f:
        metadata = pickle.load(f)
    
    return index, metadata

def search(query: str, k:int =5):
    index, metadata = load_index()
    query_vector = np.array([embed(query)], dtype="float32")
    faiss.normalize_L2(query_vector)
    scores, indices = index.search(query_vector, k)
    results = []

    for score, idx in zip(scores[0], indices[0]):
        if idx == -1:
            continue

        chunk = metadata[idx]

        results.append({
            "score": float(score),
            "chunk_id": chunk["chunk_id"],
            "doc_id": chunk["doc_id"],
            "category": chunk["category"],
            "title": chunk["title"],
            "section_title": chunk["section_title"],
            "filepath": chunk["filepath"],
            "text": chunk["text"]
        })

    return results
    
if __name__ == "__main__":
    query = input("Query: ").strip()
    results = search(query, k=5)
    print(json.dumps(results, indent=2, ensure_ascii=False))
