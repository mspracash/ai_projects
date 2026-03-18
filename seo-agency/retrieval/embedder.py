import requests
from retrieval.config import OLLAMA_URL, EMBED_MODEL

def embed(text:str)->list[float]:
    response = requests.post(OLLAMA_URL, json={"model": EMBED_MODEL, "prompt":"text"}, timeout=60 )
    data = response.json()

    if "embedding" in data:
        return data["embedding"]
    
    if "embeddings" in data:
        return data["embeddings"][0]
    
    raise ValueError(f"Unexpected Ollama response: {data}")
