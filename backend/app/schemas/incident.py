"""
schemas/incident.py — Incident Schemas
"""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from app.models.incident import IncidentType, IncidentSeverity, IncidentStatus
from app.schemas.auth import UserOut


class IncidentCreate(BaseModel):
    """Body of POST /incidents — raise a new incident."""
    type: IncidentType
    severity: IncidentSeverity
    description: str = Field(..., min_length=10, max_length=2000)
    vehicle_id: Optional[int] = None
    # depot_id is inferred from the current user's depot (enforced in service layer)


class PanicButtonCreate(BaseModel):
    """
    Body of POST /incidents/panic — driver taps the panic button.
    Automatically creates a P1 incident.
    Lat/lng are optional — browser may or may not provide geolocation.
    """
    vehicle_id: int
    lat: Optional[float] = None
    lng: Optional[float] = None
    note: str = "PANIC BUTTON ACTIVATED"


class IncidentStatusUpdate(BaseModel):
    """Body of PATCH /incidents/{id}/status — change incident status."""
    to_status: IncidentStatus
    note: str = Field(..., min_length=5, max_length=1000,
                      description="Required: explain what action was taken")


class IncidentAssign(BaseModel):
    """Body of PATCH /incidents/{id}/assign — assign to a user."""
    assigned_to_id: int
    note: str = Field(default="Incident assigned.", min_length=3)


class IncidentEventOut(BaseModel):
    """Single timeline entry on an incident."""
    id: int
    ts: datetime
    actor: UserOut
    from_status: Optional[str]
    to_status: str
    note: str

    class Config:
        from_attributes = True


class IncidentOut(BaseModel):
    """Full incident detail response."""
    id: int
    type: IncidentType
    severity: IncidentSeverity
    status: IncidentStatus
    description: str
    photo_url: Optional[str]
    vehicle_id: Optional[int]
    depot_id: int
    created_at: datetime
    resolved_at: Optional[datetime]
    sla_deadline: Optional[datetime]
    raiser: UserOut
    assignee: Optional[UserOut]
    events: list[IncidentEventOut] = []

    class Config:
        from_attributes = True


class IncidentListItem(BaseModel):
    """Compact incident for list views (no events, no raiser detail)."""
    id: int
    type: IncidentType
    severity: IncidentSeverity
    status: IncidentStatus
    description: str
    vehicle_id: Optional[int]
    depot_id: int
    created_at: datetime
    sla_deadline: Optional[datetime]
    raiser_name: str       # Just the name, not the full user object

    class Config:
        from_attributes = True
