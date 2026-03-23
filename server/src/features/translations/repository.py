from sqlalchemy.orm import Session
from sqlalchemy import update
from .model import Translation
from src.features.cars.model import Car

TRANSLATABLE_FIELDS = ["color", "brand", "body_type", "transmission"]

def load_all(session: Session) -> dict:
    """Returns { "color": {"濃緑": "dark_green"}, ... }"""
    rows = session.query(Translation).all()
    result = {}
    for row in rows:
        result.setdefault(row.type, {})[row.original] = row.translated
    return result

def get_untranslated(session: Session) -> list[Translation]:
    return session.query(Translation).filter(Translation.translated == None).all()

def save_translations(session: Session, translations: list[dict]):
    for t in translations:
        existing = session.get(Translation, (t["type"], t["original"]))
        if not existing:
            session.add(Translation(type=t["type"], original=t["original"]))
        # don't overwrite approved translations
    session.commit()

def update_translation(session: Session, type_: str, original: str, translated: str):
    row = session.get(Translation, (type_, original))
    if row:
        row.translated = translated
        session.commit()

def backfill_cars(session: Session, type_: str, original: str, translated: str):
    raw_col   = f"{type_}_raw"
    trans_col = type_
    session.execute(
        update(Car)
        .where(getattr(Car, raw_col) == original)
        .where(getattr(Car, trans_col) == None)
        .values({trans_col: translated})
    )
    session.commit()