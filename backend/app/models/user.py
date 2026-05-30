"""
models/user.py — User Model
==============================
All five roles share one table. The 'role' column tells us which role a user has.
This is called the "single-table inheritance" pattern (simpler than separate tables).

The five roles from the PRD:
- driver: Sees own duty, acknowledges it, panic button, reads notices
- conductor: Similar to driver — assigned alongside driver on a duty  
- depot_manager: Manages their depot's buses, drivers, incidents, duties
- control_operator: Sees ALL depots on live map, handles alerts
- admin: Creates everything, publishes notices, manages users
"""

import enum
from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class UserRole(str, enum.Enum):
    """
    Python enum for user roles.
    Using str as base means the enum value IS the string (no .value needed).
    """
    DRIVER = "driver"
    CONDUCTOR = "conductor"
    DEPOT_MANAGER = "depot_manager"
    CONTROL_OPERATOR = "control_operator"
    ADMIN = "admin"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    
    username = Column(String(50), unique=True, nullable=False, index=True)
    
    # NEVER store plain text passwords. Always bcrypt-hashed.
    # The hash looks like: $2b$12$eImiTXuWVxfM37uY4JANjQ...
    password_hash = Column(String(255), nullable=False)
    
    full_name = Column(String(100), nullable=False)
    
    # SQLAlchemy Enum uses the UserRole enum above
    # This ensures only valid role strings can be stored
    role = Column(Enum(UserRole, values_callable=lambda x: [e.value for e in x]), nullable=False)
    
    # depot_id is NULL for admin and control_operator
    # (they see all depots, not tied to one)
    depot_id = Column(Integer, ForeignKey("depots.id"), nullable=True)
    
    phone = Column(String(15), nullable=True)
    
    # Soft delete: set is_active=False instead of deleting the row
    # This preserves audit history (incidents, duties linked to this user)
    is_active = Column(Boolean, default=True, nullable=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # --- Relationships ---
    depot = relationship("Depot", back_populates="users")
    raised_incidents = relationship("Incident", foreign_keys="Incident.raised_by",
                                    back_populates="raiser")
    assigned_incidents = relationship("Incident", foreign_keys="Incident.assigned_to",
                                      back_populates="assignee")
    incident_events = relationship("IncidentEvent", back_populates="actor")
    created_notices = relationship("Notice", back_populates="creator")
    notice_reads = relationship("NoticeRead", back_populates="user")

    def __repr__(self):
        return f"<User {self.username} ({self.role})>"

    @property
    def is_depot_scoped(self) -> bool:
        """Depot managers and drivers only see their own depot's data."""
        return self.role in (UserRole.DEPOT_MANAGER, UserRole.DRIVER, UserRole.CONDUCTOR)

    @property
    def can_see_all_depots(self) -> bool:
        """Admins and control operators see everything."""
        return self.role in (UserRole.ADMIN, UserRole.CONTROL_OPERATOR)
