import logging
import os
import time
import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from .ai_providers import generate_text, provider_status
from .ai_news_pipeline import run_ai_news_pipeline
from .channel_adapters import adapter_diagnostics, adapter_statuses, publish, retry_publish
from .http_clients import close_http_clients
from .logging_config import configure_logging
from .media import local_path_to_public_jpeg, media_dir
from .models import AiNewsRunRequest, AiNewsRunResult, CampaignPack, CampaignRequest, ChannelAdapterStatus, PublishRequest, PublishResult
from .runtime import APP_NAME, allowed_origins, debug_snapshot, finish_run, get_publish_log, get_run, list_publish_logs, list_runs, record_event, start_run, uptime_seconds


configure_logging(APP_NAME)
logger = logging.getLogger(APP_NAME)


@asynccontextmanager
async def lifespan(_: FastAPI):
    try:
        yield
    finally:
        await close_http_clients()


app = FastAPI(title="Social PR Autopilot", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve operator-supplied images at /media/<filename>
app.mount("/media", StaticFiles(directory=str(media_dir())), name="media")


@app.middleware("http")
async def add_request_id(request: Request, call_next):
    request_id = request.headers.get("x-request-id", str(uuid.uuid4()))
    started = time.perf_counter()
    try:
        response = await call_next(request)
    except Exception as exc:
        duration_ms = round((time.perf_counter() - started) * 1000, 2)
        record_event("request_failed", level="error", request_id=request_id, method=request.method, path=request.url.path, duration_ms=duration_ms, error=str(exc))
        logger.exception("request_failed", extra={"app": APP_NAME, "event": "request_failed", "request_id": request_id, "method": request.method, "path": request.url.path, "duration_ms": duration_ms, "error": str(exc)})
        raise
    duration_ms = round((time.perf_counter() - started) * 1000, 2)
    response.headers["x-request-id"] = request_id
    logger.info("request_completed", extra={"app": APP_NAME, "event": "request_completed", "request_id": request_id, "method": request.method, "path": request.url.path, "status_code": response.status_code, "duration_ms": duration_ms})
    return response


@app.get("/health")
async def health() -> dict:
    return {"status": "ok", "app": "social-pr-autopilot"}


@app.get("/ready")
async def ready() -> dict:
    return {
        "status": "ready",
        "app": "social-pr-autopilot",
        "uptime_seconds": uptime_seconds(),
        "providers": provider_status(),
    }


@app.get("/api/runs")
async def runs() -> dict:
    return {"runs": list_runs()}


@app.get("/api/runs/{run_id}")
async def run_detail(run_id: str) -> dict:
    run = get_run(run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    return run


@app.get("/debug")
async def debug() -> dict:
    return debug_snapshot()


@app.get("/api/channels", response_model=list[ChannelAdapterStatus])
async def channels() -> list[ChannelAdapterStatus]:
    return adapter_statuses()


@app.get("/api/channels/{channel}/diagnostics")
async def channel_diagnostics(channel: str) -> dict:
    if channel not in {"instagram", "telegram", "bluesky"}:
        raise HTTPException(status_code=404, detail="Channel not supported")
    return adapter_diagnostics(channel)


@app.get("/api/publish-logs")
async def publish_logs() -> dict:
    return {"publish_logs": list_publish_logs()}


@app.post("/api/publish", response_model=PublishResult)
async def publish_endpoint(payload: PublishRequest) -> PublishResult:
    return await publish(payload)


@app.post("/api/publish-logs/{publish_log_id}/retry", response_model=PublishResult)
async def retry_publish_endpoint(publish_log_id: str) -> PublishResult:
    log = get_publish_log(publish_log_id)
    if not log:
        raise HTTPException(status_code=404, detail="Publish log not found")
    return await retry_publish(log)


@app.post("/api/media/prepare")
async def media_prepare(payload: dict) -> dict:
    """Convert a local image to JPEG and return the public URL Meta can fetch.

    Body: {"local_image_path": "/absolute/or/relative/to/public/image.png"}
    Requires INSTAGRAM_PUBLIC_BASE_URL to be set (ngrok URL locally, Cloud Run URL in prod).
    """
    local_path = payload.get("local_image_path", "")
    if not local_path:
        raise HTTPException(status_code=400, detail="local_image_path is required")

    base_url = os.getenv("INSTAGRAM_PUBLIC_BASE_URL", "").rstrip("/")
    if not base_url:
        raise HTTPException(
            status_code=503,
            detail="INSTAGRAM_PUBLIC_BASE_URL is not set. Start ngrok and set it to the https tunnel URL.",
        )

    try:
        filename = local_path_to_public_jpeg(local_path)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    media_url = f"{base_url}/media/{filename}"
    return {"filename": filename, "media_url": media_url}


@app.post("/api/ai-news/run", response_model=AiNewsRunResult)
async def ai_news_run(payload: AiNewsRunRequest) -> AiNewsRunResult:
    return await run_ai_news_pipeline(
        dry_run=payload.dry_run,
        publish=payload.publish,
        source_override=payload.sources,
    )


@app.post("/api/campaign", response_model=CampaignPack)
async def campaign(payload: CampaignRequest) -> CampaignPack:
    run = start_run("campaign", payload.model_dump(mode="json"))
    prompt = f"""
You are an autonomous B2B social and PR launch agent.
Product: {payload.product}
Event: {payload.event}
Audience: {payload.audience}
Launch date: {payload.launch_date}
Channels: {", ".join(payload.channels)}

Create a concise campaign kit with posts, PR pitch, image directions, and a seven-day calendar.
"""
    try:
        text = await generate_text(prompt, purpose="social PR campaign")
        posts = {channel: f"{channel.upper()}: {text[:240]}" for channel in payload.channels}
        pack = CampaignPack(
            run_id=run["id"],
            campaign_name=f"{payload.product} Launch Campaign",
            angle=text[:240],
            posts=posts,
            image_prompts=[
                f"Instagram square visual for {payload.product}: {payload.event}",
                f"Press hero image showing B2B automation workflow for {payload.product}",
            ],
            press_pitch=f"Pitch: {text[:500]}",
            calendar=[
                "Day 1: teaser post and Telegram announcement",
                "Day 2: founder POV thread",
                "Day 3: Instagram carousel",
                "Day 4: PR pitch follow-up",
                "Day 5: customer use-case post",
                "Day 6: behind-the-scenes build note",
                "Day 7: analytics digest and next test",
            ],
            publish_policy={
                "telegram": "autopublish",
                "bluesky": "autopublish after QA",
                "x": "draft first",
                "instagram": "schedule export",
                "press": "human approval",
            },
        )
        finish_run(run["id"], "completed", pack.angle)
        return pack
    except Exception as exc:
        finish_run(run["id"], "failed", "Campaign generation failed", str(exc))
        raise
