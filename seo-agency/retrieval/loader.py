import pickle
import faiss

from retrieval.config import FAISS_PATH, META_PATH

def load_faiss_index():
    return faiss.read_index(str(FAISS_PATH))

def load_metadata():
    with open(META_PATH, "rb") as f:
        return pickle.load(f)

def load_all():
    index = load_faiss_index()
    metadata = load_metadata()
    return index, metadata

