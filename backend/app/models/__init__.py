"""
models/__init__.py
==================
Import all models here so Alembic can discover them for migrations.
When Alembic runs `alembic revision --autogenerate`, it imports this
file and sees all your tables.
"""

from app.models.depot import Depot
from app.models.user import User
from app.models.vehicle import Vehicle
from app.models.gps_ping import GpsPing
from app.models.incident import Incident
from app.models.incident_event import IncidentEvent
from app.models.notice import Notice
from app.models.notice_read import NoticeRead

__all__ = [
    "Depot", "User", "Vehicle", "GpsPing",
    "Incident", "IncidentEvent", "Notice", "NoticeRead",
]
