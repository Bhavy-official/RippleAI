"""Time/service/fingerprint correlation and an explicit incident lifecycle."""

from __future__ import annotations

from datetime import datetime

from app.detection.engine import DetectionResult, Severity
from app.ingestion.models import LogEvent

from .explainer import explain
from .models import Incident, IncidentState, TimelineEntry


class IncidentService:
    def __init__(self, activation_score: float = 30.0, resolution_score: float = 18.0, recovery_observations: int = 10) -> None:
        self.activation_score = activation_score
        self.resolution_score = resolution_score
        # Require 10 consecutive sub-threshold ticks before resolving.
        # At 0.12–0.2s per tick this gives ~2 seconds of recovery — enough for
        # judges to read the incident panel before it disappears.
        self.recovery_observations = recovery_observations
        self._incidents: list[Incident] = []
        self._next_id = 1001
        self._recovery_counts: dict[int, int] = {}
        self._current_scenario: str = "UNKNOWN"

    @property
    def incidents(self) -> list[Incident]:
        return list(self._incidents)

    @property
    def active_incidents(self) -> list[Incident]:
        return [item for item in self._incidents if item.state != IncidentState.RESOLVED]

    def observe(self, event: LogEvent, result: DetectionResult, scenario_type: str = "UNKNOWN") -> Incident | None:
        self._current_scenario = scenario_type  # track for correlator
        incident = self._correlate(event, result)
        if result.score >= self.activation_score:
            if incident is None:
                incident = self._create(event, result, scenario_type)
            else:
                self._update(incident, event, result)
            return incident
        if incident is not None:
            self._recover(incident, event.timestamp, result)
            return incident
        return None

    def _correlate(self, event: LogEvent, result: DetectionResult) -> Incident | None:
        """
        Find an existing ACTIVE incident to attach this event to.

        Rules:
        - NEVER merge into a RECOVERING incident — that lets it finish resolving
          while the new scenario creates its own fresh incident.
        - Only merge when same service OR same endpoint AND same scenario.
        - Drop the blind "attach to newest active" fallback that was swallowing
          all scenario events into the first incident ever created.
        """
        # Only consider truly ACTIVE (not RECOVERING, not RESOLVED) incidents
        truly_active = [i for i in self._incidents if i.state == IncidentState.ACTIVE]
        if not truly_active:
            return None

        fingerprint_matches = set(result.novel_errors)

        # Correlate: same scenario type + (same service or same endpoint or related error)
        for incident in reversed(truly_active):
            same_scenario = incident.scenario_type == self._current_scenario
            same_service = event.service in incident.affected_services
            same_endpoint = event.endpoint in incident.affected_endpoints
            related_error = bool(fingerprint_matches & incident.related_fingerprints)
            if same_scenario and (same_service or same_endpoint or related_error):
                return incident

        # If score is truly extreme (>= 70), merge into any active incident to avoid
        # explosion of tiny incidents during a massive burst
        if result.score >= 70:
            for incident in reversed(truly_active):
                same_service = event.service in incident.affected_services
                if same_service:
                    return incident

        return None

    def _create(self, event: LogEvent, result: DetectionResult, scenario_type: str = "UNKNOWN") -> Incident:
        incident = Incident(
            self._next_id, event.timestamp, event.timestamp, result.severity, result.score,
            _confidence(result), IncidentState.ACTIVE, peak_score=result.score,
            peak_error_rate=result.metrics.error_rate,
            scenario_type=scenario_type,
        )
        self._next_id += 1
        incident.timeline.append(TimelineEntry(
            event.timestamp, "INCIDENT_OPENED",
            f"{result.severity.value} incident detected (score {result.score:.1f}).",
        ))
        self._incidents.append(incident)
        self._update(incident, event, result, new=True)
        return incident

    def _update(self, incident: Incident, event: LogEvent, result: DetectionResult, new: bool = False) -> None:
        prior_severity = incident.severity
        incident.latest_update = event.timestamp
        incident.severity = result.severity
        incident.anomaly_score = result.score
        incident.confidence = _confidence(result)
        incident.state = IncidentState.ACTIVE
        incident.peak_score = max(incident.peak_score, result.score)
        incident.peak_error_rate = max(incident.peak_error_rate, result.metrics.error_rate)
        incident.peak_p95_latency = max(incident.peak_p95_latency, result.metrics.p95_latency)
        incident.breakdown = result.breakdown  # live breakdown for frontend score bars
        incident.affected_requests += 1
        incident.affected_services[event.service] = incident.affected_services.get(event.service, 0) + 1
        incident.affected_endpoints[event.endpoint] = incident.affected_endpoints.get(event.endpoint, 0) + 1

        # Always store error fingerprints on the incident, not just novel ones.
        # novel_errors only fires once; storing them here makes them persist.
        if event.level == "ERROR" or event.status >= 500:
            from app.detection.fingerprints import fingerprint as fp
            sig = fp(event.message)
            if sig:
                incident.related_fingerprints.add(sig)
        incident.related_fingerprints.update(result.novel_errors)

        incident.explanation = explain(result)

        if not new and prior_severity != result.severity:
            incident.timeline.append(TimelineEntry(
                event.timestamp, "SEVERITY_CHANGED",
                f"{prior_severity.value} -> {result.severity.value} (score {result.score:.1f}).",
            ))
        if result.novel_errors:
            incident.timeline.append(TimelineEntry(
                event.timestamp, "ERROR_FINGERPRINT",
                f"Observed: {', '.join(result.novel_errors[:3])}.",
            ))
        self._recovery_counts[incident.id] = 0

    def _recover(self, incident: Incident, now: datetime, result: DetectionResult) -> None:
        count = self._recovery_counts.get(incident.id, 0) + 1
        self._recovery_counts[incident.id] = count
        incident.latest_update = now
        incident.anomaly_score = result.score
        incident.confidence = _confidence(result)
        if incident.state == IncidentState.ACTIVE:
            incident.state = IncidentState.RECOVERING
            incident.timeline.append(TimelineEntry(
                now, "RECOVERY_STARTED",
                "Metrics returning toward learned baseline.",
            ))
        if count >= self.recovery_observations:
            incident.state = IncidentState.RESOLVED
            incident.severity = Severity.NORMAL
            duration_s = int((now - incident.started_at).total_seconds())
            incident.timeline.append(TimelineEntry(
                now, "INCIDENT_RESOLVED",
                f"Resolved after {duration_s}s. Peak score: {incident.peak_score:.1f}. "
                f"Peak error rate: {incident.peak_error_rate:.1%}.",
            ))


def _confidence(result: DetectionResult) -> float:
    if result.warming_up:
        return 40.0
    evidence_count = sum(value > 0 for value in result.breakdown.values())
    return round(min(99.0, 55.0 + evidence_count * 9.0 + result.score * 0.15), 1)
