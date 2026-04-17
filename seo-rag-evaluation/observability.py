import json
import time
import uuid
from dataclasses import dataclass, asdict, field
from typing import Any, Dict, List, Optional


@dataclass
class TraceEvent:
    stage: str
    timestamp_ms: int
    duration_ms: Optional[float] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class TraceLog:
    trace_id: str
    query: str
    events: List[TraceEvent] = field(default_factory=list)

    def add_event(self, stage: str, duration_ms: Optional[float] = None, **metadata: Any) -> None:
        self.events.append(
            TraceEvent(
                stage=stage,
                timestamp_ms=int(time.time() * 1000),
                duration_ms=duration_ms,
                metadata=metadata,
            )
        )

    def to_dict(self) -> Dict[str, Any]:
        return {
            "trace_id": self.trace_id,
            "query": self.query,
            "events": [asdict(event) for event in self.events],
        }

    def to_json(self) -> str:
        return json.dumps(self.to_dict(), indent=2)


def new_trace(query: str) -> TraceLog:
    return TraceLog(trace_id=str(uuid.uuid4()), query=query)


class StageTimer:
    def __init__(self) -> None:
        self.start = 0.0
        self.end = 0.0

    def __enter__(self) -> "StageTimer":
        self.start = time.perf_counter()
        return self

    def __exit__(self, exc_type, exc, tb) -> None:
        self.end = time.perf_counter()

    @property
    def elapsed_ms(self) -> float:
        return round((self.end - self.start) * 1000, 3)