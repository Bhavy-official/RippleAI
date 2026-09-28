import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from fastapi.testclient import TestClient
from app.api.main import app


class ApiTests(unittest.TestCase):
    def test_state_and_scenario_api_expose_live_backend_runtime(self):
        with TestClient(app) as client:
            state = client.get("/api/state")
            self.assertEqual(state.status_code, 200)
            self.assertIn("metrics", state.json())
            response = client.post("/api/scenarios/DATABASE_FAILURE")
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.json()["scenario"], "DATABASE_FAILURE")


if __name__ == "__main__":
    unittest.main()
