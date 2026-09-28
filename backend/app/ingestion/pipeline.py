"""Single ingestion boundary shared by files, simulator, and future APIs."""

from __future__ import annotations

import asyncio
from collections import deque
from collections.abc import Awaitable, Callable

from .models import LogEvent

EventConsumer = Callable[[LogEvent], Awaitable[None] | None]


class EventPipeline:
    def __init__(self, recent_limit: int = 2_000) -> None:
        self._events: deque[LogEvent] = deque(maxlen=recent_limit)
        self._consumers: list[EventConsumer] = []
        self._lock = asyncio.Lock()
        self.rejected_events = 0

    def subscribe(self, consumer: EventConsumer) -> None:
        self._consumers.append(consumer)

    async def ingest(self, event: LogEvent) -> None:
        async with self._lock:
            self._events.append(event)
        for consumer in self._consumers:
            result = consumer(event)
            if result is not None:
                await result

    def recent_events(self) -> list[LogEvent]:
        return list(self._events)

    @property
    def count(self) -> int:
        return len(self._events)
