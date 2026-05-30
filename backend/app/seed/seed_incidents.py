"""
seed/seed_incidents.py — Seed Sample Incidents
================================================
Creates incidents in various states so the IMS list isn't empty on demo day.
"""

from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from app.models.incident import Incident, IncidentType, IncidentSeverity, IncidentStatus, SLA_HOURS
from app.models.incident_event import IncidentEvent
from app.models.user import User, UserRole
from app.models.vehicle import Vehicle
from app.models.depot import Depot


def seed_incidents(db: Session):
    """Seed sample incidents. Idempotent."""
    existing = db.query(Incident).count()
    if existing > 0:
        print(f"    (Incidents already seeded: {existing} found, skipping)")
        return

    # Get references
    driver = db.query(User).filter(User.username == "driver1").first()
    manager = db.query(User).filter(User.username == "manager1").first()
    vehicle = db.query(Vehicle).first()
    depot = db.query(Depot).filter(Depot.code == "DEP-NDA").first()

    if not all([driver, manager, vehicle, depot]):
        print("    (Missing users/vehicles — seed those first)")
        return

    now = datetime.now(timezone.utc)

    incidents_data = [
        # Open P1 — just happened, no response yet
        {
            "type": IncidentType.BREAKDOWN, "severity": IncidentSeverity.P1,
            "status": IncidentStatus.OPEN,
            "description": "Bus engine failure at Noida Sector 18 intersection. Vehicle unable to move.",
            "created_at": now - timedelta(minutes=30),
            "events": [{"from": None, "to": "open", "note": "Bus engine failure at Noida Sector 18 intersection."}]
        },
        # In Progress P2
        {
            "type": IncidentType.ACCIDENT, "severity": IncidentSeverity.P2,
            "status": IncidentStatus.IN_PROGRESS,
            "description": "Minor collision with auto-rickshaw. No injuries. Vehicle driveable.",
            "created_at": now - timedelta(hours=3),
            "events": [
                {"from": None, "to": "open", "note": "Reported minor collision."},
                {"from": "open", "to": "acknowledged", "note": "Manager acknowledged. Checking insurance."},
                {"from": "acknowledged", "to": "in_progress", "note": "Police report filed. Vehicle being inspected."},
            ]
        },
        # Resolved P3
        {
            "type": IncidentType.COMPLAINT, "severity": IncidentSeverity.P3,
            "status": IncidentStatus.RESOLVED,
            "description": "Passenger complaint: AC not working in bus DL1PC0003.",
            "created_at": now - timedelta(days=1),
            "resolved_at": now - timedelta(hours=2),
            "events": [
                {"from": None, "to": "open", "note": "Passenger complaint received."},
                {"from": "open", "to": "acknowledged", "note": "Forwarded to maintenance."},
                {"from": "acknowledged", "to": "in_progress", "note": "Technician dispatched."},
                {"from": "in_progress", "to": "resolved", "note": "AC unit replaced. Bus back in service."},
            ]
        },
        # Open P2 — unassigned
        {
            "type": IncidentType.OTHER, "severity": IncidentSeverity.P2,
            "status": IncidentStatus.OPEN,
            "description": "Bus driver reported suspicious package left by passenger. Police informed.",
            "created_at": now - timedelta(hours=1),
            "events": [{"from": None, "to": "open", "note": "Suspicious package reported."}]
        },
    ]

    for inc_data in incidents_data:
        sla_hours = SLA_HOURS.get(inc_data["severity"], 24)
        sla_deadline = inc_data["created_at"] + timedelta(hours=sla_hours)

        incident = Incident(
            type=inc_data["type"],
            severity=inc_data["severity"],
            status=inc_data["status"],
            raised_by=driver.id,
            assigned_to=manager.id,
            vehicle_id=vehicle.id,
            depot_id=depot.id,
            description=inc_data["description"],
            created_at=inc_data["created_at"],
            resolved_at=inc_data.get("resolved_at"),
            sla_deadline=sla_deadline,
        )
        db.add(incident)
        db.flush()

        for event_data in inc_data["events"]:
            event = IncidentEvent(
                incident_id=incident.id,
                actor_id=manager.id,
                from_status=event_data["from"],
                to_status=event_data["to"],
                note=event_data["note"],
                ts=inc_data["created_at"],
            )
            db.add(event)

    db.commit()
    print(f"    Created {len(incidents_data)} sample incidents in various states")


