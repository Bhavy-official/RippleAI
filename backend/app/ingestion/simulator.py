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
            self._clock += timedelta(seconds=1)
            
            # Base RPS
            rps = int(self._random.uniform(15, 30))
            if scenario == Scenario.TRAFFIC_SURGE:
                rps = int(self._random.uniform(80, 120))
                
            for i in range(rps):
                event_time = self._clock + timedelta(milliseconds=(1000 / rps) * i)
                await self.pipeline.ingest(self._event_for(scenario, event_time))
                
            if interval_seconds:
                await asyncio.sleep(interval_seconds)
        return count

    def _event_for(self, scenario: Scenario, event_time) -> LogEvent:
        # Base realistic event
        endpoint = self._random.choice(["/checkout", "/cart", "/payments", "/login", "/products", "/search"])
        service = "payment-api" if endpoint in {"/checkout", "/payments"} else ("identity-api" if endpoint == "/login" else "storefront")
        status, latency, level, message, ip = 200, self._random.uniform(40, 180), "INFO", "Request completed", None

        # Inject anomalies probabilistically to mix with normal traffic
        if scenario == Scenario.ERROR_SPIKE and self._random.random() < 0.25:
            status, level, message = 500, "ERROR", "UpstreamServiceUnavailable"
        elif scenario == Scenario.DATABASE_FAILURE and self._random.random() < 0.35:
            endpoint, service, status, latency, level, message = "/checkout", "payment-api", 500, self._random.uniform(1200, 2600), "ERROR", "DBConnectionTimeout"
        elif scenario == Scenario.LATENCY_SPIKE and self._random.random() < 0.3:
            latency, level, message = self._random.uniform(1500, 3000), "WARN", "Slow downstream response"
        elif scenario == Scenario.SECURITY_ANOMALY and self._random.random() < 0.1:
            endpoint, service, status, level, message, ip = "/login", "identity-api", 401, "WARN", "Repeated authentication failure", "203.0.113.42"
        elif scenario == Scenario.RECOVERY and self._random.random() < 0.05:
            # mostly normal, occasional slow request simulating recovery
            latency = self._random.uniform(200, 500)

        return LogEvent(event_time, service, endpoint, status, latency, level, message, ip=ip)
