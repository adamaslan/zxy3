import httpx


_AI_CLIENT: httpx.AsyncClient | None = None
_CHANNEL_CLIENT: httpx.AsyncClient | None = None


def ai_client() -> httpx.AsyncClient:
    global _AI_CLIENT
    if _AI_CLIENT is None or _AI_CLIENT.is_closed:
        _AI_CLIENT = httpx.AsyncClient(timeout=45)
    return _AI_CLIENT


def channel_client() -> httpx.AsyncClient:
    global _CHANNEL_CLIENT
    if _CHANNEL_CLIENT is None or _CHANNEL_CLIENT.is_closed:
        _CHANNEL_CLIENT = httpx.AsyncClient(timeout=30)
    return _CHANNEL_CLIENT


async def close_http_clients() -> None:
    global _AI_CLIENT, _CHANNEL_CLIENT
    if _AI_CLIENT is not None and not _AI_CLIENT.is_closed:
        await _AI_CLIENT.aclose()
    if _CHANNEL_CLIENT is not None and not _CHANNEL_CLIENT.is_closed:
        await _CHANNEL_CLIENT.aclose()
    _AI_CLIENT = None
    _CHANNEL_CLIENT = None
