import asyncio
from .cars_job import run_worker

INTERVAL_HOURS = 1

async def scheduled():
    while True:
        try:
            await run_worker()
        except Exception as e:
            print(f"Job failed: {e}")
        await asyncio.sleep(INTERVAL_HOURS * 60 * 60)

if __name__ == "__main__":
    asyncio.run(scheduled())
