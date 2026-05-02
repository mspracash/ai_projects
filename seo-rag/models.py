from dataclasses import dataclass, field
from typing import List, Dict


@dataclass
class Document:
    doc_id: str
    source_path: str
    relative_path: str

    title: str
    description: str
    keywords: List[str] = field(default_factory=list)
    text: str = ""

    metadata: Dict[str, str] = field(default_factory=dict)