import json
import pickle
import requests
import faiss
import numpy as np

from retrieval.config import STORAGE_DIR, CHUNKS_PATH, FAISS_PATH, META_PATH, OLLAMA_URL, MODEL

def embed(text):
    response = requests.post(
        OLLAMA_URL,
        json={
            "model": MODEL,
            "prompt": text
        }
    )
    data = response.json()
    return data["embedding"]


def load_chunks():
    chunks = []

    with open(CHUNKS_PATH, "r", encoding="utf-8") as f:
        for line in f:
            chunks.append(json.loads(line))
    
    return chunks

def build_index():
    chunks = load_chunks()

    print("chunks loaded:", len(chunks))

    embeddings = []
    metadata = []

    for chunk in chunks:
        print(chunk["chunk_id"])
        vector = embed(chunk["text"])
        embeddings.append(vector)
        metadata.append(chunk)

    embeddings = np.array(embeddings).astype("float32")
    dim = embeddings.shape[1]

    index = faiss.IndexFlatIP(dim)
    index.add(embeddings)

    faiss.write_index(index, str(FAISS_PATH))

    with open(META_PATH, "wb") as f:
        pickle.dump(metadata, f)

    print("FAISS index built")
    print("vectors: ", len(metadata))


if __name__ == "__main__":
    build_index()
