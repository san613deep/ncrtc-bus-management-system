"""
services/avls_service.py — AVLS Business Logic
================================================
Handles vehicle tracking, GPS history queries, and ping ingestion.
"""

from datetime import date, datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import and_, func

from app.models.vehicle import Vehicle
from app.models.gps_ping import GpsPing
from app.models.user import User
from app.schemas.vehicle import VehicleWithPosition, GpsPingOut, GpsPingCreate
from app.redis_client import (
    cache_vehicle_position,
    get_all_vehicle_positions,
    get_vehicle_position,
)
from app.core.exceptions import NotFoundError, DepotAccessDeniedError


class AVLSService:
    def __init__(self, db: Session):
        self.db = db

    def get_live_vehicles(self, depot_id: int | None = None) -> list[VehicleWithPosition]:
        """
        Return all vehicles with their last known GPS positions.
        Positions come from Redis cache — fast, no GPS table scan.
        
        Called by the frontend every 5 seconds. Must be FAST.
        """
        # Build query
        query = self.db.query(Vehicle)
        if depot_id:
            query = query.filter(Vehicle.depot_id == depot_id)
        
        vehicles = query.all()
        vehicle_ids = [v.id for v in vehicles]
        
        # Bulk-fetch all positions from Redis in ONE round-trip (pipeline)
        positions = get_all_vehicle_positions(vehicle_ids)
        
        result = []
        for vehicle in vehicles:
            pos = positions.get(vehicle.id)
            result.append(VehicleWithPosition(
                id=vehicle.id,
                reg_no=vehicle.reg_no,
                depot_id=vehicle.depot_id,
                status=vehicle.status,
                model=vehicle.model,
                capacity=vehicle.capacity,
                last_lat=float(pos["lat"]) if pos else None,
                last_lng=float(pos["lng"]) if pos else None,
                last_speed=float(pos["speed"]) if pos else None,
                last_seen=pos["ts"] if pos else None,
            ))
        return result

    def get_vehicle(self, vehicle_id: int, current_user: User) -> Vehicle:
        """Get single vehicle, enforcing depot scoping."""
        vehicle = self.db.query(Vehicle).filter(Vehicle.id == vehicle_id).first()
        if not vehicle:
            raise NotFoundError("Vehicle", vehicle_id)
        
        if current_user.is_depot_scoped and vehicle.depot_id != current_user.depot_id:
            raise DepotAccessDeniedError()
        
        return vehicle

    def get_vehicle_history(self, vehicle_id: int, history_date: date,
                            current_user: User) -> list[GpsPingOut]:
        """
        Return all GPS pings for a vehicle on a given date.
        The composite index on (vehicle_id, ts DESC) makes this fast.
        """
        vehicle = self.get_vehicle(vehicle_id, current_user)
        
        # Date range: start of day to end of day in UTC
        start_dt = datetime(history_date.year, history_date.month, history_date.day,
                           0, 0, 0, tzinfo=timezone.utc)
        end_dt = datetime(history_date.year, history_date.month, history_date.day,
                         23, 59, 59, tzinfo=timezone.utc)
        
        pings = (
            self.db.query(GpsPing)
            .filter(
                and_(
                    GpsPing.vehicle_id == vehicle_id,
                    GpsPing.ts >= start_dt,
                    GpsPing.ts <= end_dt,
                )
            )
            .order_by(GpsPing.ts)
            .all()
        )
        return pings

    def ingest_ping(self, ping_data: GpsPingCreate) -> dict:
        """
        Insert a new GPS ping (called by the tick script).
        Also updates the Redis cache with the new position.
        """
        # Verify vehicle exists
        vehicle = self.db.query(Vehicle).filter(
            Vehicle.id == ping_data.vehicle_id
        ).first()
        if not vehicle:
            raise NotFoundError("Vehicle", ping_data.vehicle_id)
        
        # Save to PostgreSQL
        now = datetime.now(timezone.utc)
        ping = GpsPing(
            vehicle_id=ping_data.vehicle_id,
            ts=now,
            lat=ping_data.lat,
            lng=ping_data.lng,
            speed_kmh=ping_data.speed_kmh,
            ignition_on=ping_data.ignition_on,
        )
        self.db.add(ping)
        self.db.commit()
        self.db.refresh(ping)
        
        # Update Redis cache (this is what makes the live map work!)
        cache_vehicle_position(
            vehicle_id=ping_data.vehicle_id,
            lat=float(ping_data.lat),
            lng=float(ping_data.lng),
            speed=float(ping_data.speed_kmh),
            ts=now.isoformat(),
        )
        
        return {"id": ping.id, "ts": now.isoformat()}
