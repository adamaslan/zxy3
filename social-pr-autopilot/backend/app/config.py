import os
from pathlib import Path

from dotenv import load_dotenv


FALSE_VALUES = {"0", "false", "no", "off"}
BACKEND_DIR = Path(__file__).resolve().parents[1]
APP_DIR = Path(__file__).resolve().parents[2]
WORKSPACE_DIR = Path(__file__).resolve().parents[3]
ENV_CANDIDATES = [
    ("workspace .env", WORKSPACE_DIR / ".env"),
    ("app .env", APP_DIR / ".env"),
    ("backend .env", BACKEND_DIR / ".env"),
    ("backend .env.local", BACKEND_DIR / ".env.local"),
]

_LOADED_ENV_LABELS: list[str] = []
_DID_LOAD_ENV = False


def load_env_files() -> list[str]:
    global _DID_LOAD_ENV
    if _DID_LOAD_ENV:
        return list(_LOADED_ENV_LABELS)

    _DID_LOAD_ENV = True
    if os.getenv("SOCIAL_PR_LOAD_DOTENV", "1").lower() in FALSE_VALUES:
        return []

    seen: set[Path] = set()
    for label, path in ENV_CANDIDATES:
        resolved = path.resolve()
        if resolved in seen or not path.exists():
            continue
        seen.add(resolved)
        load_dotenv(path, override=False)
        _LOADED_ENV_LABELS.append(label)
    return list(_LOADED_ENV_LABELS)


load_env_files()


def env_value(*names: str, default: str = "") -> str:
    for name in names:
        value = os.getenv(name)
        if value:
            return value
    return default


def env_source(*names: str) -> str:
    for name in names:
        if os.getenv(name):
            return name
    return ""


def ai_provider_preference() -> str:
    return env_value("AI_PROVIDER", default="mistral").lower()


def deploy_target() -> str:
    return env_value("DEPLOY_TARGET", default="local").lower()


def app_env() -> str:
    return env_value("APP_ENV", default="local").lower()


def ttb8_repo_path() -> str:
    return env_value("TTB8_REPO_PATH", default="")


def ai_news_sources() -> list[str]:
    raw = env_value("AI_NEWS_SOURCES", default="hn,arxiv,hf,blogs")
    return [s.strip() for s in raw.split(",") if s.strip()]


def ai_news_max_candidates() -> int:
    raw = env_value("AI_NEWS_MAX_CANDIDATES", default="5")
    try:
        return max(1, int(raw))
    except ValueError:
        return 5


def ai_news_image_provider() -> str:
    return env_value("AI_NEWS_IMAGE_PROVIDER", default="gemini").lower()


def ai_news_dry_run_default() -> bool:
    return env_value("AI_NEWS_DRY_RUN_DEFAULT", default="false").lower() not in FALSE_VALUES


def config_status() -> dict[str, object]:
    return {
        "app_env": app_env(),
        "deploy_target": deploy_target(),
        "loaded_env_files": load_env_files(),
        "ai_provider": ai_provider_preference(),
    }
