"""
models/incident.py — Incident Model
=======================================
An incident is anything that went wrong: breakdown, accident, complaint, etc.

Status workflow (state machine):
  open → acknowledged → in_progress → resolved → closed
  
  Every status change is recorded in incident_events (the audit trail).
  You CANNOT skip states or go backwards — enforced in the service layer.

SLA (Service Level Agreement) deadlines:
  P1 (Critical): Must be acknowledged within 1 hour
  P2 (High):     Must be acknowledged within 4 hours  
  P3 (Normal):   Must be acknowledged within 24 hours
"""

import enum
from sqlalchemy import (Column, Integer, String, Text, ForeignKey, DateTime,
                        Enum, Index)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class IncidentType(str, enum.Enum):
    BREAKDOWN = "breakdown"
    ACCIDENT = "accident"
    COMPLAINT = "complaint"
    OTHER = "other"


class IncidentSeverity(str, enum.Enum):
    P1 = "P1"  # Critical — 1 hour SLA
    P2 = "P2"  # High — 4 hour SLA
    P3 = "P3"  # Normal — 24 hour SLA


class IncidentStatus(str, enum.Enum):
    OPEN = "open"
    ACKNOWLEDGED = "acknowledged"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"
    CLOSED = "closed"


# SLA hours per severity — used to compute sla_deadline on create
SLA_HOURS = {
    IncidentSeverity.P1: 1,
    IncidentSeverity.P2: 4,
    IncidentSeverity.P3: 24,
}


class Incident(Base):
    __tablename__ = "incidents"

    id = Column(Integer, primary_key=True, index=True)
    
    type = Column(Enum(IncidentType, values_callable=lambda x: [e.value for e in x]), nullable=False)
    severity = Column(Enum(IncidentSeverity, values_callable=lambda x: [e.value for e in x]), nullable=False)
    status = Column(Enum(IncidentStatus, values_callable=lambda x: [e.value for e in x]), default=IncidentStatus.OPEN, nullable=False)
    
    # Who raised this incident (driver, manager, anyone)
    raised_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Which manager is handling it (can be NULL until acknowledged)
    assigned_to = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # Optionally linked to a specific bus
    vehicle_id = Column(Integer, ForeignKey("vehicles.id"), nullable=True)
    
    # Which depot this incident belongs to
    # (derived from the vehicle or the raising user's depot)
    depot_id = Column(Integer, ForeignKey("depots.id"), nullable=False)
    
    description = Column(Text, nullable=False)
    
    # URL to an uploaded photo (stored in S3 or local /uploads)
    photo_url = Column(String(500), nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    
    # Computed from severity on creation: NOW() + SLA_HOURS[severity]
    # Used for the SLA countdown timer in the UI
    sla_deadline = Column(DateTime(timezone=True), nullable=True)

    # --- Relationships ---
    raiser = relationship("User", foreign_keys=[raised_by],
                          back_populates="raised_incidents")
    assignee = relationship("User", foreign_keys=[assigned_to],
                            back_populates="assigned_incidents")
    vehicle = relationship("Vehicle", back_populates="incidents")
    depot = relationship("Depot", back_populates="incidents")
    events = relationship("IncidentEvent", back_populates="incident",
                          order_by="IncidentEvent.ts")

    # --- Indexes ---
    __table_args__ = (
        Index("idx_incident_status_depot", "status", "depot_id"),
    )

    def __repr__(self):
        return f"<Incident #{self.id} [{self.severity}] {self.status}>"
