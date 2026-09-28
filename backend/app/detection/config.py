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
    baseline_minimum_samples: int = 10
    # Floors prevent a near-zero standard deviation from creating unstable scores.
    error_rate_std_floor: float = 0.01
    traffic_std_floor: float = 2.0
    latency_std_floor: float = 50.0
    weights: ScoringWeights = field(default_factory=ScoringWeights)
    severity: SeverityThresholds = field(default_factory=SeverityThresholds)
