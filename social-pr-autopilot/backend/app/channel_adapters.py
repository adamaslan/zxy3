import asyncio
import base64
import json
import os
import time
from datetime import datetime, timezone
from typing import Any

import httpx

from .http_clients import channel_client
from .media import local_path_to_public_jpeg, media_dir
from .models import ChannelAdapterStatus, PublishRequest, PublishResult
from .runtime import check_rate_limit, create_publish_log, record_event, update_publish_log

BLUESKY_SESSION: dict[str, Any] = {}


def adapter_statuses() -> list[ChannelAdapterStatus]:
    return [_status("instagram"), _status("telegram"), _status("bluesky")]


def adapter_diagnostics(channel: str) -> dict[str, Any]:
    status = _status(channel)
    result: dict[str, Any] = {
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
    if channel == "instagram":
        expires_at = os.getenv("INSTAGRAM_TOKEN_EXPIRES_AT", "")
        if expires_at:
            try:
                seconds_left = int(expires_at) - int(time.time())
                result["token_expires_in_days"] = round(seconds_left / 86400, 1)
                if seconds_left < 7 * 86400:
                    result["token_warning"] = "Token expires in less than 7 days — renew now."
            except (ValueError, TypeError):
                result["token_warning"] = "Invalid token expiry format in INSTAGRAM_TOKEN_EXPIRES_AT."
        result["public_base_url"] = os.getenv("INSTAGRAM_PUBLIC_BASE_URL", "") or "NOT SET — ngrok required for local images"
        result["media_dir"] = str(media_dir())
    return result


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
            direct_enabled = _instagram_direct_enabled()
            if not direct_enabled or payload.dry_run:
                external_id = _instagram_export_id(payload)
                next_action = (
                    "Set INSTAGRAM_DIRECT_PUBLISH_ENABLED=true and supply local_image_path or media_url to enable live posting."
                    if not direct_enabled
                    else "Dry run complete. Set dry_run=false to post live."
                )
                status = "dry_run" if payload.dry_run else "exported"
                update_publish_log(log["id"], status, external_id=external_id, next_action=next_action)
                return _result(payload, log["id"], status, limit_message, external_id=external_id, next_action=next_action, diagnostics=diagnostics)
            external_id = await _publish_instagram(payload)
            ig_handle = os.getenv("INSTAGRAM_HANDLE", "")
            profile_hint = f"https://www.instagram.com/{ig_handle}/" if ig_handle else "your Instagram profile"
            next_action = f"Verify the post on the Instagram profile: {profile_hint}"
            update_publish_log(log["id"], "published", external_id=external_id, next_action=next_action)
            return _result(payload, log["id"], "published", limit_message, external_id=external_id, next_action=next_action, diagnostics=diagnostics)

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
    raw_payload = log.get("payload")
    payload_data = raw_payload if isinstance(raw_payload, dict) else _payload_from_preview(log.get("payload_preview", ""))
    payload = PublishRequest(**payload_data)
    return await publish(payload)


def _payload_from_preview(preview: str) -> dict[str, Any]:
    try:
        value = json.loads(preview)
        if isinstance(value, dict):
            return value
    except (json.JSONDecodeError, TypeError):
        pass
    return {"channel": "telegram", "text": str(preview)[:280], "dry_run": True}


def _instagram_export_id(payload: PublishRequest) -> str:
    record_event("instagram_schedule_export_created", channel="instagram", campaign_name=payload.campaign_name)
    return f"instagram-export-{payload.campaign_name.lower().replace(' ', '-')[:40]}"


def _instagram_direct_enabled() -> bool:
    return os.getenv("INSTAGRAM_DIRECT_PUBLISH_ENABLED", "false").lower() not in {"0", "false", "no", "off"}


def _status(channel: str) -> ChannelAdapterStatus:
    direct = _instagram_direct_enabled()
    config = {
        "instagram": {
            "protocol": (
                "Instagram Graph API direct publish (POST /media → poll → media_publish)"
                if direct
                else "Meta Business Suite scheduling export; set INSTAGRAM_DIRECT_PUBLISH_ENABLED=true to enable direct posting"
            ),
            "required": ["INSTAGRAM_BUSINESS_ACCOUNT_ID", "INSTAGRAM_ACCESS_TOKEN", "INSTAGRAM_FACEBOOK_PAGE_ID"],
            "mode": "direct_publish" if direct else "scheduling_export",
            "supports_autopublish": direct,
            "next_action": (
                "Supply local_image_path or media_url and set dry_run=false to post live."
                if direct
                else "Set INSTAGRAM_DIRECT_PUBLISH_ENABLED=true then supply local_image_path or media_url."
            ),
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


def _resolve_instagram_media_url(payload: PublishRequest) -> str:
    """Return a public HTTPS media URL for the payload, resolving local_image_path if needed."""
    if payload.media_url:
        return payload.media_url

    if payload.local_image_path:
        base_url = os.getenv("INSTAGRAM_PUBLIC_BASE_URL", "").rstrip("/")
        if not base_url:
            raise RuntimeError(
                "INSTAGRAM_PUBLIC_BASE_URL is not set. "
                "Run: ngrok http 8102  then set INSTAGRAM_PUBLIC_BASE_URL=https://<id>.ngrok-free.app"
            )
        filename = local_path_to_public_jpeg(payload.local_image_path)
        return f"{base_url}/media/{filename}"

    raise RuntimeError("Provide local_image_path or media_url for Instagram direct publishing.")


async def _check_instagram_quota() -> None:
    """Raise RuntimeError if the account has hit Meta's 100-post daily limit."""
    ig_id = os.getenv("INSTAGRAM_BUSINESS_ACCOUNT_ID")
    token = os.getenv("INSTAGRAM_ACCESS_TOKEN")
    version = os.getenv("INSTAGRAM_GRAPH_API_VERSION", "v25.0")
    response = await channel_client().get(
        f"https://graph.facebook.com/{version}/{ig_id}/content_publishing_limit",
        params={"fields": "config,quota_usage", "access_token": token},
    )
    response.raise_for_status()
    data_list = response.json().get("data", [])
    if not data_list:
        return
    data = data_list[0]
    quota_usage = data.get("quota_usage", 0)
    quota_total = data.get("config", {}).get("quota_total", 100)
    if quota_usage >= quota_total:
        raise RuntimeError(f"Instagram daily quota reached: {quota_usage}/{quota_total} posts in the last 24 hours")


async def _publish_instagram(payload: PublishRequest) -> str:
    """Create a media container, poll until FINISHED, publish. Returns the IG media ID."""
    ig_id = os.getenv("INSTAGRAM_BUSINESS_ACCOUNT_ID")
    token = os.getenv("INSTAGRAM_ACCESS_TOKEN")
    version = os.getenv("INSTAGRAM_GRAPH_API_VERSION", "v25.0")
    base = f"https://graph.facebook.com/{version}"

    if not ig_id or not token:
        raise RuntimeError("INSTAGRAM_BUSINESS_ACCOUNT_ID and INSTAGRAM_ACCESS_TOKEN are required")

    media_url = _resolve_instagram_media_url(payload)
    await _check_instagram_quota()

    # Step 1: create media container
    container_params: dict[str, str] = {
        "image_url": media_url,
        "caption": payload.text[:2200],
        "access_token": token,
    }
    if payload.alt_text:
        container_params["alt_text"] = payload.alt_text[:1000]

    container_response = await channel_client().post(
        f"{base}/{ig_id}/media",
        params=container_params,
    )
    container_response.raise_for_status()
    container_id = container_response.json().get("id")
    if not container_id:
        raise RuntimeError(f"No container id in response: {container_response.text}")

    # Step 2: poll status (max 10 × 6 s = 60 s)
    for _ in range(10):
        status_response = await channel_client().get(
            f"{base}/{container_id}",
            params={"fields": "status_code", "access_token": token},
        )
        status_response.raise_for_status()
        status_code = status_response.json().get("status_code", "")
        if status_code == "FINISHED":
            break
        if status_code in ("ERROR", "EXPIRED"):
            raise RuntimeError(f"Media container failed with status: {status_code}")
        await asyncio.sleep(6)
    else:
        raise RuntimeError("Media container did not reach FINISHED status within 60 seconds")

    # Step 3: publish
    publish_response = await channel_client().post(
        f"{base}/{ig_id}/media_publish",
        params={"creation_id": container_id, "access_token": token},
    )
    publish_response.raise_for_status()
    media_id = publish_response.json().get("id", "")
    if not media_id:
        raise RuntimeError(f"No media id in publish response: {publish_response.text}")

    record_event("instagram_published", channel="instagram", media_id=media_id, media_url=media_url)
    return media_id


async def _publish_telegram(payload: PublishRequest) -> str:
    token = os.getenv("TELEGRAM_BOT_TOKEN")
    chat_id = os.getenv("TELEGRAM_CHAT_ID")
    if not token or not chat_id:
        raise RuntimeError("Telegram credentials missing: TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID are required")
    response = await channel_client().post(
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
    access_jwt, repo = await _bluesky_session(handle, password)
    try:
        record = await _create_bluesky_record(repo, access_jwt, payload.text)
    except httpx.HTTPStatusError as exc:
        if exc.response.status_code != 401:
            raise
        BLUESKY_SESSION.clear()
        access_jwt, repo = await _bluesky_session(handle, password)
        record = await _create_bluesky_record(repo, access_jwt, payload.text)
    return str(record.get("uri", "bluesky-post"))


async def _bluesky_session(handle: str, password: str) -> tuple[str, str]:
    if _cached_bluesky_session_valid(handle):
        return BLUESKY_SESSION["access_jwt"], BLUESKY_SESSION["did"]

    session_response = await channel_client().post(
        "https://bsky.social/xrpc/com.atproto.server.createSession",
        json={"identifier": handle, "password": password},
    )
    session_response.raise_for_status()
    session = session_response.json()
    access_jwt = session.get("accessJwt")
    did = session.get("did")
    if not access_jwt or not did:
        raise ValueError("Invalid Bluesky session response: missing accessJwt or did")

    BLUESKY_SESSION.clear()
    BLUESKY_SESSION.update({
        "handle": handle,
        "access_jwt": access_jwt,
        "did": did,
        "expires_at": _jwt_expires_at(access_jwt),
    })
    return access_jwt, did


def _cached_bluesky_session_valid(handle: str) -> bool:
    expires_at = float(BLUESKY_SESSION.get("expires_at", 0))
    return (
        BLUESKY_SESSION.get("handle") == handle
        and bool(BLUESKY_SESSION.get("access_jwt"))
        and bool(BLUESKY_SESSION.get("did"))
        and expires_at > time.time() + 60
    )


def _jwt_expires_at(token: str) -> float:
    try:
        payload_segment = token.split(".")[1]
        padded = payload_segment + "=" * (-len(payload_segment) % 4)
        payload = json.loads(base64.urlsafe_b64decode(padded))
        exp = payload.get("exp")
        if isinstance(exp, (int, float)):
            return float(exp)
    except (IndexError, ValueError, TypeError, json.JSONDecodeError):
        pass
    return time.time() + 3000


async def _create_bluesky_record(repo: str, access_jwt: str, text: str) -> dict[str, Any]:
    record_response = await channel_client().post(
        "https://bsky.social/xrpc/com.atproto.repo.createRecord",
        headers={"Authorization": f"Bearer {access_jwt}"},
        json={
            "repo": repo,
            "collection": "app.bsky.feed.post",
            "record": {
                "$type": "app.bsky.feed.post",
                "text": text[:300],
                "createdAt": _now_iso(),
            },
        },
    )
    record_response.raise_for_status()
    record = record_response.json()
    if not isinstance(record, dict):
        raise ValueError("Invalid Bluesky record response")
    return record


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
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
