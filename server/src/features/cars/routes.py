from fastapi import APIRouter, Depends, Query
from src.core.db import SessionLocal
from . import controller
from src.core.dependencies import require_admin

router = APIRouter(prefix="/cars", tags=["cars"])


def get_session_sync():
    """Sync DB session dependency"""
    with SessionLocal() as session:
        yield session


@router.get("", dependencies=[Depends(require_admin)])
def list_cars(
    brand: str | None           = Query(None),
    body_type: str | None       = Query(None),
    transmission: str | None    = Query(None),
    min_price: int | None       = Query(None),
    max_price: int | None       = Query(None),
    min_year: int | None        = Query(None),
    max_year: int | None        = Query(None),
    min_mileage: int | None     = Query(None),
    max_mileage: int | None     = Query(None),
    is_new_like: bool | None    = Query(None),
    non_smoker: bool | None     = Query(None),
    damaged: bool | None        = Query(None),
    sort_by: str                = Query("created_at"),
    sort_order: str             = Query("desc", pattern="^(asc|desc)$"),
    page: int                   = Query(1, ge=1),
    page_size: int              = Query(20, ge=1, le=100),
    session = Depends(get_session_sync),
):
    filters = {
        "brand": brand,
        "body_type": body_type,
        "transmission": transmission,
        "min_price": min_price,
        "max_price": max_price,
        "min_year": min_year,
        "max_year": max_year,
        "min_mileage": min_mileage,
        "max_mileage": max_mileage,
        "is_new_like": is_new_like,
        "non_smoker": non_smoker,
        "damaged": damaged,
    }
    return controller.get_cars(
        session,
        filters=filters,
        sort_by=sort_by,
        sort_order=sort_order,
        page=page,
        page_size=page_size,
    )


@router.get("/{car_id}", dependencies=[Depends(require_admin)])
def get_car(car_id: str, session = Depends(get_session_sync)):
    return controller.get_car(session, car_id)