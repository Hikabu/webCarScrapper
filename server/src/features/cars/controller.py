from fastapi import HTTPException
from . import service

def _build_filters(raw_filters: dict) -> dict:
    return {k: v for k, v in raw_filters.items() if v is not None}

def get_cars(session, filters: dict, sort_by: str, sort_order: str, page: int, page_size: int):
    clean_filters = _build_filters(filters)
    return service.list_cars(session, clean_filters, sort_by, sort_order, page, page_size)

def get_car(session, car_id: str):
    car = service.get_car(session, car_id)
    if not car:
        raise HTTPException(status_code=404, detail="Car not found")
    return car