"""Reusable error normalization for stable incident signatures."""

from __future__ import annotations

import re

_UUID = re.compile(r"\b[0-9a-f]{8}-[0-9a-f-]{27,}\b", re.IGNORECASE)
_IP = re.compile(r"\b(?:\d{1,3}\.){3}\d{1,3}\b")
_NUMBER = re.compile(r"\b\d+\b")
_WHITESPACE = re.compile(r"\s+")


def fingerprint(message: str) -> str:
    normalized = _UUID.sub("<*>", message)
    normalized = _IP.sub("<*>", normalized)
    normalized = _NUMBER.sub("<*>", normalized)
    return _WHITESPACE.sub(" ", normalized).strip()
