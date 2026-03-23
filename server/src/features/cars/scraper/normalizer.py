import re
from .translator import translate
import src.features.cars.scraper.dictionary as dictionary
from .cleaning import clean

def normalize_mileage(value):
    if not value: return None
    if '万' in value:
        return round(float(re.search(r'[\d.]+', value).group()) * 10000)
    digits = re.sub(r'[^\d]', '', value)
    return int(digits) if digits else None

def normalize_price(value):
    if not value: return None
    match = re.search(r'[\d.]+', value)
    return round(float(match.group()) * 10000) if match else None

def normalize_year(value):
    if not value: return None
    match = re.search(r'\d{4}', value)
    return int(match.group()) if match else None

def normalize_inspection(value):
    if not value: return None
    match = re.search(r'(\d{4}).*?(\d{2})月', value)
    return f"{match.group(1)}-{match.group(2)}-01" if match else None

def normalize_engine_cc(value):
    if not value: return None
    digits = re.sub(r'[^\d]', '', value)
    return int(digits) if digits else None

def normalize_specs(specs):
    processed = {}
    for key, value in (specs or {}).items():
        mapped_key = translate(dictionary.types.SPEC_KEY, clean(key))
        processed[mapped_key] = clean(value)

    processed['mileage']       = normalize_mileage(processed.get('mileage'))
    processed['year']          = normalize_year(processed.get('year'))
    processed['inspection']    = normalize_inspection(processed.get('inspection'))
    processed['engine_cc']     = normalize_engine_cc(processed.get('engine_cc'))
    processed['transmission']  = translate(dictionary.types.TRANSMISSION, processed.get('transmission'), fallback=False)
    processed['transmission_raw'] = clean(processed.get('transmission')) if not processed['transmission'] else None
    processed['repair_history'] = translate(dictionary.types.SPEC_VALUE, processed.get('repair_history'))
    processed['warranty']      = translate(dictionary.types.SPEC_VALUE, processed.get('warranty'))
    processed['maintenance']   = translate(dictionary.types.SPEC_VALUE, processed.get('maintenance'))
    return processed

def normalize_features(text):
    if not text: return []
    return [en for jp, en in dictionary.feature_map.items() if jp in text]

def normalize_condition(text):
    if not text: return {}
    return {
        'is_new_like': '届出済未使用車' in text,
        'non_smoker':  '禁煙車' in text,
        'damaged':     '雹害車' in text,
    }

def normalize_car(car):
    text = f"{car.get('title', '')} {car.get('description', '')}"

    body_info = car.get('bodyInfo', [])
    brand_raw    = car.get('brand')
    color_raw    = body_info[1] if len(body_info) > 1 else None
    body_type_raw = body_info[0] if body_info else None

    brand     = translate(dictionary.types.BRAND,     brand_raw,     fallback=False)
    color     = translate(dictionary.types.COLOR,     color_raw,     fallback=False)
    body_type = translate(dictionary.types.BODY_TYPE, body_type_raw, fallback=False)

    specs = normalize_specs(car.get('specs', {}))

    return {
        'id':             car['id'],
        'brand':          brand,
        'brand_raw':      brand_raw     if not brand     else None,
        'color':          color,
        'color_raw':      color_raw     if not color     else None,
        'body_type':      body_type,
        'body_type_raw':  body_type_raw if not body_type else None,
        'image':          car.get('image'),
        'features':       normalize_features(text),
        'total_price': normalize_price(car.get('total_price')),
        'vehicle_price': normalize_price(car.get('vehicle_price')),
        **specs,
        **normalize_condition(text),
    }