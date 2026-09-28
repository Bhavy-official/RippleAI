"""Scenario producer that emits normalized events through EventPipeline."""

from __future__ import annotations

import asyncio
import random
from datetime import timedelta
from enum import Enum

from .models import LogEvent, utc_now
from .pipeline import EventPipeline


class Scenario(str, Enum):
    NORMAL = "NORMAL"
    ERROR_SPIKE = "ERROR_SPIKE"
    TRAFFIC_SURGE = "TRAFFIC_SURGE"
    DATABASE_FAILURE = "DATABASE_FAILURE"
    LATENCY_SPIKE = "LATENCY_SPIKE"
    SECURITY_ANOMALY = "SECURITY_ANOMALY"
    RECOVERY = "RECOVERY"


class ScenarioSimulator:
    def __init__(self, pipeline: EventPipeline, seed: int | None = None) -> None:
        self.pipeline = pipeline
        self._random = random.Random(seed)
        self._clock = utc_now()

    async def run(self, scenario: Scenario, count: int = 30, interval_seconds: float = 0.0) -> int:
        for _ in range(count):
            await self.pipeline.ingest(self._event_for(scenario))
            if interval_seconds:
                await asyncio.sleep(interval_seconds)
        return count

    def _event_for(self, scenario: Scenario) -> LogEvent:
        endpoint = self._random.choice(["/checkout", "/cart", "/payments", "/login"])
        service = "payment-api" if endpoint in {"/checkout", "/payments"} else "storefront"
        status, latency, level, message, ip = 200, self._random.uniform(80, 240), "INFO", "Request completed", None
        if scenario == Scenario.ERROR_SPIKE:
            status, level, message = 500, "ERROR", "UpstreamServiceUnavailable"
        elif scenario == Scenario.DATABASE_FAILURE:
            endpoint, service, status, latency, level, message = "/checkout", "payment-api", 500, self._random.uniform(1200, 2600), "ERROR", "DBConnectionTimeout"
        elif scenario == Scenario.LATENCY_SPIKE:
            latency, level, message = self._random.uniform(1500, 3000), "WARN", "Slow downstream response"
        elif scenario == Scenario.SECURITY_ANOMALY:
            endpoint, service, status, level, message, ip = "/login", "identity-api", 401, "WARN", "Repeated authentication failure", "203.0.113.42"
        elif scenario == Scenario.RECOVERY:
            endpoint, service, latency, message = "/checkout", "payment-api", self._random.uniform(100, 220), "Service recovered"
        # Advance simulated log time independently of UI animation speed. This lets a
        # recovery scenario exercise real sliding-window expiry during a short demo.
        self._clock += timedelta(seconds=1)
        return LogEvent(self._clock, service, endpoint, status, latency, level, message, ip=ip)
