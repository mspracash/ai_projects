import numpy as np
import faiss
from retrieval.embedder import embed
from retrieval.loader import load_all
from retrieval.bm25_store import build_bm25, score_bm25
import json

class HybridRetriever:
    def __init__(self):
        self.index , self.metadata = load_all()
        self.bm25 = build_bm25(self.metadata)

    @staticmethod
    def minmax_normalize(scores):
        scores = np.array(scores, dtype="float32")
        if len(scores) == 0:
            return scores
        min_score = scores.min()
        max_score = scores.max()

        if max_score - min_score < 1e-8:
            return np.zeros_like(scores)
        
        return (scores - min_score)/(max_score - min_score)
    
    def search(self, query: str, k: int = 10, category: str | None = None, beta = 0.01):
        query = query.strip()
        if not query:
            return []

        vec = embed(query)
        query_vector = np.array([vec], dtype="float32")
        faiss.normalize_L2(query_vector)

        faiss_k = min(len(self.metadata), max(k * 5, 30))
        faiss_scores, faiss_indices = self.index.search(query_vector, faiss_k)

        bm25_scores_all = score_bm25(self.bm25, query)

        filtered_candidates = []
        candidate_faiss_scores = []

        for score, idx in zip(faiss_scores[0], faiss_indices[0]):
            if idx == -1:
                continue

            chunk = self.metadata[idx]
            if category and chunk["category"] != category:
                continue

            filtered_candidates.append(idx)
            candidate_faiss_scores.append(float(score))

        if not filtered_candidates:
            return []

        candidate_bm25_scores = [bm25_scores_all[idx] for idx in filtered_candidates]

        norm_faiss = self.minmax_normalize(candidate_faiss_scores)
        norm_bm25 = self.minmax_normalize(candidate_bm25_scores)

        results = []
        for i, idx in enumerate(filtered_candidates):
            chunk = self.metadata[idx]
            hybrid_score = norm_faiss[i] + beta * norm_bm25[i]

            results.append({
                "score": float(hybrid_score),
                "faiss_score": float(candidate_faiss_scores[i]),
                "bm25_score": float(candidate_bm25_scores[i]),
                "doc_id": chunk["doc_id"],
                "category": chunk["category"],
                "title": chunk["title"],
                "section": chunk["section_title"],
                "text": chunk["text"]
            })

        results.sort(key=lambda x: x["score"], reverse=True)
        return results[:k]
    
    
if __name__ == "__main__":
    query = input("Query: ").strip()
    results = HybridRetriever().search(query=query, k=10, category=None)
    print(json.dumps(results, indent=2, ensure_ascii=False))
        