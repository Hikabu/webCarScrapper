from pydantic import BaseModel
from typing import Optional, List

# ── Field sets ────────────────────────────────────────────────
# Change what appears in summary/details here, nowhere else
#car_properties
SUMMARY_FIELDS = {"id", "brand", "total_price", "image", "year", "mileage", "body_type", "color"}
DETAIL_FIELDS  = SUMMARY_FIELDS | {
    "vehicle_price", "features", "inspection", "repair_history",
    "warranty", "maintenance", "engine_cc", "transmission",
    "is_new_like", "non_smoker", "damaged"
}

# All filterable fields and their types — single source of truth
FILTER_FIELDS = {
    "brand":        str,
    "body_type":    str,
    "transmission": str,
    "min_price":    int,
    "max_price":    int,
    "min_year":     int,
    "max_year":     int,
    "min_mileage":  int,
    "max_mileage":  int,
    "is_new_like":  bool,
    "non_smoker":   bool,
    "damaged":      bool,
}

# ── Single Car schema ─────────────────────────────────────────
class CarSchema(BaseModel):
    id: str
    #car_properties
    brand: Optional[str] = None
    total_price: Optional[int] = None
    vehicle_price: Optional[int] = None
    image: Optional[str] = None
    body_type: Optional[str] = None
    color: Optional[str] = None
    features: Optional[List[str]] = None
    year: Optional[int] = None
    mileage: Optional[int] = None
    inspection: Optional[str] = None
    repair_history: Optional[str] = None
    warranty: Optional[str] = None
    maintenance: Optional[str] = None
    engine_cc: Optional[int] = None
    transmission: Optional[str] = None
    is_new_like: Optional[bool] = None
    non_smoker: Optional[bool] = None
    damaged: Optional[bool] = None

    model_config = {"from_attributes": True}

    def to_dict(self, fields: set) -> dict:
        return {k: v for k, v in self.model_dump().items() if k in fields}

class PaginatedResponse(BaseModel):
    items: List[dict]
    total: int
    page: int
    page_size: int
    pages: int