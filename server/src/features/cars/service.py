from . import repository as repo
from .schema import CarSchema, PaginatedResponse, SUMMARY_FIELDS, DETAIL_FIELDS

def list_cars(session, filters, sort_by, sort_order, page, page_size) -> PaginatedResponse:
    cars, total = repo.get_batch(
        session, filters, sort_by, sort_order, page, page_size
    )
    return PaginatedResponse(
        items=[CarSchema.model_validate(c).to_dict(SUMMARY_FIELDS) for c in cars],
        total=total,
        page=page,
        page_size=page_size,
        pages=-(-total // page_size),
    )

def get_car(session, car_id: str):
    car = repo.get_car_by_id(session, car_id)
    if not car:
        return None
    return CarSchema.model_validate(car).to_dict(DETAIL_FIELDS)