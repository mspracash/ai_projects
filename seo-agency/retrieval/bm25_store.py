from rank_bm25 import BM25Okapi

def tokenize(text: str)-> list[str]:
    return text.lower().split()

def build_bm25(metadata: list[dict]) -> BM25Okapi:
    corpus_tokens = [tokenize(chunk["text"]) for chunk in metadata]
    return BM25Okapi(corpus_tokens)

def score_bm25(bm25: BM25Okapi, query:str):
    query_tokens = tokenize(query)
    return bm25.get_scores(query_tokens)