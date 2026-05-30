"""
models/depot.py — Depot Model
================================
A depot is a physical location where buses are parked and drivers start their day.
Real examples: Noida Sec-37, Anand Vihar, Ghaziabad, Meerut South.
"""

from sqlalchemy import Column, Integer, String, Numeric, Text, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class Depot(Base):
    """
    SQLAlchemy model for the 'depots' table.
    
    __tablename__ tells SQLAlchemy the actual table name in PostgreSQL.
    Each Column corresponds to a database column.
    """
    __tablename__ = "depots"

    id = Column(Integer, primary_key=True, index=True)
    
    # Short code used in registration numbers, route codes, etc.
    # e.g., "DEP-NDA" for Noida, "DEP-AVH" for Anand Vihar
    code = Column(String(10), unique=True, nullable=False)
    
    name = Column(String(100), nullable=False)
    
    # GPS coordinates of the depot's main gate / center
    location_lat = Column(Numeric(10, 7), nullable=False)
    location_lng = Column(Numeric(10, 7), nullable=False)
    
    # GeoJSON polygon string defining the depot boundary
    # Used for geofence detection: "is this bus inside the depot?"
    # Example: '{"type":"Polygon","coordinates":[[[77.3,28.5],[77.31,28.5],...]]}'
    polygon_geojson = Column(Text, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # --- Relationships ---
    # "backref" creates a reverse reference on the other model too
    # So vehicle.depot works, and depot.vehicles works
    vehicles = relationship("Vehicle", back_populates="depot")
    users = relationship("User", back_populates="depot")
    incidents = relationship("Incident", back_populates="depot")

    def __repr__(self):
        return f"<Depot {self.code}: {self.name}>"
