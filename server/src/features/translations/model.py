from sqlalchemy import Column, String
from src.core.db import Base

class Translation(Base):
    __tablename__ = "translations"

    type       = Column(String, primary_key=True)  # "color", "brand" etc
    original   = Column(String, primary_key=True)  # "濃緑"
    translated = Column(String, nullable=True)      # "dark_green"