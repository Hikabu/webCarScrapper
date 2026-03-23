from sqlalchemy import func, asc, desc
from sqlalchemy.orm import Session
from .model import Car
from .schema import CarSchema, FILTER_FIELDS

# Valid fields for sorting
#car_properties for sorting
VALID_SORT_FIELDS = {"total_price", "mileage", "year", "created_at"}

# Map filters to ORM conditions
#car_properties for filtering
FILTER_MAP = {
    "brand":        lambda v: Car.brand.in_(v.split(",")),
    "body_type":    lambda v: Car.body_type.in_(v.split(",")),
    "transmission": lambda v: Car.transmission.in_(v.split(",")),
    "min_price":    lambda v: Car.total_price >= v,
    "max_price":    lambda v: Car.total_price <= v,
    "min_year":     lambda v: Car.year >= v,
    "max_year":     lambda v: Car.year <= v,
    "min_mileage":  lambda v: Car.mileage >= v,
    "max_mileage":  lambda v: Car.mileage <= v,
    "is_new_like":  lambda v: Car.is_new_like == v,
    "non_smoker":   lambda v: Car.non_smoker == v,
    "damaged":      lambda v: Car.damaged == v,
}

def _build_filters(filters: dict):
    """Convert filter dict into SQLAlchemy filter conditions."""
    conditions = []
    for key, value in (filters or {}).items():
        handler = FILTER_MAP.get(key)
        if handler and value is not None:
            try:
                conditions.append(handler(value))
            except (ValueError, TypeError):
                pass
    return conditions

def _build_sort(sort_by: str, sort_order: str):
    """Return SQLAlchemy sort clause."""
    field = sort_by if sort_by in VALID_SORT_FIELDS else "created_at"
    direction = desc if sort_order == "desc" else asc
    return direction(getattr(Car, field))

def get_batch(
    session: Session,
    filters: dict = None,
    sort_by: str = "created_at",
    sort_order: str = "desc",
    page: int = 1,
    page_size: int = 20,
):
    """Return a batch of Car ORM objects and total count."""
    conditions = _build_filters(filters)
    sort = _build_sort(sort_by, sort_order)

    # Count total
    total = session.query(func.count(Car.id)).filter(*conditions).scalar()

    # Fetch batch
    cars = (
        session.query(Car)
        .filter(*conditions)
        .order_by(sort)
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    return cars, total

def get_car_by_id(session: Session, car_id: str):
    """Return a single Car ORM object by ID or None."""
    return session.query(Car).filter(Car.id == car_id).first()

def save_batch(batch: list[dict], session: Session):
    """Save a batch of car dicts to the database."""
    for car_data in batch:
        car = Car(**car_data)
        session.merge(car)
    session.commit()