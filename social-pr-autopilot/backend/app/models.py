from typing import Literal

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# AI News Pipeline models
# ---------------------------------------------------------------------------


class Story(BaseModel, frozen=True):
    url: str
    title: str
    summary: str
    source: str
    published_at: str = ""


class ArticleSection(BaseModel, frozen=True):
    heading: str
    paragraphs: list[str]


class Article(BaseModel, frozen=True):
    title: str
    slug: str
    subtitle: str
    og_description: str
    keywords: list[str]
    sections: list[ArticleSection]
    image_prompt: str


class AiNewsRunRequest(BaseModel):
    dry_run: bool = Field(default=True)
    publish: bool = Field(default=True)
    sources: list[str] | None = None


class AiNewsRunResult(BaseModel):
    run_id: str
    status: str
    story_url: str = ""
    story_title: str = ""
    article_slug: str = ""
    route_file: str = ""
    image_filename: str = ""
    image_provider_used: str = ""
    caption: str = ""
    publish_log_id: str = ""
    media_id: str = ""
    dry_run: bool = True
    error: str = ""


class CampaignRequest(BaseModel):
    product: str = Field(default="Autonomous Growth Agent")
    event: str
    audience: str = Field(default="B2B SaaS founders and operators")
    launch_date: str = Field(default="next week")
    channels: list[str] = Field(default_factory=lambda: ["instagram", "telegram", "bluesky", "x", "press"])


class CampaignPack(BaseModel):
    run_id: str
    automation_state: str = Field(default="drafted")
    risk_level: str = Field(default="medium")
    campaign_name: str
    angle: str
    posts: dict[str, str]
    image_prompts: list[str]
    press_pitch: str
    calendar: list[str]
    publish_policy: dict[str, str]


Channel = Literal["instagram", "telegram", "bluesky"]


class PublishRequest(BaseModel):
    channel: Channel
    text: str
    campaign_name: str = Field(default="Untitled Campaign")
    image_prompt: str | None = None
    local_image_path: str | None = None   # path or filename under frontend/public/
    media_url: str | None = None          # public HTTPS URL (overrides local_image_path)
    alt_text: str | None = None           # image alt text, max 1000 chars
    link_url: str | None = None
    dry_run: bool = Field(default=True)


class PublishResult(BaseModel):
    publish_log_id: str
    channel: Channel
    status: str
    dry_run: bool
    external_id: str = ""
    error: str = ""
    rate_limit: str
    retryable: bool = False
    next_action: str = ""
    diagnostics: dict = Field(default_factory=dict)
    payload: dict


class ChannelAdapterStatus(BaseModel):
    channel: Channel
    configured: bool
    mode: str
    rate_limit: str
    supports_autopublish: bool
    protocol: str
    required_config: list[str] = Field(default_factory=list)
    missing_config: list[str] = Field(default_factory=list)
    next_action: str = ""
