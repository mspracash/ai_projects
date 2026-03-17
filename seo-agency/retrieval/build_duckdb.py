import json
import duckdb
from pathlib import Path
from retrieval.config import DATA_DIR, DUCKDB_PATH

def build_duckdb():
    print("opening DuckDB:", DUCKDB_PATH)
    con = duckdb.connect(str(DUCKDB_PATH))

    print("creating table...")

    con.execute("""
                CREATE TABLE IF NOT EXISTS documents (
                    doc_id TEXT,
                    category TEXT,
                    title TEXT,
                    filepath TEXT,
                    line_count INTEGER,
                    content TEXT
                );
                TRUNCATE TABLE documents;
                """)
    
    manifest_path = DATA_DIR / "manifest.json"
    print("Loading manifest:", manifest_path)

    manifest = json.loads(manifest_path.read_text())
    inserted = 0

    for doc in manifest:
        rel_path = doc["file"]
        file_path = DATA_DIR/ rel_path
        content = file_path.read_text(encoding= "utf-8")

        #derive fields
        doc_id = Path(rel_path).stem
        category = Path(rel_path).parent.name
        title = Path(rel_path).stem.replace("-"," ")
        line_count = content.count("\n") + 1
        
        con.execute("""
         INSERT INTO documents VALUES (?,?,?,?,?,?)
         """, (
              doc_id,
              category,
              title,
              rel_path,
              line_count,
              content
         ))

        inserted = inserted + 1

    print("Inserted documents:", inserted)
    result = con.execute("SELECT COUNT(*) FROM documents").fetchone()[0]
    print("Total documents in DB:", result)
    con.close()

if __name__ == "__main__":
    build_duckdb()
