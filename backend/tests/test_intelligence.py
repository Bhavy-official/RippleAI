import unittest
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.intelligence.service import IntelligenceService

class IntelligenceTests(unittest.TestCase):
    def test_profile_and_what_if_are_evidence_bound(self):
        incident = {"id": 7, "related_fingerprints": ["DBConnectionTimeout"], "affected_endpoints": {"/checkout": 8}, "affected_requests": 8, "peak_score": 90, "peak_error_rate": .2, "confidence": 91, "explanation": ["Error rate increased."]}
        service = IntelligenceService()
        self.assertEqual(service.profile(incident)["deployment_correlation"]["deployment"], "release-1.8.0")
        self.assertGreater(service.what_if(incident, 2)["predicted_latency_ms"], 240)
