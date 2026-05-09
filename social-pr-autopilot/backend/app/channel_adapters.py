import os
from typing import Any

import httpx

from .models import ChannelAdapterStatus, PublishRequest, PublishResult
from .runtime import check_rate_limit, create_publish_log, record_event, update_publish_log


def adapter_statuses() -> list[ChannelAdapterStatus]:
    return [_status("instagram"), _status("telegram"), _status("bluesky")]


def adapter_diagnostics(channel: str) -> dict[str, Any]:
    status = _status(channel)
    return {
        "channel": channel,
        "protocol": status.protocol,
        "configured": status.configured,
        "mode": status.mode,
        "required_config": status.required_config,
        "missing_config": status.missing_config,
        "rate_limit": status.rate_limit,
        "supports_autopublish": status.supports_autopublish,
        "next_action": status.next_action,
    }


async def publish(payload: PublishRequest) -> PublishResult:
    ok, limit_message = check_rate_limit(payload.channel)
    diagnostics = adapter_diagnostics(payload.channel)
    log = create_publish_log(payload.channel, payload.model_dump(mode="json"), payload.dry_run, diagnostics)

    if not ok:
        next_action = "Wait for the rate-limit window to reset or lower automation frequency."
        update_publish_log(log["id"], "rate_limited", error=limit_message, retryable=True, next_action=next_action)
        return _result(
            payload,
            log["id"],
            "rate_limited",
            limit_message,
            error=limit_message,
            retryable=True,
            next_action=next_action,
            diagnostics=diagnostics,
        )

    try:
        if payload.channel == "instagram":
            external_id = _instagram_export_id(payload)
            next_action = "Upload/schedule this export in Meta Business Suite or connect Instagram Graph API credentials."
            update_publish_log(log["id"], "exported", external_id=external_id, next_action=next_action)
            return _result(payload, log["id"], "exported", limit_message, external_id=external_id, next_action=next_action, diagnostics=diagnostics)

        if payload.dry_run:
            external_id = f"dry-run-{payload.channel}-{log['id']}"
            next_action = f"Set dry_run=false after configuring {payload.channel} credentials and approval policy."
            update_publish_log(log["id"], "dry_run", external_id=external_id, next_action=next_action)
            return _result(payload, log["id"], "dry_run", limit_message, external_id=external_id, next_action=next_action, diagnostics=diagnostics)

        if payload.channel == "telegram":
            external_id = await _publish_telegram(payload)
            next_action = "Verify message in target Telegram chat."
            update_publish_log(log["id"], "published", external_id=external_id, next_action=next_action)
            return _result(payload, log["id"], "published", limit_message, external_id=external_id, next_action=next_action, diagnostics=diagnostics)

        if payload.channel == "bluesky":
            external_id = await _publish_bluesky(payload)
            next_action = "Verify post URI on Bluesky profile."
            update_publish_log(log["id"], "published", external_id=external_id, next_action=next_action)
            return _result(payload, log["id"], "published", limit_message, external_id=external_id, next_action=next_action, diagnostics=diagnostics)
    except Exception as exc:
        next_action = _next_action_for_error(payload.channel, str(exc), diagnostics)
        update_publish_log(log["id"], "failed", error=str(exc), retryable=True, next_action=next_action, response_preview=str(exc))
        return _result(
            payload,
            log["id"],
            "failed",
            limit_message,
            error=str(exc),
            retryable=True,
            next_action=next_action,
            diagnostics=diagnostics,
        )

    next_action = "Use instagram, telegram, or bluesky."
    update_publish_log(log["id"], "failed", error="Unsupported channel", next_action=next_action)
    return _result(payload, log["id"], "failed", limit_message, error="Unsupported channel", next_action=next_action, diagnostics=diagnostics)


async def retry_publish(log: dict[str, Any]) -> PublishResult:
    payload = PublishRequest(**_payload_from_preview(log["payload_preview"]))
    return await publish(payload)


def _payload_from_preview(preview: str) -> dict[str, Any]:
    # The preview is deliberately plain str(dict) for operator readability.
    # Retry uses a conservative fallback if the preview cannot be parsed.
    import ast

    try:
        value = ast.literal_eval(preview)
        if isinstance(value, dict):
            return value
    except Exception:
        pass
    return {"channel": "telegram", "text": preview[:280], "dry_run": True}


def _instagram_export_id(payload: PublishRequest) -> str:
    record_event("instagram_schedule_export_created", channel="instagram", campaign_name=payload.campaign_name)
    return f"instagram-export-{payload.campaign_name.lower().replace(' ', '-')[:40]}"


