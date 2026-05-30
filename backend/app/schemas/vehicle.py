"""
schemas/vehicle.py — Vehicle & GPS Schemas
"""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from app.models.vehicle import VehicleStatus


class VehicleOut(BaseModel):
    id: int
    reg_no: str
    depot_id: int
    status: VehicleStatus
    model: Optional[str] = None
    capacity: int

    class Config:
        from_attributes = True


class VehicleWithPosition(VehicleOut):
    """Vehicle + its last known GPS position from Redis cache."""
    last_lat: Optional[float] = None
    last_lng: Optional[float] = None
    last_speed: Optional[float] = None
    last_seen: Optional[str] = None   # ISO timestamp string


class GpsPingOut(BaseModel):
    """Single GPS ping — used in history and live tracking."""
    id: int
    vehicle_id: int
    ts: datetime
    lat: float
    lng: float
    speed_kmh: float
    ignition_on: bool

    class Config:
        from_attributes = True


class GpsPingCreate(BaseModel):
    """Used by the tick script to POST new GPS pings."""
    vehicle_id: int
    lat: float = Field(..., ge=-90, le=90)
    lng: float = Field(..., ge=-180, le=180)
    speed_kmh: float = Field(default=0, ge=0, le=200)
    ignition_on: bool = True
