import asyncio
import json
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.ingestion.parser import EventParseError, parse_log_line
from app.ingestion.pipeline import EventPipeline
from app.ingestion.simulator import Scenario, ScenarioSimulator
from app.ingestion.tailer import LogFileTailer


class IngestionTests(unittest.IsolatedAsyncioTestCase):
    def test_parser_normalizes_and_preserves_extra_metadata(self):
        event = parse_log_line('{"timestamp":"2026-09-28T12:00:00Z","service":"payment-api","status":500,"latency_ms":42,"message":"boom","trace":"abc"}')
        self.assertEqual(event.endpoint, "/unknown")
        self.assertEqual(event.metadata["trace"], "abc")

    def test_parser_rejects_malformed_events(self):
        with self.assertRaises(EventParseError):
            parse_log_line("not json")

    async def test_tailer_reads_only_new_lines_and_continues_after_bad_line(self):
        with tempfile.TemporaryDirectory() as directory:
            log_path = Path(directory) / "app.log"
            log_path.write_text(json.dumps({"service":"api","status":200,"latency_ms":12,"message":"ok"}) + "\nnot json\n", encoding="utf-8")
            pipeline = EventPipeline()
            tailer = LogFileTailer(log_path, pipeline)
            self.assertEqual(await tailer.read_new(), 1)
            self.assertEqual(await tailer.read_new(), 0)
            with log_path.open("a", encoding="utf-8") as log_file:
                log_file.write(json.dumps({"service":"api","status":500,"latency_ms":99,"message":"fail"}) + "\n")
            self.assertEqual(await tailer.read_new(), 1)
            self.assertEqual(pipeline.count, 2)
            self.assertEqual(tailer.malformed_lines, 1)

    async def test_database_failure_uses_shared_pipeline(self):
        pipeline = EventPipeline()
        observed = []
        pipeline.subscribe(observed.append)
        created = await ScenarioSimulator(pipeline, seed=7).run(Scenario.DATABASE_FAILURE, count=5)
        self.assertEqual(created, 5)
        self.assertEqual(pipeline.count, 5)
        self.assertEqual(len(observed), 5)
        self.assertTrue(all(event.message == "DBConnectionTimeout" for event in observed))


if __name__ == "__main__":
    unittest.main()
