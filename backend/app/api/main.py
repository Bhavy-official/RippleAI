"""Runnable local API for the Ripple Ai command center."""

from __future__ import annotations

import asyncio
import os
from collections import deque
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Any

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from app.detection.engine import DetectionEngine, DetectionResult
from app.incidents.service import IncidentService
from app.ingestion.models import LogEvent
from app.ingestion.pipeline import EventPipeline
from app.ingestion.simulator import Scenario, ScenarioSimulator
from app.integrations.aws import AwsAlertPublisher
from app.intelligence.service import IntelligenceService


class RippleRuntime:
    def __init__(self) -> None:
        self.pipeline = EventPipeline()
        self.detector = DetectionEngine()
        self.incidents = IncidentService()
        self.simulator = ScenarioSimulator(self.pipeline)
        self.aws = AwsAlertPublisher()
        self.intelligence = IntelligenceService()
        self._published_incidents: set[int] = set()
        self.latest: DetectionResult | None = None
        self.metric_history: deque[dict[str, Any]] = deque(maxlen=120)
        self.current_scenario = Scenario.NORMAL
        self._scenario_task: asyncio.Task | None = None
        self.pipeline.subscribe(self._process)

    async def _process(self, event: LogEvent) -> None:
        self.latest = self.detector.process(event)
        incident = self.incidents.observe(event, self.latest)
        if incident and incident.id not in self._published_incidents:
            self._published_incidents.add(incident.id)
            await self.aws.publish(incident.to_dict())
        self.metric_history.append({
            "timestamp": event.timestamp.isoformat(), "error_rate": round(self.latest.metrics.error_rate * 100, 2),
            "p95_latency": round(self.latest.metrics.p95_latency, 1), "anomaly_score": self.latest.score,
            "requests_per_second": round(self.latest.metrics.requests_per_second, 2),
        })

    async def start_scenario(self, scenario: Scenario) -> None:
        self.current_scenario = scenario
        if self._scenario_task and not self._scenario_task.done():
            self._scenario_task.cancel()
        # A timed producer makes escalation visibly animate in the actual dashboard.
        if scenario == Scenario.NORMAL:
            count, interval = 10, 0.2
        elif scenario == Scenario.RECOVERY:
            # Seventy simulated seconds are enough to let the 60-second detector
            # window expire a preceding failure while still playing quickly.
            count, interval = 70, 0.12
        else:
            count, interval = 40, 0.12
        self._scenario_task = asyncio.create_task(self.simulator.run(scenario, count=count, interval_seconds=interval))

    def snapshot(self) -> dict[str, Any]:
        now = datetime.now(timezone.utc).isoformat()
        if self.latest is None:
            metrics: dict[str, Any] = {"total_requests": 0, "error_rate": 0, "p95_latency": 0, "requests_per_second": 0}
            score, severity, warming_up = 0, "NORMAL", True
            baseline = None
        else:
            metrics = self.latest.metrics.to_dict()
            metrics["observed_at"] = self.latest.metrics.observed_at.isoformat()
            score, severity, warming_up = self.latest.score, self.latest.severity.value, self.latest.warming_up
            baseline = self.latest.to_dict()["baseline"]
        return {
            "server_time": now, "system_status": "LEARNING" if warming_up else severity,
            "scenario": self.current_scenario.value, "metrics": metrics, "baseline": baseline,
            "anomaly_score": score, "metric_history": list(self.metric_history),
            "incidents": [item.to_dict() for item in reversed(self.incidents.incidents)],
            "active_incidents": len(self.incidents.active_incidents), "aws_status": self.aws.status,
        }


runtime = RippleRuntime()


@asynccontextmanager
async def lifespan(_: FastAPI):
    await runtime.start_scenario(Scenario.NORMAL)
    yield
    if runtime._scenario_task:
        runtime._scenario_task.cancel()


app = FastAPI(title="Ripple Ai", version="0.1.0", lifespan=lifespan)
allowed_origins = os.getenv("RIPPLE_CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174").split(",")
app.add_middleware(CORSMiddleware, allow_origins=allowed_origins,
                   allow_credentials=True, allow_methods=["*"], allow_headers=["*"])


@app.get("/api/state")
async def state() -> dict[str, Any]:
    return runtime.snapshot()


@app.post("/api/scenarios/{scenario}")
async def trigger_scenario(scenario: str) -> dict[str, str]:
    try:
        selected = Scenario(scenario.upper())
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=f"Unknown scenario: {scenario}") from exc
    await runtime.start_scenario(selected)
    return {"scenario": selected.value, "status": "started"}


@app.get("/api/incidents/{incident_id}")
async def incident_for_replay(incident_id: int) -> dict[str, Any]:
    for incident in runtime.incidents.incidents:
        if incident.id == incident_id:
            payload = incident.to_dict()
            payload["intelligence"] = runtime.intelligence.profile(payload)
            return payload
    raise HTTPException(status_code=404, detail=f"Incident {incident_id} not found")


def _incident_or_404(incident_id: int) -> dict[str, Any]:
    for incident in runtime.incidents.incidents:
        if incident.id == incident_id:
            return incident.to_dict()
    raise HTTPException(status_code=404, detail=f"Incident {incident_id} not found")


@app.post("/api/incidents/{incident_id}/investigate")
async def investigate(incident_id: int, body: dict[str, str]) -> dict[str, str]:
    return runtime.intelligence.investigate(_incident_or_404(incident_id), body.get("question", "What changed?"))


@app.post("/api/incidents/{incident_id}/what-if")
async def what_if(incident_id: int, body: dict[str, float]) -> dict[str, Any]:
    return runtime.intelligence.what_if(_incident_or_404(incident_id), float(body.get("latency_multiplier", 1)))


@app.post("/api/incidents/{incident_id}/feedback/{label}")
async def feedback(incident_id: int, label: str) -> dict[str, str]:
    if label not in {"TRUE_POSITIVE", "FALSE_POSITIVE", "EXPECTED_BEHAVIOR"}:
        raise HTTPException(status_code=400, detail="Unsupported feedback label")
    _incident_or_404(incident_id)
    runtime.intelligence.feedback[incident_id] = label
    return {"feedback": label}


@app.post("/api/incidents/{incident_id}/remediation/approve")
async def approve_remediation(incident_id: int) -> dict[str, str]:
    _incident_or_404(incident_id)
    runtime.intelligence.approvals.add(incident_id)
    return {"status": "approved_for_human_execution", "executed": "false"}


@app.websocket("/ws")
async def websocket_updates(websocket: WebSocket) -> None:
    await websocket.accept()
    try:
        while True:
            await websocket.send_json(runtime.snapshot())
            await asyncio.sleep(0.35)
    except WebSocketDisconnect:
        return
