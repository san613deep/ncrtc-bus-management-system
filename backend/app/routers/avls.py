"""
routers/avls.py — AVLS (Automatic Vehicle Location System) Endpoints
======================================================================
GET  /api/v1/vehicles              — list all vehicles with positions
GET  /api/v1/vehicles/live         — all active vehicles + cached positions
GET  /api/v1/vehicles/{id}         — single vehicle detail
GET  /api/v1/vehicles/{id}/history — GPS history for a given date
POST /api/v1/gps/ping              — tick script inserts a new GPS ping [API key]
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from datetime import date
from typing import Optional

from app.schemas.vehicle import VehicleOut, VehicleWithPosition, GpsPingOut, GpsPingCreate
from app.services.avls_service import AVLSService
from app.dependencies.db import get_db
from app.dependencies.auth import get_current_user, require_role, require_tick_api_key
from app.models.user import User

router = APIRouter()


@router.get("/vehicles/live", response_model=list[VehicleWithPosition])
def get_live_vehicles(
    depot_id: Optional[int] = Query(None, description="Filter by depot"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get all vehicles with their last known GPS position (from Redis cache).
    Called by the live map every 5 seconds via polling.
    
    Depot scoping: drivers/managers only see their own depot.
    """
    service = AVLSService(db)
    # Enforce depot scoping
    effective_depot_id = depot_id
    if current_user.is_depot_scoped and not depot_id:
        effective_depot_id = current_user.depot_id
    
    return service.get_live_vehicles(depot_id=effective_depot_id)


@router.get("/vehicles/{vehicle_id}", response_model=VehicleOut)
def get_vehicle(
    vehicle_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get single vehicle details."""
    service = AVLSService(db)
    return service.get_vehicle(vehicle_id, current_user)


@router.get("/vehicles/{vehicle_id}/history", response_model=list[GpsPingOut])
def get_vehicle_history(
    vehicle_id: int,
    history_date: date = Query(..., alias="date", description="Date in YYYY-MM-DD format"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get all GPS pings for a vehicle on a specific date.
    Used by the history page to draw the trip path on the map.
    """
    service = AVLSService(db)
    return service.get_vehicle_history(vehicle_id, history_date, current_user)


@router.post("/gps/ping", status_code=201)
def ingest_gps_ping(
    ping: GpsPingCreate,
    db: Session = Depends(get_db),
    _: bool = Depends(require_tick_api_key),
):
    """
    Insert a new GPS ping.
    PROTECTED: requires the TICK_API_KEY header (not a JWT).
    Only the GPS tick script should call this endpoint.
    """
    service = AVLSService(db)
    return service.ingest_ping(ping)
