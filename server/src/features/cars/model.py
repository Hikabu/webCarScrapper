from sqlalchemy import Column, String, Integer, Boolean, JSON, DateTime
from sqlalchemy.orm import declarative_base
from sqlalchemy.sql import func
from src.core.db import Base


class Car(Base):
    __tablename__ = "cars"

    id = Column(String, primary_key=True)
    
    #car_properties + raw_car_properties

    brand = Column(String)
    brand_raw = Column(String)
    total_price = Column(Integer)
    vehicle_price = Column(Integer)

    body_type = Column(String)
    body_type_raw = Column(String)
    color = Column(String)
    color_raw = Column(String)
    image = Column(String)

    features = Column(JSON)  # list of strings

    year = Column(Integer)
    mileage = Column(Integer)
    inspection = Column(String, nullable=True)

    repair_history = Column(String)
    warranty = Column(String)
    maintenance = Column(String)

    engine_cc = Column(Integer)
    transmission = Column(String)
    transmission_raw = Column(String)

    is_new_like = Column(Boolean)
    non_smoker = Column(Boolean)
    damaged = Column(Boolean)

    created_at = Column(DateTime, server_default=func.now())

