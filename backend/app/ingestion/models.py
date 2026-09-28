"""Normalized, transport-independent log event model."""

from __future__ import annotations

from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from typing import Any


@dataclass(frozen=True, slots=True)
class LogEvent:
    timestamp: datetime
    service: str
    endpoint: str
    status: int
    latency_ms: float
    level: str
    message: str
    ip: str | None = None
    request_id: str | None = None
    deployment_id: str | None = None
    metadata: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        payload = asdict(self)
        payload["timestamp"] = self.timestamp.isoformat()
        return payload


def utc_now() -> datetime:
    return datetime.now(timezone.utc)
