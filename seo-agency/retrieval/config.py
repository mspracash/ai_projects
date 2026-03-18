from pathlib import Path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = PROJECT_ROOT/"data"/"agency_corpus"
STORAGE_DIR = PROJECT_ROOT/"storage"
STORAGE_DIR.mkdir(exist_ok=True)
DUCKDB_PATH= STORAGE_DIR/"agency.duckdb"
CHUNKS_PATH = STORAGE_DIR / "chunks.jsonl"
FAISS_PATH = STORAGE_DIR/"faiss.index"
META_PATH = STORAGE_DIR/"chunk_metadata.pkl"
OLLAMA_URL = "http://localhost:11434/api/embeddings"
EMBED_MODEL = "nomic-embed-text"

