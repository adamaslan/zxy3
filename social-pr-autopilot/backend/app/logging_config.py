import json
import logging
import os
import sys
from datetime import datetime, timezone
from typing import Any


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        payload: dict[str, Any] = {
            "ts": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname.lower(),
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "line": record.lineno,
        }
        for key in (
            "app",
            "request_id",
            "method",
            "path",
            "status_code",
            "duration_ms",
            "run_id",
            "event",
            "kind",
            "error",
            "status",
            "provider",
            "attempt",
            "purpose",
            "channel",
            "publish_log_id",
            "campaign_name",
            "config_value",
            "default_value",
            "response_preview",
        ):
            value = getattr(record, key, None)
            if value is not None:
                payload[key] = value
        if record.exc_info:
            payload["exception"] = self.formatException(record.exc_info)
        return json.dumps(payload, default=str)


def configure_logging(app_name: str) -> None:
    level = os.getenv("LOG_LEVEL", "INFO").upper()
    root = logging.getLogger()
    root.handlers.clear()
    root.setLevel(level)
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(JsonFormatter())
    root.addHandler(handler)
    logging.getLogger(app_name).info("logging_configured", extra={"app": app_name, "event": "logging_configured"})
