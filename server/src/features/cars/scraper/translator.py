from .dictionary import _type_map
from .cleaning import clean
from .validator import track_unknown

def translate(type_, key, fallback=True):
    if not key or not isinstance(key, str):
        return key
    clean_key = clean(key)
    if not clean_key:
        return key
    map_ = _type_map.get(type_)
    if not map_:
        return clean_key
    value = map_.get(clean_key)
    if not value:
        track_unknown(type_, clean_key)
        return clean_key if fallback else None
    return value