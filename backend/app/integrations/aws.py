"""Best-effort CloudWatch Logs and SNS publisher, isolated from core processing."""

from __future__ import annotations

import asyncio
import json
import os
from dataclasses import dataclass
from datetime import datetime
from typing import Any


@dataclass(frozen=True)
class AwsConfig:
    region: str | None
    cloudwatch_group: str | None
    cloudwatch_stream: str | None
    sns_topic_arn: str | None

    @classmethod
    def from_environment(cls) -> "AwsConfig":
        return cls(os.getenv("AWS_REGION"), os.getenv("RIPPLE_CLOUDWATCH_LOG_GROUP"),
                   os.getenv("RIPPLE_CLOUDWATCH_LOG_STREAM"), os.getenv("RIPPLE_SNS_TOPIC_ARN"))

    @property
    def enabled(self) -> bool:
        return bool(self.region and ((self.cloudwatch_group and self.cloudwatch_stream) or self.sns_topic_arn))


class AwsAlertPublisher:
    def __init__(self, config: AwsConfig | None = None) -> None:
        self.config = config or AwsConfig.from_environment()
        self.last_error: str | None = None

    @property
    def status(self) -> str:
        if not self.config.enabled:
            return "Local demo mode — AWS integration not configured"
        return self.last_error or "AWS alert publishing configured"

    async def publish(self, incident: dict[str, Any]) -> bool:
        if not self.config.enabled:
            return False
        try:
            await asyncio.to_thread(self._publish_sync, incident)
            return True
        except Exception as exc:  # integration failures must never interrupt detection
            self.last_error = f"AWS publishing unavailable — local demo continues ({type(exc).__name__})"
            return False

    def _publish_sync(self, incident: dict[str, Any]) -> None:
        try:
            import boto3
        except ImportError as exc:
            raise RuntimeError("Install backend/requirements-aws.txt to enable AWS publishing") from exc
        body = json.dumps(incident, default=str)
        started_at = datetime.fromisoformat(str(incident["started_at"]).replace("Z", "+00:00"))
        if self.config.cloudwatch_group and self.config.cloudwatch_stream:
            logs = boto3.client("logs", region_name=self.config.region)
            logs.put_log_events(logGroupName=self.config.cloudwatch_group, logStreamName=self.config.cloudwatch_stream,
                                logEvents=[{"timestamp": int(started_at.timestamp() * 1000), "message": body}])
        if self.config.sns_topic_arn:
            sns = boto3.client("sns", region_name=self.config.region)
            sns.publish(TopicArn=self.config.sns_topic_arn, Subject=f"Ripple Ai incident #{incident['id']}", Message=body)
