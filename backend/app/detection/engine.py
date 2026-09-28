"""Configurable explainable detector built from metrics, baseline, and fingerprints."""

from __future__ import annotations

from dataclasses import asdict, dataclass
from enum import Enum

from app.ingestion.models import LogEvent

from .baseline import AdaptiveBaseline, BaselineSnapshot
from .config import DetectionConfig
from .window import SlidingWindow, WindowMetrics


class Severity(str, Enum):
    NORMAL = "NORMAL"
    WATCH = "WATCH"
    WARNING = "WARNING"
    CRITICAL = "CRITICAL"
    EMERGENCY = "EMERGENCY"


@dataclass(frozen=True)
class DetectionResult:
    metrics: WindowMetrics
    baseline: BaselineSnapshot | None
    score: float
    severity: Severity
    breakdown: dict[str, float]
    novel_errors: list[str]
    warming_up: bool

    def to_dict(self) -> dict:
        return {
            "metrics": self.metrics.to_dict(), "baseline": asdict(self.baseline) if self.baseline else None,
            "score": self.score, "severity": self.severity.value, "breakdown": self.breakdown,
            "novel_errors": self.novel_errors, "warming_up": self.warming_up,
        }


class DetectionEngine:
    def __init__(self, config: DetectionConfig | None = None) -> None:
        self.config = config or DetectionConfig()
        self.window = SlidingWindow(self.config.window_seconds)
        self.baseline = AdaptiveBaseline(self.config.baseline_history_size, self.config.baseline_minimum_samples)
        self._known_errors: set[str] = set()
        self._previous_error_rate = 0.0
        self._last_baseline_second: int = -1  # track wall-second for per-tick baseline sampling

    def process(self, event: LogEvent) -> DetectionResult:
        metrics = self.window.add(event)
        baseline = self.baseline.snapshot()
        novel_errors = [signature for signature in metrics.error_frequencies if signature not in self._known_errors]
        breakdown = self._score(metrics, baseline, novel_errors)
        score = round(min(100.0, sum(breakdown.values())), 1)
        result = DetectionResult(metrics, baseline, score, self._severity(score), breakdown, novel_errors, baseline is None)
        self._known_errors.update(metrics.error_frequencies)
        self._previous_error_rate = metrics.error_rate
        # Feed baseline once per simulated second (not per individual event) so each
        # sample represents a genuinely different traffic pattern.
        event_second = int(event.timestamp.timestamp())
        if event_second != self._last_baseline_second:
            self._last_baseline_second = event_second
            # Only teach normal-ish seconds; never let an anomaly corrupt the baseline.
            if baseline is None or score < self.config.severity.warning:
                self.baseline.add(metrics)
        return result

    def _score(self, metrics: WindowMetrics, baseline: BaselineSnapshot | None, novel_errors: list[str]) -> dict[str, float]:
        weights = self.config.weights
        if baseline is None:
            return {"error_rate_deviation": 0.0, "traffic_deviation": 0.0, "latency_deviation": 0.0,
                    "novelty": 0.0, "growth_velocity": 0.0}
        error = _z_signal(metrics.error_rate, baseline.error_rate_mean, max(baseline.error_rate_std, self.config.error_rate_std_floor))
        traffic = _z_signal(metrics.requests_per_second, baseline.requests_per_second_mean, max(baseline.requests_per_second_std, self.config.traffic_std_floor))
        latency = _z_signal(metrics.p95_latency, baseline.p95_latency_mean, max(baseline.p95_latency_std, self.config.latency_std_floor))
        novelty = 100.0 if novel_errors else 0.0
        # Velocity: scale by 100 so even a 5% error-rate jump per event scores visibly
        velocity = min(100.0, max(0.0, (metrics.error_rate - self._previous_error_rate) * 100.0))
        return {
            "error_rate_deviation": round(weights.error_rate * error, 1),
            "traffic_deviation": round(weights.traffic * traffic, 1),
            "latency_deviation": round(weights.latency * latency, 1),
            "novelty": round(weights.novelty * novelty, 1),
            "growth_velocity": round(weights.velocity * velocity, 1),
        }

    def _severity(self, score: float) -> Severity:
        thresholds = self.config.severity
        if score >= thresholds.emergency: return Severity.EMERGENCY
        if score >= thresholds.critical: return Severity.CRITICAL
        if score >= thresholds.warning: return Severity.WARNING
        if score >= thresholds.watch: return Severity.WATCH
        return Severity.NORMAL


def _z_signal(value: float, mean: float, std: float) -> float:
    return min(100.0, max(0.0, ((value - mean) / std) * 20.0))
