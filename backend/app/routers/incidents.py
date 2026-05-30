"""
routers/incidents.py — IMS (Incident Management System) Endpoints
"""

from fastapi import APIRouter, Depends, Query, UploadFile, File
from sqlalchemy.orm import Session
from typing import Optional

from app.schemas.incident import (
    IncidentCreate, IncidentOut, IncidentListItem,
    IncidentStatusUpdate, IncidentAssign, PanicButtonCreate
)
from app.services.incident_service import IncidentService
from app.dependencies.db import get_db
from app.dependencies.auth import get_current_user, require_role
from app.models.user import User
from app.models.incident import IncidentStatus, IncidentSeverity

router = APIRouter(prefix="/incidents")


@router.get("", response_model=list[IncidentListItem])
def list_incidents(
    status: Optional[IncidentStatus] = Query(None),
    severity: Optional[IncidentSeverity] = Query(None),
    depot_id: Optional[int] = Query(None),
    mine_only: bool = Query(False, alias="mine"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    List incidents with optional filters.
    Depot-scoped users automatically see only their depot's incidents.
    """
    service = IncidentService(db)
    return service.list_incidents(
        current_user=current_user,
        status=status,
        severity=severity,
        depot_id=depot_id,
        mine_only=mine_only,
    )


@router.post("", response_model=IncidentOut, status_code=201)
def create_incident(
    body: IncidentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Raise a new incident. Any logged-in user can raise an incident."""
    service = IncidentService(db)
    return service.create_incident(body, current_user)


@router.post("/panic", response_model=IncidentOut, status_code=201)
def panic_button(
    body: PanicButtonCreate,
    current_user: User = Depends(require_role("driver", "conductor")),
    db: Session = Depends(get_db),
):
    """
    Driver panic button — creates a P1 (critical) incident automatically.
    Only drivers and conductors can use this endpoint.
    """
    service = IncidentService(db)
    return service.handle_panic_button(body, current_user)


@router.get("/{incident_id}", response_model=IncidentOut)
def get_incident(
    incident_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get full incident detail including the status change timeline."""
    service = IncidentService(db)
    return service.get_incident(incident_id, current_user)


@router.patch("/{incident_id}/status", response_model=IncidentOut)
def update_incident_status(
    incident_id: int,
    body: IncidentStatusUpdate,
    current_user: User = Depends(require_role("depot_manager", "control_operator", "admin")),
    db: Session = Depends(get_db),
):
    """
    Change incident status.
    Requires: depot_manager, control_operator, or admin.
    A note is mandatory — explains what action was taken.
    """
    service = IncidentService(db)
    return service.update_status(incident_id, body, current_user)


@router.patch("/{incident_id}/assign", response_model=IncidentOut)
def assign_incident(
    incident_id: int,
    body: IncidentAssign,
    current_user: User = Depends(require_role("depot_manager", "control_operator", "admin")),
    db: Session = Depends(get_db),
):
    """Assign an incident to a specific user."""
    service = IncidentService(db)
    return service.assign_incident(incident_id, body, current_user)


@router.post("/{incident_id}/photo", status_code=201)
async def upload_photo(
    incident_id: int,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Upload a photo for an incident (stored in S3 or local /uploads)."""
    service = IncidentService(db)
    return await service.upload_photo(incident_id, file, current_user)
