"""JSON-lines parser with explicit, non-fatal malformed input handling."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any

from .models import LogEvent, utc_now


class EventParseError(ValueError):
    """A line cannot be safely normalized into a log event."""


def parse_log_line(line: str) -> LogEvent:
    try:
        raw = json.loads(line)
    except json.JSONDecodeError as exc:
        raise EventParseError("Expected one JSON object per log line") from exc
    if not isinstance(raw, dict):
        raise EventParseError("Log line must contain a JSON object")
    return normalize_event(raw)


def normalize_event(raw: dict[str, Any]) -> LogEvent:
    try:
        timestamp = _parse_timestamp(raw.get("timestamp"))
        service = _required_text(raw, "service")
        endpoint = str(raw.get("endpoint", "/unknown")).strip() or "/unknown"
        status = int(raw.get("status", 200))
        latency_ms = float(raw.get("latency_ms", 0))
        level = str(raw.get("level", "INFO")).upper()
        message = str(raw.get("message", "")).strip() or "No message"
    except (TypeError, ValueError) as exc:
        raise EventParseError(f"Invalid log event: {exc}") from exc
    if not 100 <= status <= 599:
        raise EventParseError("status must be an HTTP status between 100 and 599")
    if latency_ms < 0:
        raise EventParseError("latency_ms cannot be negative")

    known = {"timestamp", "service", "endpoint", "status", "latency_ms", "level", "message", "ip", "request_id", "deployment_id", "metadata"}
    metadata = dict(raw.get("metadata") or {})
    metadata.update({key: value for key, value in raw.items() if key not in known})
    return LogEvent(timestamp, service, endpoint, status, latency_ms, level, message,
                    _optional_text(raw.get("ip")), _optional_text(raw.get("request_id")),
                    _optional_text(raw.get("deployment_id")), metadata)


def _parse_timestamp(value: Any) -> datetime:
    if value is None:
        return utc_now()
    parsed = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    return parsed.replace(tzinfo=timezone.utc) if parsed.tzinfo is None else parsed.astimezone(timezone.utc)


def _required_text(raw: dict[str, Any], field: str) -> str:
    value = str(raw.get(field, "")).strip()
    if not value:
        raise ValueError(f"{field} is required")
    return value


def _optional_text(value: Any) -> str | None:
    return str(value).strip() if value is not None and str(value).strip() else None
