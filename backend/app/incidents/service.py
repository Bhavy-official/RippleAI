"""Time/service/fingerprint correlation and an explicit incident lifecycle."""

from __future__ import annotations

from datetime import datetime

from app.detection.engine import DetectionResult, Severity
from app.ingestion.models import LogEvent

from .explainer import explain
from .models import Incident, IncidentState, TimelineEntry


class IncidentService:
    def __init__(self, activation_score: float = 30.0, resolution_score: float = 18.0, recovery_observations: int = 3) -> None:
        self.activation_score = activation_score
        self.resolution_score = resolution_score
        self.recovery_observations = recovery_observations
        self._incidents: list[Incident] = []
        self._next_id = 1001
        self._recovery_counts: dict[int, int] = {}

    @property
    def incidents(self) -> list[Incident]:
        return list(self._incidents)

    @property
    def active_incidents(self) -> list[Incident]:
        return [item for item in self._incidents if item.state != IncidentState.RESOLVED]

    def observe(self, event: LogEvent, result: DetectionResult) -> Incident | None:
        incident = self._correlate(event, result)
        if result.score >= self.activation_score:
            if incident is None:
                incident = self._create(event, result)
            else:
                self._update(incident, event, result)
            return incident
        if incident is not None:
            self._recover(incident, event.timestamp, result)
            return incident
        return None

    def _correlate(self, event: LogEvent, result: DetectionResult) -> Incident | None:
        fingerprint_matches = set(result.novel_errors)
        active = self.active_incidents
        for incident in reversed(active):
            same_service = event.service in incident.affected_services
            related_error = bool(fingerprint_matches & incident.related_fingerprints)
            # The active incident window supplies time proximity; shared service, endpoint, or fingerprint joins it.
            if same_service or event.endpoint in incident.affected_endpoints or related_error:
                return incident
        return None

    def _create(self, event: LogEvent, result: DetectionResult) -> Incident:
        incident = Incident(self._next_id, event.timestamp, event.timestamp, result.severity, result.score,
                            _confidence(result), IncidentState.ACTIVE, peak_score=result.score,
                            peak_error_rate=result.metrics.error_rate)
        self._next_id += 1
        incident.timeline.append(TimelineEntry(event.timestamp, "INCIDENT_OPENED", f"{result.severity.value} incident detected (score {result.score:.1f})."))
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
        incident.affected_requests += 1
        incident.affected_services[event.service] = incident.affected_services.get(event.service, 0) + 1
        incident.affected_endpoints[event.endpoint] = incident.affected_endpoints.get(event.endpoint, 0) + 1
        incident.related_fingerprints.update(result.novel_errors)
        incident.explanation = explain(result)
        if not new and prior_severity != result.severity:
            incident.timeline.append(TimelineEntry(event.timestamp, "SEVERITY_CHANGED", f"{prior_severity.value} → {result.severity.value} (score {result.score:.1f})."))
        if result.novel_errors:
            incident.timeline.append(TimelineEntry(event.timestamp, "ERROR_FINGERPRINT", f"Observed {', '.join(result.novel_errors[:2])}."))
        self._recovery_counts[incident.id] = 0

    def _recover(self, incident: Incident, now: datetime, result: DetectionResult) -> None:
        count = self._recovery_counts.get(incident.id, 0) + 1
        self._recovery_counts[incident.id] = count
        incident.latest_update = now
        incident.anomaly_score = result.score
        incident.confidence = _confidence(result)
        if incident.state == IncidentState.ACTIVE:
            incident.state = IncidentState.RECOVERING
            incident.timeline.append(TimelineEntry(now, "RECOVERY_STARTED", "Metrics returned toward the learned baseline."))
        if count >= self.recovery_observations:
            incident.state = IncidentState.RESOLVED
            incident.severity = Severity.NORMAL
            incident.timeline.append(TimelineEntry(now, "INCIDENT_RESOLVED", "Incident resolved after sustained normal metrics."))


def _confidence(result: DetectionResult) -> float:
    if result.warming_up:
        return 40.0
    evidence_count = sum(value > 0 for value in result.breakdown.values())
    return round(min(99.0, 55.0 + evidence_count * 9.0 + result.score * 0.15), 1)
