import faiss
import numpy as np

# 10 vectors of dimension 16
vectors = np.random.rand(10,16).astype("float32")

index = faiss.IndexFlatL2(16)
index.add(vectors)

query = np.random.rand(1,16).astype("float32")

distances, ids = index.search(query, k=3)

print(ids)