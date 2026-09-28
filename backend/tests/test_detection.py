import sys
import unittest
from datetime import timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.detection.config import DetectionConfig
from app.detection.engine import DetectionEngine, Severity
from app.detection.fingerprints import fingerprint
from app.ingestion.models import LogEvent, utc_now


def event(index: int, *, status=200, latency=100, message="Request completed"):
    return LogEvent(utc_now() + timedelta(milliseconds=index), "payment-api", "/checkout", status, latency,
                    "ERROR" if status >= 500 else "INFO", message)


class DetectionTests(unittest.TestCase):
    def test_fingerprint_removes_variable_values(self):
        self.assertEqual(fingerprint("User 123 from 10.1.2.3 failed"), "User <*> from <*> failed")
        self.assertEqual(fingerprint("User 999 from 10.1.2.4 failed"), "User <*> from <*> failed")

    def test_normal_traffic_stays_normal_after_baseline_warmup(self):
        engine = DetectionEngine(DetectionConfig(baseline_minimum_samples=5))
        results = [engine.process(event(index)) for index in range(12)]
        self.assertFalse(results[-1].warming_up)
        self.assertEqual(results[-1].severity, Severity.NORMAL)
        self.assertLessEqual(results[-1].score, 1)

    def test_database_failure_scores_high_and_exposes_evidence(self):
        engine = DetectionEngine(DetectionConfig(baseline_minimum_samples=5))
        for index in range(8):
            engine.process(event(index))
        result = engine.process(event(9, status=500, latency=2400, message="DBConnectionTimeout connection 123"))
        self.assertGreaterEqual(result.score, 60)
        self.assertIn(result.severity, {Severity.WARNING, Severity.CRITICAL, Severity.EMERGENCY})
        self.assertIn("DBConnectionTimeout connection <*>", result.novel_errors)
        self.assertGreater(result.breakdown["latency_deviation"], 0)


if __name__ == "__main__":
    unittest.main()
