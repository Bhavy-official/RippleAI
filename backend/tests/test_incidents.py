import sys
import unittest
from datetime import timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.detection.config import DetectionConfig
from app.detection.engine import DetectionEngine
from app.incidents.models import IncidentState
from app.incidents.service import IncidentService
from app.ingestion.models import LogEvent, utc_now


def log(index, status=200, latency=100, message="Request completed"):
    return LogEvent(utc_now() + timedelta(seconds=index), "payment-api", "/checkout", status, latency,
                    "ERROR" if status >= 500 else "INFO", message)


class IncidentTests(unittest.TestCase):
    def test_related_database_failures_form_one_explainable_incident(self):
        engine = DetectionEngine(DetectionConfig(window_seconds=120, baseline_minimum_samples=5))
        service = IncidentService(activation_score=35)
        for index in range(8):
            result = engine.process(log(index))
            service.observe(log(index), result)
        for index in range(8, 12):
            event = log(index, 500, 2500, "DBConnectionTimeout connection 123")
            service.observe(event, engine.process(event))
        self.assertEqual(len(service.incidents), 1)
        incident = service.incidents[0]
        self.assertGreater(incident.affected_requests, 1)
        self.assertIn("/checkout", incident.affected_endpoints)
        self.assertTrue(incident.explanation)
        self.assertGreater(len(incident.timeline), 1)

    def test_incident_transitions_to_recovering_then_resolved(self):
        engine = DetectionEngine(DetectionConfig(window_seconds=1, baseline_minimum_samples=3))
        service = IncidentService(activation_score=30, resolution_score=20, recovery_observations=2)
        for index in range(5):
            event = log(index)
            service.observe(event, engine.process(event))
        failed = log(6, 500, 2500, "DBConnectionTimeout 1")
        incident = service.observe(failed, engine.process(failed))
        self.assertIsNotNone(incident)
        for index in range(20, 23):
            recovered = log(index)
            service.observe(recovered, engine.process(recovered))
        self.assertEqual(service.incidents[0].state, IncidentState.RESOLVED)


if __name__ == "__main__":
    unittest.main()
