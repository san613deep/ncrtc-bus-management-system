"""
services/incident_service.py — IMS Business Logic
===================================================
Handles incident lifecycle: creation, status transitions, assignment.

KEY DESIGN: Status State Machine
The valid transitions are:
  open → acknowledged
  acknowledged → in_progress
  in_progress → resolved
  resolved → closed

You CANNOT skip states or go backwards.
This is enforced here, not in the router.
"""

from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session

from app.models.incident import Incident, IncidentStatus, SLA_HOURS
from app.models.incident_event import IncidentEvent
from app.models.user import User
from app.schemas.incident import (
    IncidentCreate, IncidentStatusUpdate, IncidentAssign, PanicButtonCreate
)
from app.core.exceptions import (
    NotFoundError, DepotAccessDeniedError, InvalidStatusTransitionError
)

# Valid state machine transitions
VALID_TRANSITIONS = {
    IncidentStatus.OPEN:         [IncidentStatus.ACKNOWLEDGED],
    IncidentStatus.ACKNOWLEDGED: [IncidentStatus.IN_PROGRESS],
    IncidentStatus.IN_PROGRESS:  [IncidentStatus.RESOLVED],
    IncidentStatus.RESOLVED:     [IncidentStatus.CLOSED],
    IncidentStatus.CLOSED:       [],  # Terminal state — no transitions
}


class IncidentService:
    def __init__(self, db: Session):
        self.db = db

    def list_incidents(self, current_user: User, status=None,
                       severity=None, depot_id=None, mine_only=False):
        query = self.db.query(Incident)
        
        # Depot scoping — managers only see their depot
        if current_user.is_depot_scoped:
            query = query.filter(Incident.depot_id == current_user.depot_id)
        elif depot_id:
            query = query.filter(Incident.depot_id == depot_id)
        
        if status:
            query = query.filter(Incident.status == status)
        if severity:
            query = query.filter(Incident.severity == severity)
        if mine_only:
            query = query.filter(Incident.raised_by == current_user.id)
        
        incidents = query.order_by(Incident.created_at.desc()).all()
        
        # Build list items with raiser name
        result = []
        for inc in incidents:
            result.append({
                "id": inc.id,
                "type": inc.type,
                "severity": inc.severity,
                "status": inc.status,
                "description": inc.description,
                "photo_url": inc.photo_url,
                "vehicle_id": inc.vehicle_id,
                "depot_id": inc.depot_id,
                "created_at": inc.created_at,
                "sla_deadline": inc.sla_deadline,
                "raiser_name": inc.raiser.full_name if inc.raiser else "Unknown",
            })
        return result

    def create_incident(self, data: IncidentCreate, raiser: User) -> Incident:
        """Create a new incident and record the creation event."""
        now = datetime.now(timezone.utc)
        
        # Compute SLA deadline based on severity
        sla_hours = SLA_HOURS.get(data.severity, 24)
        sla_deadline = now + timedelta(hours=sla_hours)
        
        incident = Incident(
            type=data.type,
            severity=data.severity,
            status=IncidentStatus.OPEN,
            raised_by=raiser.id,
            vehicle_id=data.vehicle_id,
            depot_id=raiser.depot_id,  # Infer from raiser's depot
            description=data.description,
            created_at=now,
            sla_deadline=sla_deadline,
        )
        self.db.add(incident)
        self.db.flush()  # Get the ID without committing yet
        
        # Create the first timeline event
        event = IncidentEvent(
            incident_id=incident.id,
            actor_id=raiser.id,
            from_status=None,
            to_status=IncidentStatus.OPEN.value,
            note=data.description,
        )
        self.db.add(event)
        self.db.commit()
        self.db.refresh(incident)
        return incident

    def handle_panic_button(self, data: PanicButtonCreate, driver: User) -> Incident:
        """
        Panic button creates a P1 breakdown incident automatically.
        Pre-fills all possible info.
        """
        from app.models.incident import IncidentType, IncidentSeverity
        create_data = IncidentCreate(
            type=IncidentType.BREAKDOWN,
            severity=IncidentSeverity.P1,
            description=f"🚨 PANIC: {data.note} | Driver: {driver.full_name}",
            vehicle_id=data.vehicle_id,
        )
        return self.create_incident(create_data, driver)

    def get_incident(self, incident_id: int, current_user: User) -> Incident:
        incident = self.db.query(Incident).filter(Incident.id == incident_id).first()
        if not incident:
            raise NotFoundError("Incident", incident_id)
        if current_user.is_depot_scoped and incident.depot_id != current_user.depot_id:
            raise DepotAccessDeniedError()
        return incident

    def update_status(self, incident_id: int, data: IncidentStatusUpdate,
                      actor: User) -> Incident:
        """
        Transition an incident's status.
        Validates the state machine — you can't skip states.
        """
        incident = self.get_incident(incident_id, actor)
        
        # Validate transition
        allowed = VALID_TRANSITIONS.get(incident.status, [])
        if data.to_status not in allowed:
            raise InvalidStatusTransitionError(
                incident.status.value, data.to_status.value
            )
        
        old_status = incident.status
        incident.status = data.to_status
        
        if data.to_status == IncidentStatus.RESOLVED:
            incident.resolved_at = datetime.now(timezone.utc)
        
        # Record the transition in the audit trail
        event = IncidentEvent(
            incident_id=incident.id,
            actor_id=actor.id,
            from_status=old_status.value,
            to_status=data.to_status.value,
            note=data.note,
        )
        self.db.add(event)
        self.db.commit()
        self.db.refresh(incident)
        return incident

    def assign_incident(self, incident_id: int, data: IncidentAssign,
                        actor: User) -> Incident:
        incident = self.get_incident(incident_id, actor)
        incident.assigned_to = data.assigned_to_id
        
        event = IncidentEvent(
            incident_id=incident.id,
            actor_id=actor.id,
            from_status=incident.status.value,
            to_status=incident.status.value,
            note=data.note,
        )
        self.db.add(event)
        self.db.commit()
        self.db.refresh(incident)
        return incident

    async def upload_photo(self, incident_id: int, file, current_user: User) -> dict:
        """Upload photo to local /uploads dir (or S3 in production)."""
        import os, uuid, aiofiles
        
        incident = self.get_incident(incident_id, current_user)
        
        ext = os.path.splitext(file.filename)[1]
        filename = f"incident_{incident_id}_{uuid.uuid4().hex}{ext}"
        filepath = f"/app/uploads/{filename}"
        
        os.makedirs("/app/uploads", exist_ok=True)
        async with aiofiles.open(filepath, "wb") as f:
            content = await file.read()
            await f.write(content)
        
        incident.photo_url = f"/uploads/{filename}"
        self.db.commit()
        return {"photo_url": incident.photo_url}
