# SEO Retrieval Service 

## Overview

This project provides a local semantic retrieval engine powered by:

- FAISS (vector search)
- Ollama embeddings (`nomic-embed-text`)
- Structured chunk metadata

It is designed to serve as the retrieval layer for the QuestBud multi-agent system, enabling fast and accurate semantic search over agency knowledge (services, pricing policies, SEO documentation, etc.).

---

## Architecture

User Query  
→ Embed (Ollama)  
→ FAISS Search  
→ Top-K Chunks  
→ JSON Output  

This project is intentionally stateless and can be called from external systems (e.g., Node.js agents).

---

## Features

- Semantic search using FAISS  
- Local embeddings via Ollama (no external API required)  
- Structured metadata retrieval  
- JSON-based stdin/stdout interface for cross-language integration  
- Designed for multi-agent orchestration  

---

## Project Structure

```
project-root/
│
├── retrieval/
│   ├── __init__.py
│   ├── config.py
│   ├── embedder.py
│   ├── loader.py
│   └── search_core.py
│
├── storage/
│   ├── faiss.index
│   └── chunk_metadata.pkl
│
├── retrieval_stdin.py
├── requirements.txt
└── README.md
```

---

## Requirements

- Python 3.9+
- Ollama running locally

Install dependencies:

```
pip install -r requirements.txt
```

### requirements.txt

```
requests
numpy
faiss-cpu
```

---

## Setup

### 1. Start Ollama

```
ollama serve
```

Ensure the embedding model is available:

```
ollama pull nomic-embed-text
```

---

### 2. Verify storage files

Make sure the following exist:

- storage/faiss.index  
- storage/chunk_metadata.pkl  

---

## Usage

### Option 1: CLI (manual testing)

```
python retrieval_stdin.py < test_input.json
```

Example `test_input.json`:

```json
{
  "query": "local seo services",
  "k": 5,
  "category": null
}
```

---

### Option 2: Direct Python usage

```python
from retrieval.search_core import search

results = search("local seo services", k=5)

for r in results:
    print(r["title"], r["score"])
```

---

### Option 3: Node.js integration (stdin bridge)

Input (stdin):

```json
{
  "query": "local seo services",
  "k": 5,
  "category": null
}
```

Output (stdout):

```json
{
  "ok": true,
  "results": [
    {
      "score": 0.83,
      "chunk_id": "...",
      "doc_id": "...",
      "category": "services",
      "title": "...",
      "section_title": "...",
      "filepath": "...",
      "text": "..."
    }
  ]
}
```

---

## Core Components

### embedder.py
- Calls Ollama embedding API  
- Converts text → vector  

### loader.py
- Loads FAISS index  
- Loads metadata (pickle)  

### search_core.py
- Performs semantic search  
- Returns top-k chunks  

### retrieval_stdin.py
- Bridge for external systems  
- Reads JSON from stdin  
- Outputs JSON to stdout  

---

## Important Design Notes

### 1. No caching (by design)

Each call:
- Loads index  
- Computes embedding  
- Runs search  

This keeps the system simple and stateless.

---

### 2. UTF-8 / JSON safety

- Output uses `ensure_ascii=True`  
- Prevents encoding issues (especially on Windows)  
- Ensures compatibility with Node.js  

---

### 3. stdout vs stderr

- stdout → JSON only  
- stderr → debug logs  

Never print debug logs to stdout.

---

## Performance Notes

Current design (spawn-based):

- Python process starts per query  
- FAISS index loaded per call  

Typical latency:
- ~200ms to 1s per query (depends on index size and embedding speed)

---

## Future Improvements

- Convert to FastAPI service (persistent process)  
- Add embedding cache  
- Add reranking layer  
- Introduce hybrid retrieval (BM25 + FAISS)  
- Add category-aware filtering  

---

## Troubleshooting

### Import errors

```
pip install -r requirements.txt
```

---

### Ollama connection issues

```
ollama serve
```

---

### FAISS index not found

Check paths in:

```
retrieval/config.py
```

---

### JSON parsing issues (Node)

Ensure:
- No print() to stdout  
- Only JSON is written to stdout  

---

## Author

Surya Muntha