import json
import re
import duckdb
from retrieval.config import DUCKDB_PATH, STORAGE_DIR, CHUNKS_PATH

HEADING_RE = re.compile(r"^(#{1,3})\s+(.*)$", re.MULTILINE)

def strip_front_matter(text:str) ->str:
    if text.startswith("---"):
        parts = text.split("---", 2)
        if len(parts) >= 3:
            return parts[2].strip()
    return text

def split_markdown_sections(text:str):
    text = strip_front_matter(text)

    matches = list(HEADING_RE.finditer(text))
    if not matches:
        return [("Document", text.strip())] if text.strip() else []
    
    sections = []

    for i, match in enumerate(matches):
        heading = match.group(2).strip()
        start = match.end()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
        body = text[start:end].strip()

        if body:
            sections.append((heading, body))

    return sections

def chunk_corpus():
    con = duckdb.connect(str(DUCKDB_PATH))

    rows = con.execute("""
                SELECT doc_id, category, title, filepath, content
                       FROM documents
                       ORDER BY filepath
    """).fetchall()

    chunk_count = 0

    with CHUNKS_PATH.open("w", encoding="utf-8") as f:
        for doc_id, category, title, filepath, content in rows:
            sections = split_markdown_sections(content)

            for idx, (section_title, section_text) in enumerate(sections, start=1):
                chunk = {
                    "chunk_id": f"{doc_id}::chunk_{idx:03d}",
                    "doc_id": doc_id,
                    "category": category,
                    "title": title,
                    "filepath": filepath,
                    "section_title": section_title,
                    "text": section_text
                }
                f.write(json.dumps(chunk,ensure_ascii=False) + "\n")
                chunk_count+=1

    con.close()

    print("Chunking complete.")
    print("Chunks written:", chunk_count)
    print("Ouput:", CHUNKS_PATH)

if __name__ == "__main__":
    chunk_corpus()