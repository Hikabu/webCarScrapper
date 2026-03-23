from deep_translator import GoogleTranslator
from sqlalchemy.orm import Session
from . import repository
import src.features.cars.scraper.dictionary as dictionary

TRANSLATABLE_TYPES = {"color", "brand", "body_type", "transmission"}

# Maps type → in-memory dict in dictionary.py
TYPE_TO_MAP = {
    "color":        dictionary.color_map,
    "brand":        dictionary.brand_map,
    "body_type":    dictionary.body_type_map,
    "transmission": dictionary.transmission_map,
}

def load_translations_into_memory(session: Session):
    """Call on startup — hydrates in-memory maps from DB."""
    translations = repository.load_all(session)
    for type_, mappings in translations.items():
        map_ = TYPE_TO_MAP.get(type_)
        if map_:
            map_.update(mappings)
    total = sum(len(v) for v in translations.values())

def process_unknowns(session: Session, unknowns: dict) -> set:
    """Returns set of successfully translated originals."""
    if not unknowns:
        return set()

    pending = [
        {"type": type_, "original": original}
        for type_, values in unknowns.items()
        if type_ in TRANSLATABLE_TYPES
        for original in values
    ]
    repository.save_translations(session, pending)

    untranslated = repository.get_untranslated(session)
    if not untranslated:
        load_translations_into_memory(session)
        return set()

    resolved = set()
    for row in untranslated:
        result = _translate_one(row.original)
        if result:
            repository.update_translation(session, row.type, row.original, result)
            repository.backfill_cars(session, row.type, row.original, result)
            map_ = TYPE_TO_MAP.get(row.type)
            if map_:
                map_[row.original] = result
            resolved.add(row.original)
        else:
            print(f"[{row.type}] {row.original} → FAILED (will retry next run)")

    load_translations_into_memory(session)
    return resolved

def _translate_one(text: str) -> str | None:
    import time
    translator = GoogleTranslator(source="ja", target="en")
    for attempt in range(3):
        try:
            result = translator.translate(text)
            if result:
                return result.lower().replace(" ", "_")
        except Exception as e:
            print(f"Attempt {attempt + 1} failed for '{text}': {e}")
            time.sleep(1 * (attempt + 1))  # backoff: 1s, 2s, 3s
    return None
    