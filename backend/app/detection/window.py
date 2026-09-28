"""Deque-backed rolling metrics with no dataframe dependency."""

from __future__ import annotations

from collections import Counter, deque
from dataclasses import asdict, dataclass
from datetime import datetime, timedelta
from math import ceil

from app.ingestion.models import LogEvent

from .fingerprints import fingerprint


@dataclass(frozen=True)
class WindowMetrics:
    observed_at: datetime
    total_requests: int
    error_requests: int
    error_rate: float
    warning_rate: float
    average_latency: float
    p95_latency: float
    requests_per_second: float
    unique_error_types: int
    service_distribution: dict[str, int]
    endpoint_distribution: dict[str, int]
    status_distribution: dict[str, int]
    error_frequencies: dict[str, int]

    def to_dict(self) -> dict:
        return asdict(self)


class SlidingWindow:
    def __init__(self, seconds: int = 60) -> None:
        if seconds <= 0:
            raise ValueError("Window duration must be positive")
        self.seconds = seconds
        self._events: deque[LogEvent] = deque()

    def add(self, event: LogEvent) -> WindowMetrics:
        self._events.append(event)
        self._prune(event.timestamp)
        return self.metrics(event.timestamp)

    def metrics(self, now: datetime) -> WindowMetrics:
        self._prune(now)
        events = list(self._events)
        total = len(events)
        errors = [event for event in events if event.status >= 500 or event.level == "ERROR"]
        warnings = [event for event in events if event.level == "WARN"]
        latencies = sorted(event.latency_ms for event in events)
        error_frequencies = Counter(fingerprint(event.message) for event in errors)
        return WindowMetrics(
            observed_at=now,
            total_requests=total,
            error_requests=len(errors),
            error_rate=len(errors) / total if total else 0.0,
            warning_rate=len(warnings) / total if total else 0.0,
            average_latency=sum(latencies) / total if total else 0.0,
            p95_latency=_percentile(latencies, 0.95),
            requests_per_second=total / self.seconds,
            unique_error_types=len(error_frequencies),
            service_distribution=dict(Counter(event.service for event in events)),
            endpoint_distribution=dict(Counter(event.endpoint for event in events)),
            status_distribution={str(code): count for code, count in Counter(event.status for event in events).items()},
            error_frequencies=dict(error_frequencies),
        )

    def _prune(self, now: datetime) -> None:
        cutoff = now - timedelta(seconds=self.seconds)
        while self._events and self._events[0].timestamp < cutoff:
            self._events.popleft()


def _percentile(values: list[float], percentile: float) -> float:
    if not values:
        return 0.0
    # Nearest-rank percentile ensures a high outlier is visible in small live windows.
    index = max(0, min(len(values) - 1, ceil(len(values) * percentile) - 1))
    return values[index]
