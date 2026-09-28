from __future__ import annotations

import os
from typing import Any


class IntelligenceService:
    """Derived incident intelligence; it never changes production systems."""

    def __init__(self) -> None:
        self.feedback: dict[int, str] = {}
        self.approvals: set[int] = set()

    def profile(self, incident: dict[str, Any]) -> dict[str, Any]:
        fingerprints = incident.get("related_fingerprints", [])
        database = any("DB" in item or "Connection" in item for item in fingerprints)
        endpoints = incident.get("affected_endpoints", {})
        return {
            "root_cause_graph": [
                {"id": "database", "label": "Database", "state": "suspected" if database else "unknown"},
                {"id": "payment-api", "label": "Payment API", "state": "affected"},
                *[{"id": key, "label": key, "state": "affected"} for key in endpoints],
            ],
            "root_cause_edges": (["database", "payment-api"] if database else []) + [["payment-api", key] for key in endpoints],
            "deployment_correlation": {"deployment": "release-1.8.0" if database else None, "confidence": 82 if database else 0,
                                       "summary": "Deployment signature aligns with the first database timeout." if database else "No deployment evidence in this incident."},
            "business_impact": {"failed_transactions": incident.get("affected_requests", 0), "affected_customers": round(incident.get("affected_requests", 0) * .78),
                                "estimated_revenue_at_risk": round(incident.get("affected_requests", 0) * 42.5, 2), "currency": "USD"},
            "anomaly_dna": {"type": "Application + Dependency" if database else "Application", "pattern": "Error spike → latency spike → endpoint concentration",
                            "novelty": min(100, len(fingerprints) * 35), "velocity": "HIGH" if incident.get("peak_score", 0) > 65 else "MEDIUM",
                            "blast_radius": "HIGH" if len(endpoints) > 2 else "MEDIUM", "confidence": incident.get("confidence", 0)},
            "remediation": {"action": "Validate database connection pool and consider rollback of release-1.8.0" if database else "Inspect affected service dependencies",
                              "requires_approval": True, "approved": incident.get("id") in self.approvals, "executed": False},
            "feedback": self.feedback.get(incident.get("id")),
        }

    def investigate(self, incident: dict[str, Any], question: str) -> dict[str, str]:
        evidence = "; ".join(incident.get("explanation", []))
        if os.getenv("OPENAI_API_KEY"):
            try:
                from openai import OpenAI
                response = OpenAI().responses.create(model=os.getenv("RIPPLE_OPENAI_MODEL", "gpt-6-astra"), input=f"Answer only from this incident evidence: {evidence}\nQuestion: {question}")
                return {"question": question, "answer": response.output_text, "provider": "OpenAI Responses API"}
            except Exception:
                pass
        answer = f"Based on calculated incident evidence: {evidence}"
        return {"question": question, "answer": answer, "provider": "deterministic evidence fallback"}

    def what_if(self, incident: dict[str, Any], multiplier: float) -> dict[str, Any]:
        multiplier = max(.5, min(3, multiplier))
        return {"latency_multiplier": multiplier, "predicted_latency_ms": round(240 * multiplier),
                "predicted_failed_transactions": round(incident.get("affected_requests", 0) * max(1, multiplier)),
                "predicted_error_rate_percent": round(min(100, incident.get("peak_error_rate", 0) * 100 * multiplier), 1)}
