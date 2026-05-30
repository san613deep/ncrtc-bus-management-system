"""
models/vehicle.py — Vehicle Model
====================================
A vehicle is a physical bus. It belongs to one depot.
Registration number format: DL 1 PC 0001 (Delhi registration)
"""

import enum
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class VehicleStatus(str, enum.Enum):
    IDLE = "idle"               # Parked at depot, no active duty
    ON_DUTY = "on_duty"         # Currently on a trip
    MAINTENANCE = "maintenance" # In the workshop
    OFF = "off"                 # End of day / decommissioned


class Vehicle(Base):
    __tablename__ = "vehicles"

    id = Column(Integer, primary_key=True, index=True)
    
    # Registration number — unique identifier on the physical bus
    # Format: DL1PC0001 (no spaces in DB, display with spaces in UI)
    reg_no = Column(String(20), unique=True, nullable=False, index=True)
    
    depot_id = Column(Integer, ForeignKey("depots.id"), nullable=False)
    
    status = Column(Enum(VehicleStatus, values_callable=lambda x: [e.value for e in x]), default=VehicleStatus.IDLE, nullable=False)
    
    model = Column(String(50), nullable=True)   # e.g., "Tata Starbus Ultra"
    capacity = Column(Integer, default=40)      # Passenger capacity
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # --- Relationships ---
    depot = relationship("Depot", back_populates="vehicles")
    gps_pings = relationship("GpsPing", back_populates="vehicle",
                             order_by="GpsPing.ts.desc()")
    incidents = relationship("Incident", back_populates="vehicle")

    def __repr__(self):
        return f"<Vehicle {self.reg_no} [{self.status}]>"
