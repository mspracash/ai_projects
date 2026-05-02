from pathlib import Path
from typing import Dict, List

import duckdb

from observability import new_trace, log_event, StageTimer


CHUNKS_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS chunks (
    chunk_id TEXT PRIMARY KEY,
    doc_id TEXT,
    title TEXT,
    description TEXT,
    keywords TEXT,
    text TEXT,
    relative_path TEXT,
    service TEXT,
    doc_type TEXT
)
"""


def create_chunks_table(conn: duckdb.DuckDBPyConnection, trace=None) -> None:
    local_trace = trace or new_trace("create_chunks_table")

    with StageTimer(local_trace, "create_chunks_table"):
        conn.execute(CHUNKS_TABLE_SQL)

    log_event(local_trace, "create_chunks_table", "completed")


def create_indexes(conn: duckdb.DuckDBPyConnection, trace=None) -> None:
    local_trace = trace or new_trace("create_indexes")

    with StageTimer(local_trace, "create_indexes"):
        conn.execute("CREATE INDEX IF NOT EXISTS idx_chunks_doc_id ON chunks(doc_id)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_chunks_service ON chunks(service)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_chunks_doc_type ON chunks(doc_type)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_chunks_relative_path ON chunks(relative_path)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_chunks_title ON chunks(title)")

    log_event(local_trace, "create_indexes", "completed")


def init_db(db_path: str) -> duckdb.DuckDBPyConnection:
    trace = new_trace("init_db")

    db_file = Path(db_path)
    if db_file.parent and not db_file.parent.exists():
        db_file.parent.mkdir(parents=True, exist_ok=True)

    with StageTimer(trace, "connect_db", extra={"db_path": db_path}):
        conn = duckdb.connect(db_path)

    log_event(trace, "init_db", "completed", db_path=db_path)
    return conn


def drop_chunks_table(conn: duckdb.DuckDBPyConnection) -> None:
    trace = new_trace("drop_chunks_table")

    with StageTimer(trace, "drop_chunks_table"):
        conn.execute("DROP TABLE IF EXISTS chunks")

    log_event(trace, "drop_chunks_table", "completed")


def reset_chunks_table(
    conn: duckdb.DuckDBPyConnection,
    recreate: bool = False,
) -> None:
    trace = new_trace("reset_chunks_table")

    if recreate:
        with StageTimer(trace, "drop_and_recreate_chunks_table"):
            conn.execute("DROP TABLE IF EXISTS chunks")
            conn.execute(CHUNKS_TABLE_SQL)

        create_indexes(conn, trace=trace)

    else:
        with StageTimer(trace, "delete_existing_chunks"):
            conn.execute("DELETE FROM chunks")

    log_event(
        trace,
        "reset_chunks_table",
        "completed",
        recreate=recreate,
    )


def normalize_keywords(value) -> str:
    if value is None:
        return ""

    if isinstance(value, list):
        return ", ".join(str(v).strip() for v in value if str(v).strip())

    return str(value).strip()


def insert_chunks(conn: duckdb.DuckDBPyConnection, chunks: List[Dict]) -> None:
    trace = new_trace("insert_chunks")

    rows = [
        (
            c["chunk_id"],
            c["doc_id"],
            c.get("title", ""),
            c.get("description", ""),
            normalize_keywords(c.get("keywords")),
            c.get("text", ""),
            c["relative_path"],
            c.get("service"),
            c.get("doc_type"),
        )
        for c in chunks
    ]

    with StageTimer(trace, "insert_many", extra={"row_count": len(rows)}):
        conn.executemany(
            """
            INSERT INTO chunks (
                chunk_id,
                doc_id,
                title,
                description,
                keywords,
                text,
                relative_path,
                service,
                doc_type
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            rows,
        )

    log_event(trace, "insert_chunks", "completed", inserted=len(rows))


def evaluate_chunks(conn: duckdb.DuckDBPyConnection) -> Dict[str, object]:
    total_chunks = conn.execute("SELECT COUNT(*) FROM chunks").fetchone()[0]

    by_service_rows = conn.execute(
        """
        SELECT service, COUNT(*) AS cnt
        FROM chunks
        GROUP BY service
        ORDER BY cnt DESC, service ASC
        """
    ).fetchall()

    by_doc_type_rows = conn.execute(
        """
        SELECT doc_type, COUNT(*) AS cnt
        FROM chunks
        GROUP BY doc_type
        ORDER BY cnt DESC, doc_type ASC
        """
    ).fetchall()

    avg_text_len = conn.execute(
        """
        SELECT COALESCE(AVG(LENGTH(text)), 0)
        FROM chunks
        """
    ).fetchone()[0]

    avg_description_len = conn.execute(
        """
        SELECT COALESCE(AVG(LENGTH(description)), 0)
        FROM chunks
        """
    ).fetchone()[0]

    avg_keywords_len = conn.execute(
        """
        SELECT COALESCE(AVG(LENGTH(keywords)), 0)
        FROM chunks
        """
    ).fetchone()[0]

    return {
        "total_chunks": total_chunks,
        "avg_text_length": round(avg_text_len, 2),
        "avg_description_length": round(avg_description_len, 2),
        "avg_keywords_length": round(avg_keywords_len, 2),
        "chunks_by_service": {k: v for k, v in by_service_rows},
        "chunks_by_doc_type": {k: v for k, v in by_doc_type_rows},
    }