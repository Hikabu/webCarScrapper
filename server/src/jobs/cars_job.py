import asyncio
import json

from src.features.cars.scraper.scraper import web_scraping_stream
from src.features.cars.scraper.normalizer import normalize_car
from src.features.cars.scraper.validator import print_unknowns, get_unknowns, clear_resolved
from src.features.translations.service import process_unknowns

from src.core.db import SessionLocal
from src.features.cars.repository import save_batch

from .state import (
    get_latest_scraped_id,
    set_latest_scraped_id,
    get_checkpoint,
    set_checkpoint,
    clear_checkpoint,
    set_status,
)

BATCH_SIZE = 20
MAX_RETRIES = 3
RETRY_DELAY_SECONDS = 10

async def _run_scrape():
    """Core scrape logic — raises on failure so retry wrapper can catch it."""

    latest_id = await get_latest_scraped_id()
    resume_from_id = await get_checkpoint()

    stop_event = asyncio.Event()
    first_car_id = None
    batch = []

    with SessionLocal() as session:
        async for raw in web_scraping_stream(stop_event, resume_from_id):
            
            if latest_id and raw["id"] == latest_id:
                stop_event.set()
                break
            
            try:
                car = normalize_car(raw)
            except Exception as e:
                print(f"Failed to normalize car: {e}")
                continue
            
            if not first_car_id:
                first_car_id = car["id"]

            batch.append(car)

            if len(batch) >= BATCH_SIZE:
                await asyncio.to_thread(save_batch, batch, session)
                await set_checkpoint(car["id"])
                batch.clear()
        
        if batch:
            await asyncio.to_thread(save_batch, batch, session)
            await set_checkpoint(batch[-1]["id"])

        try:
            resolved = process_unknowns(session, get_unknowns())
            clear_resolved(resolved)
        except Exception as e:
            print(f"Failed to process unknowns: {e}")

        print_unknowns()

        if first_car_id:
            await set_latest_scraped_id(first_car_id)
        await clear_checkpoint()

        session.close()


async def run_worker():
    """Runs scrape with retry logic."""
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            await set_status("running")
            await _run_scrape()
            await set_status("idle")
            return

        except Exception as e:
            print(f"Attempt {attempt}/{MAX_RETRIES} failed: {e}")
            await set_status("failed")

            if attempt < MAX_RETRIES:
                wait = RETRY_DELAY_SECONDS * attempt  # backoff: 10s, 20s, 30s
                await asyncio.sleep(wait)
            else:
                raise


if __name__ == "__main__":
    asyncio.run(run_worker())