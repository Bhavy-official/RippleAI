import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.detection.config import DetectionConfig
from app.detection.engine import DetectionEngine
from app.incidents.models import IncidentState
from app.incidents.service import IncidentService
from app.ingestion.pipeline import EventPipeline
from app.ingestion.simulator import Scenario, ScenarioSimulator


class EndToEndTests(unittest.IsolatedAsyncioTestCase):
    async def test_database_failure_is_detected_then_resolves_after_recovery(self):
        pipeline = EventPipeline()
        engine = DetectionEngine(DetectionConfig(baseline_minimum_samples=5))
        incidents = IncidentService(activation_score=35, recovery_observations=3)

        def detect(event):
            incidents.observe(event, engine.process(event))

        pipeline.subscribe(detect)
        simulator = ScenarioSimulator(pipeline, seed=11)
        await simulator.run(Scenario.NORMAL, count=10)
        await simulator.run(Scenario.DATABASE_FAILURE, count=40)
        self.assertEqual(len(incidents.incidents), 1)
        self.assertEqual(incidents.incidents[0].state, IncidentState.ACTIVE)
        self.assertGreater(incidents.incidents[0].peak_score, 35)

        await simulator.run(Scenario.RECOVERY, count=70)
        self.assertEqual(incidents.incidents[0].state, IncidentState.RESOLVED)

    async def test_security_scenario_uses_normalized_shared_event_path(self):
        pipeline = EventPipeline()
        simulator = ScenarioSimulator(pipeline, seed=3)
        await simulator.run(Scenario.SECURITY_ANOMALY, count=3)
        events = pipeline.recent_events()
        self.assertTrue(all(event.service == "identity-api" for event in events))
        self.assertTrue(all(event.ip == "203.0.113.42" for event in events))


if __name__ == "__main__":
    unittest.main()
