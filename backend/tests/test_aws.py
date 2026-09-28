import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.integrations.aws import AwsAlertPublisher, AwsConfig


class AwsAdapterTests(unittest.IsolatedAsyncioTestCase):
    async def test_unconfigured_aws_remains_in_local_demo_mode(self):
        publisher = AwsAlertPublisher(AwsConfig(None, None, None, None))
        self.assertFalse(publisher.config.enabled)
        self.assertIn("Local demo mode", publisher.status)
        self.assertFalse(await publisher.publish({"id": 1}))


if __name__ == "__main__":
    unittest.main()
