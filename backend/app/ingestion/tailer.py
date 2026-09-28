"""Efficient append-only JSONL file reader; it tracks an offset, never rereads a file."""

from __future__ import annotations

import asyncio
from pathlib import Path

from .parser import EventParseError, parse_log_line
from .pipeline import EventPipeline


class LogFileTailer:
    def __init__(self, path: Path, pipeline: EventPipeline, start_at_end: bool = False) -> None:
        self.path = path
        self.pipeline = pipeline
        self.offset = path.stat().st_size if start_at_end and path.exists() else 0
        self.malformed_lines = 0

    async def read_new(self) -> int:
        if not self.path.exists():
            return 0
        size = self.path.stat().st_size
        if size < self.offset:  # file rotation/truncation
            self.offset = 0
        with self.path.open("r", encoding="utf-8") as log_file:
            log_file.seek(self.offset)
            lines = log_file.readlines()
            self.offset = log_file.tell()
        accepted = 0
        for line in lines:
            if not line.strip():
                continue
            try:
                await self.pipeline.ingest(parse_log_line(line))
                accepted += 1
            except EventParseError:
                self.malformed_lines += 1
                self.pipeline.rejected_events += 1
        return accepted

    async def watch(self, poll_interval_seconds: float = 0.25) -> None:
        while True:
            await self.read_new()
            await asyncio.sleep(poll_interval_seconds)
