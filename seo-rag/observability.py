import json
import time
import uuid
from contextlib import contextmanager
from dataclasses import dataclass, field
from typing import Any, Dict


def new_trace(name: str) -> Dict[str, Any]:
    return {
        "trace_id": str(uuid.uuid4()),
        "name": name,
        "started_at": time.time(),
    }


def log_event(trace: Dict[str, Any], stage: str, event: str, **kwargs: Any) -> None:
    payload = {
        "trace_id": trace["trace_id"],
        "trace_name": trace["name"],
        "stage": stage,
        "event": event,
        "ts": time.time(),
        **kwargs,
    }
    print(json.dumps(payload, ensure_ascii=False))


@dataclass
class StageTimer:
    trace: Dict[str, Any]
    stage: str
    extra: Dict[str, Any] = field(default_factory=dict)
    start_time: float = field(default=0.0)

    def __enter__(self):
        self.start_time = time.time()
        log_event(self.trace, self.stage, "start", **self.extra)
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        elapsed_ms = round((time.time() - self.start_time) * 1000, 2)
        if exc_val is None:
            log_event(self.trace, self.stage, "end", elapsed_ms=elapsed_ms, **self.extra)
        else:
            log_event(
                self.trace,
                self.stage,
                "error",
                elapsed_ms=elapsed_ms,
                error=str(exc_val),
                **self.extra
            )