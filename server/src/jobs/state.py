from src.core.redis import get_redis

# Keys
LATEST_SCRAPED_ID = "scraper:latest_id"   # first car of last successful run
CHECKPOINT_ID     = "scraper:checkpoint"   # last car saved before a crash
JOB_STATUS        = "scraper:status"       # running | idle | failed

async def get_latest_scraped_id() -> str | None:
    r = await get_redis()
    return await r.get(LATEST_SCRAPED_ID)

async def set_latest_scraped_id(car_id: str):
    r = await get_redis()
    await r.set(LATEST_SCRAPED_ID, car_id)

async def get_checkpoint() -> str | None:
    r = await get_redis()
    return await r.get(CHECKPOINT_ID)

async def set_checkpoint(car_id: str):
    r = await get_redis()
    await r.set(CHECKPOINT_ID, car_id)

async def clear_checkpoint():
    r = await get_redis()
    await r.delete(CHECKPOINT_ID)

async def set_status(status: str):
    r = await get_redis()
    await r.set(JOB_STATUS, status)

async def get_status() -> str:
    r = await get_redis()
    return await r.get(JOB_STATUS) or "idle"