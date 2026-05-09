import asyncio
import logging
from collections.abc import Awaitable, Callable
from typing import Any

import httpx

from .config import ai_provider_preference, config_status, deploy_target, env_source, env_value
from .runtime import APP_NAME, record_event


logger = logging.getLogger(APP_NAME)


def provider_status() -> dict[str, Any]:
    return {
        "selected_provider": ai_provider_preference(),
        "provider_order": _provider_order(),
        "gemini_configured": bool(_gemini_key()),
        "mistral_configured": bool(_mistral_key()),
        "mistral_key_source": env_source("MISTRAL_API_KEY", "MISTRAL_KEY") or "not_configured",
        "gemini_model": _gemini_model(),
        "mistral_model": _mistral_model(),
        "max_attempts": _max_attempts(),
        "deployment": config_status(),
    }


async def generate_text(prompt: str, *, purpose: str) -> str:
    keys = {"gemini": _gemini_key(), "mistral": _mistral_key()}
    last_error: Exception | None = None
    attempted = False

    for provider in _provider_order():
        api_key = keys[provider]
        if not api_key:
            record_event("ai_provider_missing_key", level="warning", provider=provider, purpose=purpose)
            continue
        attempted = True
        try:
            if provider == "gemini":
                return await _with_retries(lambda: _gemini(prompt, api_key), provider)
            return await _with_retries(lambda: _mistral(prompt, api_key), provider)
        except Exception as exc:
            last_error = exc
            record_event("ai_provider_fallback", level="warning", provider=provider, error=str(exc), purpose=purpose)

    if attempted and last_error:
        raise last_error

    record_event("ai_demo_mode_used", level="warning", purpose=purpose)
    return f"Demo {purpose}: campaign generated with social posts, PR pitch, and calendar."


async def _gemini(prompt: str, api_key: str) -> str:
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{_gemini_model()}:generateContent"
    payload: dict[str, Any] = {"contents": [{"parts": [{"text": prompt}]}]}
    async with httpx.AsyncClient(timeout=45) as client:
        response = await client.post(url, json=payload, headers={"x-goog-api-key": api_key})
        response.raise_for_status()
        return response.json()["candidates"][0]["content"]["parts"][0]["text"]


async def _mistral(prompt: str, api_key: str) -> str:
    payload = {"model": _mistral_model(), "messages": [{"role": "user", "content": prompt}]}
    async with httpx.AsyncClient(timeout=45) as client:
        response = await client.post(
            "https://api.mistral.ai/v1/chat/completions",
            json=payload,
            headers={"Authorization": f"Bearer {api_key}"},
        )
        response.raise_for_status()
        return response.json()["choices"][0]["message"]["content"]


async def _with_retries(call: Callable[[], Awaitable[str]], provider: str) -> str:
    last_exc: Exception | None = None
    for attempt in range(1, _max_attempts() + 1):
        record_event("ai_provider_attempt", provider=provider, attempt=attempt)
        try:
            result = await call()
            record_event("ai_provider_success", provider=provider, attempt=attempt)
            return result
        except Exception as exc:
            last_exc = exc
            record_event("ai_provider_error", level="warning", provider=provider, attempt=attempt, error=str(exc))
            if attempt < _max_attempts():
                await asyncio.sleep(0.75 * attempt)
    raise last_exc  # type: ignore[misc]


def _provider_order() -> list[str]:
    preference = ai_provider_preference()
    if preference == "demo":
        return []
    if preference == "auto":
        return ["gemini", "mistral"] if deploy_target() == "gcp" else ["mistral", "gemini"]
    if preference == "gemini":
        return ["gemini", "mistral"]
    return ["mistral", "gemini"]


def _gemini_key() -> str:
    return env_value("GEMINI_API_KEY")


def _mistral_key() -> str:
    return env_value("MISTRAL_API_KEY", "MISTRAL_KEY")


def _gemini_model() -> str:
    return env_value("GEMINI_MODEL", default="gemini-2.0-flash")


def _mistral_model() -> str:
    return env_value("MISTRAL_MODEL", default="mistral-small-latest")


def _max_attempts() -> int:
    return int(env_value("AI_MAX_ATTEMPTS", default="2"))
