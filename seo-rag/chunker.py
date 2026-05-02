import re
from typing import Dict, List

from models import Document
from observability import new_trace, log_event, StageTimer


def normalize_whitespace(text: str) -> str:
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def split_sections(text: str) -> List[str]:
    text = normalize_whitespace(text)
    parts = re.split(r"\n## ", text)

    sections: List[str] = []

    for i, part in enumerate(parts):
        part = part.strip()
        if not part:
            continue

        # skip document H1 intro
        if i == 0 and part.startswith("# "):
            continue

        if i == 0:
            sections.append(part)
        else:
            sections.append("## " + part)

    return sections


def extract_title(section: str) -> str:
    for line in section.splitlines():
        line = line.strip()

        if line.startswith("## title:"):
            return line.replace("## title:", "", 1).strip()

        if line.startswith("## "):
            return line.replace("## ", "", 1).strip()

    return ""


def extract_description(section: str) -> str:
    for line in section.splitlines():
        line = line.strip()

        if line.lower().startswith("description:"):
            return line.split(":", 1)[1].strip()

    return ""


def extract_keywords(section: str) -> List[str]:
    for line in section.splitlines():
        line = line.strip()

        if line.lower().startswith("keywords:"):
            raw = line.split(":", 1)[1]
            return [k.strip() for k in raw.split(",") if k.strip()]

    return []


def build_chunk(
    doc: Document,
    section: str,
    index: int,
    service: str,
    doc_type: str,
) -> Dict:
    return {
        "chunk_id": f"{doc.doc_id}_{index}",
        "doc_id": doc.doc_id,
        "title": extract_title(section) or doc.title,
        "description": extract_description(section),
        "keywords": extract_keywords(section),
        "text": normalize_whitespace(section),
        "relative_path": doc.relative_path,
        "service": service,
        "doc_type": doc_type,
    }


def chunk_documents(documents: List[Document]) -> List[Dict]:
    trace = new_trace("chunk_documents")
    chunks: List[Dict] = []

    for doc in documents:
        with StageTimer(
            trace,
            "chunk_document",
            extra={"doc_id": doc.doc_id, "path": doc.relative_path},
        ):
            service = doc.metadata.get("service_id", "unknown")
            doc_type = doc.metadata.get("doc_type", "overview")

            doc_chunks: List[Dict] = []

            for i, section in enumerate(split_sections(doc.text)):
                doc_chunks.append(
                    build_chunk(
                        doc=doc,
                        section=section,
                        index=i,
                        service=service,
                        doc_type=doc_type,
                    )
                )

            chunks.extend(doc_chunks)

            log_event(
                trace,
                "chunk_document",
                "completed",
                doc_id=doc.doc_id,
                relative_path=doc.relative_path,
                service=service,
                doc_type=doc_type,
                chunk_count=len(doc_chunks),
            )

    log_event(trace, "chunk_documents", "completed", total_chunks=len(chunks))
    return chunks