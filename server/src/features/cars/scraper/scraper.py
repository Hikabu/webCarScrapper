import asyncio
from playwright.async_api import async_playwright
from .parser import parse_page
import random

BASE_URL = "https://www.carsensor.net/usedcar/index.html?KW="

async def web_scraping_stream(stop_event, resume_from_id: str = None):
    """
    Yields raw car dicts one by one.
    - resume_from_id: skip cars until we find this ID, then start yielding
    - stop_event: set externally to stop early
    """
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True, args=[
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
            "--disable-gpu",
        ])
        page = await browser.new_page()
        current_url = BASE_URL
        resuming = resume_from_id is not None

        try: 
            while current_url:
                if stop_event.is_set():
                    break

                try:
                    await page.goto(current_url, wait_until="domcontentloaded", timeout=30000)
                    await page.wait_for_selector(".cassette", timeout=10000)
                except Exception as e:
                    break

                html = await page.content()
                cars, next_page = parse_page(html)

                if not cars:
                    break

                for car in cars:
                    if stop_event.is_set():
                        break

                    if resuming:
                        if car["id"] == resume_from_id:
                            resuming = False
                        continue

                    yield car

                current_url = next_page
                # current_url = None

                await asyncio.sleep(random.uniform(1,3))

        finally:
            await browser.close()

    #set first car id to newest car id (redis)