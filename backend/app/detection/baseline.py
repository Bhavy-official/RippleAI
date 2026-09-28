"""Small, safe rolling baseline store. Per-key baselines permit service expansion."""

from __future__ import annotations

from collections import defaultdict, deque
from dataclasses import dataclass
from statistics import fmean, pstdev

from .window import WindowMetrics


@dataclass(frozen=True)
class BaselineSnapshot:
    samples: int
    error_rate_mean: float
    error_rate_std: float
    requests_per_second_mean: float
    requests_per_second_std: float
    p95_latency_mean: float
    p95_latency_std: float


class AdaptiveBaseline:
    def __init__(self, history_size: int, minimum_samples: int) -> None:
        self.history_size = history_size
        self.minimum_samples = minimum_samples
        self._history: dict[str, deque[WindowMetrics]] = defaultdict(lambda: deque(maxlen=history_size))

    def add(self, metrics: WindowMetrics, key: str = "global") -> None:
        self._history[key].append(metrics)

    def snapshot(self, key: str = "global") -> BaselineSnapshot | None:
        values = self._history[key]
        if len(values) < self.minimum_samples:
            return None
        return BaselineSnapshot(
            samples=len(values),
            error_rate_mean=fmean(metric.error_rate for metric in values),
            error_rate_std=_std(metric.error_rate for metric in values),
            requests_per_second_mean=fmean(metric.requests_per_second for metric in values),
            requests_per_second_std=_std(metric.requests_per_second for metric in values),
            p95_latency_mean=fmean(metric.p95_latency for metric in values),
            p95_latency_std=_std(metric.p95_latency for metric in values),
        )


def _std(values) -> float:
    values = list(values)
    return pstdev(values) if len(values) > 1 else 0.0
