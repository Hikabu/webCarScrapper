import os
import redis.asyncio as redis

REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379")

_client = None

async def get_redis() -> redis.Redis:
    global _client
    if not _client:
        _client = redis.from_url(REDIS_URL, decode_responses=True)
    return _client