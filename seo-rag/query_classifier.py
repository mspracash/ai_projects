import json
import re
import urllib.request
from typing import Any, Dict


OLLAMA_URL = "http://localhost:11434/api/generate"
OLLAMA_MODEL = "phi4-mini"

VALID_DOC_TYPES = {"overview", "service", "concern", "pricing"}


def normalize_text(text: str) -> str:
    return (
        text.replace("\u2019", "'")
        .replace("\u2018", "'")
        .replace("\u201c", '"')
        .replace("\u201d", '"')
        .replace("\u2013", "-")
        .replace("\u2014", "-")
        .replace("\u00a0", " ")
        .strip()
    )


def extract_json_block(raw: str) -> str:
    raw = raw.strip()

    if raw.startswith("```"):
        raw = re.sub(r"^```[a-zA-Z0-9_]*\s*", "", raw)
        raw = re.sub(r"\s*```$", "", raw)

    start = raw.find("{")
    end = raw.rfind("}")

    if start == -1 or end == -1 or end <= start:
        raise ValueError("No JSON object found in LLM response")

    return raw[start:end + 1]


def validate_output(data: Dict[str, Any], query: str) -> Dict[str, Any]:
    doc_type = str(data.get("doc_type", "")).strip()
    confidence = float(data.get("confidence", 0.0))

    if doc_type not in VALID_DOC_TYPES:
        raise ValueError(f"Invalid doc_type: {doc_type}")

    if not (0.0 <= confidence <= 1.0):
        raise ValueError("Confidence must be between 0.0 and 1.0")

    return {
        "doc_type": doc_type,
        "confidence": round(confidence, 3),
        "method": "llm",
        "query": query,
    }


def classify_query(query: str) -> Dict[str, Any]:
    query = normalize_text(query)

    prompt = f"""
You are a strict doc_type classifier for an SEO RAG system.

Classify the user query into exactly one doc_type.

Valid doc_type values:
- overview: broad questions about all SEO services, comparisons, recommendations, or what the agency offers
- service: questions asking what a specific SEO service includes or how it works
- concern: user problem, pain point, issue, failure, drop, not ranking, not indexed, weak backlinks, low traffic
- pricing: cost, price, budget, package, monthly, charge, estimate

Rules:
- Return JSON only.
- Do not explain.
- Choose exactly one doc_type.

Return exactly:
{{
  "doc_type": "overview|service|concern|pricing",
  "confidence": 0.0
}}

User query:
"{query}"
""".strip()

    payload = {
        "model": OLLAMA_MODEL,
        "prompt": prompt,
        "stream": False,
        "format": "json",
        "keep_alive": "10m",
        "options": {
            "temperature": 0.0,
            "top_p": 0.1,
        },
    }

    req = urllib.request.Request(
        OLLAMA_URL,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    with urllib.request.urlopen(req, timeout=60) as response:
        body = response.read().decode("utf-8")

    outer = json.loads(body)
    raw_response = outer.get("response", "").strip()

    json_text = extract_json_block(raw_response)
    parsed = json.loads(json_text)

    return validate_output(parsed, query)


# backward-compatible name
def classify_query_with_llm(query: str) -> Dict[str, Any]:
    return classify_query(query)