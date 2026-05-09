"""Contract tests for the Social PR backend."""

import os
import sys
from pathlib import Path

from fastapi.testclient import TestClient

os.environ["SOCIAL_PR_LOAD_DOTENV"] = "0"
os.environ["AI_PROVIDER"] = "demo"
for key in ("GEMINI_API_KEY", "MISTRAL_API_KEY", "MISTRAL_KEY"):
    os.environ.pop(key, None)
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
for module_name in list(sys.modules):
    if module_name == "app" or module_name.startswith("app."):
        del sys.modules[module_name]

from app.main import app  # noqa: E402


client = TestClient(app)


def test_mistral_key_alias(monkeypatch) -> None:
    from app.ai_providers import provider_status

    monkeypatch.setenv("AI_PROVIDER", "mistral")
    monkeypatch.setenv("MISTRAL_KEY", "local-test-key")
    monkeypatch.delenv("MISTRAL_API_KEY", raising=False)

    status = provider_status()
    assert status["selected_provider"] == "mistral"
    assert status["mistral_configured"] is True
    assert status["mistral_key_source"] == "MISTRAL_KEY"


def test_health_and_ready() -> None:
    assert client.get("/health").json()["status"] == "ok"
    ready = client.get("/ready").json()
    assert ready["status"] == "ready"
    assert "providers" in ready
    assert ready["providers"]["selected_provider"] == "demo"
    assert ready["providers"]["mistral_configured"] is False
    debug = client.get("/debug").json()
    assert debug["app"] == "social-pr-autopilot"
    assert "recent_events" in debug


def test_campaign_creates_run() -> None:
    response = client.post("/api/campaign", json={"event": "Launching a PR automation agent."})
    assert response.status_code == 200
    payload = response.json()
    assert payload["run_id"]
    assert payload["automation_state"] == "drafted"

    runs = client.get("/api/runs").json()["runs"]
    assert any(run["id"] == payload["run_id"] for run in runs)


def test_channel_statuses_and_dry_run_publish() -> None:
    channels = client.get("/api/channels")
    assert channels.status_code == 200
    channel_ids = {item["channel"] for item in channels.json()}
    assert {"instagram", "telegram", "bluesky"} <= channel_ids
    telegram = client.get("/api/channels/telegram/diagnostics").json()
    assert "TELEGRAM_BOT_TOKEN" in telegram["required_config"]

    response = client.post(
        "/api/publish",
        json={
            "channel": "telegram",
            "text": "Phase 2 dry-run Telegram post",
            "campaign_name": "Phase 2 Test",
            "dry_run": True,
        },
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "dry_run"
    assert payload["publish_log_id"]
    assert payload["retryable"] is False
    assert payload["diagnostics"]["protocol"] == "Telegram Bot API sendMessage"
    assert payload["next_action"]

    logs = client.get("/api/publish-logs").json()["publish_logs"]
    saved_log = next(log for log in logs if log["id"] == payload["publish_log_id"])
    assert saved_log["next_action"]
    assert "missing_config" in saved_log["diagnostics"]


def test_instagram_scheduling_export() -> None:
    response = client.post(
        "/api/publish",
        json={
            "channel": "instagram",
            "text": "Instagram caption for a launch",
            "campaign_name": "Launch Week",
            "image_prompt": "Clean SaaS launch visual",
            "dry_run": False,
        },
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "exported"
    assert payload["payload"]["format"] == "scheduling_export"
    assert payload["next_action"]
