from __future__ import annotations

from dataclasses import asdict, dataclass, field
from datetime import datetime
from enum import Enum

from app.detection.engine import Severity


class IncidentState(str, Enum):
    ACTIVE = "ACTIVE"
    RECOVERING = "RECOVERING"
    RESOLVED = "RESOLVED"


@dataclass(frozen=True)
class TimelineEntry:
    timestamp: datetime
    kind: str
    detail: str

    def to_dict(self) -> dict:
        result = asdict(self)
        result["timestamp"] = self.timestamp.isoformat()
        return result


@dataclass
class Incident:
    id: int
    started_at: datetime
    latest_update: datetime
    severity: Severity
    anomaly_score: float
    confidence: float
    state: IncidentState
    related_fingerprints: set[str] = field(default_factory=set)
    affected_services: dict[str, int] = field(default_factory=dict)
    affected_endpoints: dict[str, int] = field(default_factory=dict)
    affected_requests: int = 0
    peak_score: float = 0.0
    peak_error_rate: float = 0.0
    timeline: list[TimelineEntry] = field(default_factory=list)
    explanation: list[str] = field(default_factory=list)
    breakdown: dict[str, float] = field(default_factory=dict)
    peak_p95_latency: float = 0.0

    def to_dict(self) -> dict:
        return {
            "id": self.id, "started_at": self.started_at.isoformat(), "latest_update": self.latest_update.isoformat(),
            "severity": self.severity.value, "anomaly_score": self.anomaly_score, "confidence": self.confidence,
            "state": self.state.value, "related_fingerprints": sorted(self.related_fingerprints),
            "affected_services": self.affected_services, "affected_endpoints": self.affected_endpoints,
            "affected_requests": self.affected_requests, "peak_score": self.peak_score,
            "peak_error_rate": self.peak_error_rate, "peak_p95_latency": self.peak_p95_latency,
            "timeline": [entry.to_dict() for entry in self.timeline],
            "explanation": self.explanation, "breakdown": self.breakdown,
        }