def _status(channel: str) -> ChannelAdapterStatus:
    config = {
        "instagram": {
            "protocol": "Meta Business Suite export now; Instagram Graph API credentials reserved for direct publish",
            "required": ["INSTAGRAM_BUSINESS_ACCOUNT_ID", "INSTAGRAM_ACCESS_TOKEN", "INSTAGRAM_FACEBOOK_PAGE_ID"],
            "mode": "scheduling_export",
            "supports_autopublish": False,
            "next_action": "Use export mode now; add Instagram business account, Facebook page, and access token before direct publishing.",
        },
        "telegram": {
            "protocol": "Telegram Bot API sendMessage",
            "required": ["TELEGRAM_BOT_TOKEN", "TELEGRAM_CHAT_ID"],
            "mode": "autopublish_or_dry_run",
            "supports_autopublish": True,
            "next_action": "Create a bot, add it to the target chat/channel, set TELEGRAM_CHAT_ID, then set dry_run=false.",
        },
        "bluesky": {
            "protocol": "AT Protocol com.atproto.server.createSession + com.atproto.repo.createRecord",
            "required": ["BLUESKY_HANDLE", "BLUESKY_APP_PASSWORD"],
            "mode": "autopublish_or_dry_run",
            "supports_autopublish": True,
            "next_action": "Create an app password for the handle, configure credentials, then set dry_run=false.",
        },
    }[channel]
    missing = [name for name in config["required"] if not os.getenv(name)]
    configured = len(missing) == 0 or channel == "instagram"
    return ChannelAdapterStatus(
        channel=channel,  # type: ignore[arg-type]
        configured=configured,
        mode=config["mode"],
        rate_limit=_rate_limit_label(channel),
        supports_autopublish=config["supports_autopublish"],
        protocol=config["protocol"],
        required_config=config["required"],
        missing_config=missing,
        next_action="" if configured and channel != "instagram" else config["next_action"],
    )


async def _publish_telegram(payload: PublishRequest) -> str:
    token = os.getenv("TELEGRAM_BOT_TOKEN")
    chat_id = os.getenv("TELEGRAM_CHAT_ID")
    if not token or not chat_id:
        raise RuntimeError("Telegram credentials missing: TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID are required")
    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.post(
            f"https://api.telegram.org/bot{token}/sendMessage",
            json={"chat_id": chat_id, "text": payload.text, "disable_web_page_preview": False},
        )
        response.raise_for_status()
        data = response.json()
    return str(data.get("result", {}).get("message_id", "telegram-message"))


async def _publish_bluesky(payload: PublishRequest) -> str:
    handle = os.getenv("BLUESKY_HANDLE")
    password = os.getenv("BLUESKY_APP_PASSWORD")
    if not handle or not password:
        raise RuntimeError("Bluesky credentials missing: BLUESKY_HANDLE and BLUESKY_APP_PASSWORD are required")
    async with httpx.AsyncClient(timeout=30) as client:
        session_response = await client.post(
            "https://bsky.social/xrpc/com.atproto.server.createSession",
            json={"identifier": handle, "password": password},
        )
        session_response.raise_for_status()
        session = session_response.json()
        record_response = await client.post(
            "https://bsky.social/xrpc/com.atproto.repo.createRecord",
            headers={"Authorization": f"Bearer {session['accessJwt']}"},
            json={
                "repo": session["did"],
                "collection": "app.bsky.feed.post",
                "record": {
                    "$type": "app.bsky.feed.post",
                    "text": payload.text[:300],
                    "createdAt": _now_iso(),
                },
            },
        )
        record_response.raise_for_status()
        record = record_response.json()
    return str(record.get("uri", "bluesky-post"))


def _next_action_for_error(channel: str, error: str, diagnostics: dict[str, Any]) -> str:
    if diagnostics.get("missing_config"):
        return f"Set missing config: {', '.join(diagnostics['missing_config'])}."
    if "401" in error or "Unauthorized" in error:
        return "Refresh credentials/app password and confirm account permissions."
    if "403" in error or "Forbidden" in error:
        return "Confirm account role, business permissions, and channel write access."
    if "429" in error:
        return "Back off publishing schedule and inspect platform rate limits."
    if channel == "telegram":
        return "Confirm bot is a member/admin of the target chat and TELEGRAM_CHAT_ID is correct."
    if channel == "bluesky":
        return "Confirm handle/app password pair and AT Protocol service availability."
    if channel == "instagram":
        return "Use scheduling export now; verify business account/page/token before direct publishing."
    return "Inspect adapter diagnostics and retry after fixing configuration."


def _result(
    payload: PublishRequest,
    log_id: str,
    status: str,
    rate_limit: str,
    *,
    external_id: str = "",
    error: str = "",
    retryable: bool = False,
    next_action: str = "",
    diagnostics: dict[str, Any] | None = None,
) -> PublishResult:
    return PublishResult(
        publish_log_id=log_id,
        channel=payload.channel,
        status=status,
        dry_run=payload.dry_run,
        external_id=external_id,
        error=error,
        rate_limit=rate_limit,
        retryable=retryable,
        next_action=next_action,
        diagnostics=diagnostics or adapter_diagnostics(payload.channel),
        payload=_channel_payload(payload),
    )


def _channel_payload(payload: PublishRequest) -> dict[str, Any]:
    if payload.channel == "instagram":
        return {
            "caption": payload.text,
            "image_prompt": payload.image_prompt,
            "link_url": payload.link_url,
            "format": "scheduling_export",
        }
    return {"text": payload.text, "link_url": payload.link_url}


def _rate_limit_label(channel: str) -> str:
    return os.getenv(f"{channel.upper()}_RATE_LIMIT", "10/3600")


def _now_iso() -> str:
    from datetime import datetime, timezone

    return datetime.now(timezone.utc).isoformat()
