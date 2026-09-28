from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(frozen=True)
class ScoringWeights:
    error_rate: float = 0.40
    traffic: float = 0.20
    latency: float = 0.20
    novelty: float = 0.10
    velocity: float = 0.10

    def __post_init__(self) -> None:
        if abs(sum(vars(self).values()) - 1.0) > 0.0001:
            raise ValueError("Scoring weights must sum to 1.0")


@dataclass(frozen=True)
class SeverityThresholds:
    watch: float = 20
    warning: float = 40
    critical: float = 65
    emergency: float = 85


@dataclass(frozen=True)
class DetectionConfig:
    window_seconds: int = 60
    baseline_history_size: int = 120
    baseline_minimum_samples: int = 5  # Build baseline quickly for demo
    # Floors prevent a near-zero standard deviation from creating unstable scores.
    # Tighter floors = larger z-scores during real failures = higher anomaly score.
    error_rate_std_floor: float = 0.005  # 0.5% – amplifies error spikes strongly
    traffic_std_floor: float = 1.0
    latency_std_floor: float = 20.0     # 20ms floor – amplifies latency spikes
    weights: ScoringWeights = field(default_factory=ScoringWeights)
    severity: SeverityThresholds = field(default_factory=SeverityThresholds)
