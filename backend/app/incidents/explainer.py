"""Evidence-only explanations: no frontend-fabricated or LLM-invented metrics."""

from __future__ import annotations

from app.detection.engine import DetectionResult


def explain(result: DetectionResult) -> list[str]:
    metrics = result.metrics
    baseline = result.baseline
    reasons: list[str] = []
    if baseline and metrics.error_rate > baseline.error_rate_mean:
        multiplier = metrics.error_rate / max(baseline.error_rate_mean, 0.001)
        reasons.append(f"Error rate increased from {baseline.error_rate_mean:.1%} to {metrics.error_rate:.1%} ({multiplier:.1f}x baseline).")
    if baseline and metrics.p95_latency > baseline.p95_latency_mean:
        reasons.append(f"P95 latency increased from {baseline.p95_latency_mean:.0f}ms to {metrics.p95_latency:.0f}ms.")
    if result.novel_errors:
        reasons.append(f"New error signature detected: {', '.join(result.novel_errors[:3])}.")
    if result.breakdown["growth_velocity"] > 3:
        reasons.append("Error rate is accelerating abnormally.")
    if metrics.endpoint_distribution:
        endpoint, count = max(metrics.endpoint_distribution.items(), key=lambda item: item[1])
        share = count / max(metrics.total_requests, 1)
        reasons.append(f"{share:.0%} of current-window requests hit {endpoint}.")
    return reasons or ["Anomaly score is elevated relative to the learned baseline."]
