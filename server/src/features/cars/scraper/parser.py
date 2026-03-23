import re
from bs4 import BeautifulSoup

#car_properties

def _get_text(el, selector):
    found = el.select_one(selector)
    return found.get_text(strip=True) if found else None

def _get_price_num(main, selector):
    """Extract clean numeric string from a price element."""
    el = main.select_one(selector)
    if not el:
        return None
    # get_text pulls through nested <font> tags fine
    # but the sibling subPriceNum span has a zero-width space — strip it
    text = el.get_text(strip=True).replace('\u200b', '').replace('\xa0', '')
    match = re.search(r'[\d.]+', text)
    return match.group() if match else None

def _parse_price(el, selector):
    """Grab only the main price number, ignoring sub spans and unit spans."""
    container = el.select_one(selector)
    if not container:
        return None
    main = container.select_one(f"{selector.split('.')[-1].split('__')[0] if '__' in selector else ''}__mainPriceNum, .totalPrice__mainPriceNum, .basePrice__mainPriceNum")
    # Simpler: just get the element directly and strip whitespace/zero-width chars
    text = container.get_text(strip=True)
    # Remove zero-width spaces and non-breaking spaces
    text = text.replace('\u200b', '').replace('\xa0', '').strip()
    # Extract numeric part only (e.g. "116.6" from "116.6​")
    match = re.search(r'[\d.]+', text)
    return match.group() if match else None


def parse_page(html):
    soup = BeautifulSoup(html, "html.parser")
    cars = []

    for car_el in soup.select(".cassette"):
        main = car_el.select_one(".cassetteMain")
        if not main:
            continue

        # ID
        car_id = car_el.get("id", "")
        if car_id:
            car_id = car_id.replace("_cas", "")
        if not car_id:
            link = main.select_one(".cassetteMain__title a")
            if link:
                import re
                match = re.search(r'detail/(.*?)/', link.get("href", ""))
                if match:
                    car_id = match.group(1)

        def get_text(selector):
            el = main.select_one(selector)
            return el.get_text(strip=True) if el else None

        brand = get_text(".cassetteMain__carInfoContainer > p")
        title = get_text(".cassetteMain__title")
        description = get_text(".cassetteMain__subText")

        total_price   = _get_price_num(main, ".totalPrice__mainPriceNum")
        vehicle_price = _get_price_num(main, ".basePrice__mainPriceNum")
        
        body_info = [
            el.get_text(strip=True)
            for el in main.select(".carBodyInfoList__item")
        ]

        specs = {}
        for row in main.select(".specList__detailBox"):
            key_el = row.select_one(".specList__title")
            val_el = row.select_one(".specList__data")
            if key_el and val_el:
                specs[key_el.get_text(strip=True)] = val_el.get_text(strip=True)

        img_el = main.select_one(".cassetteMain__mainImg img")
        image = None
        if img_el:
            image = img_el.get("data-original") or img_el.get("src")
            if image and image.startswith("//"):
                image = "https:" + image

        cars.append({
            #car_properties
            "id": car_id,
            "brand": brand,
            "title": title,
            "description": description,
            "total_price": total_price,
            "vehicle_price": vehicle_price,
            "bodyInfo": body_info,
            "specs": specs,
            "image": image,
        })

    # Next page
    next_page = None
    next_btn = soup.select_one(".pager__btn__next")
    if next_btn:
        import re
        onclick = next_btn.get("onclick", "")
        match = re.search(r"'(.*?)'", onclick)
        if match:
            next_page = "https://www.carsensor.net" + match.group(1)

    return cars, next_page