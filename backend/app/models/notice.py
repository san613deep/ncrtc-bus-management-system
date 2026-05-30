"""
models/notice.py — Notice/CMS Model
=======================================
Notices are messages published by admin to specific audiences (all drivers,
a specific depot, or a specific role). Think of it like an internal WhatsApp
broadcast, but with read receipts.

audience_json examples:
  {"type": "all"}                          → Everyone sees it
  {"type": "depot", "depot_id": 2}         → Only depot 2's users
  {"type": "role", "role": "driver"}       → Only drivers system-wide
"""

import json
from sqlalchemy import Column, Integer, String, Text, Boolean, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class Notice(Base):
    __tablename__ = "notices"

    id = Column(Integer, primary_key=True, index=True)
    
    title = Column(String(200), nullable=False)
    
    # Body can be plain text or Markdown
    # Frontend can use a Markdown renderer (like react-markdown) to display it
    body = Column(Text, nullable=False)
    
    # JSON string storing the audience targeting rules
    # Stored as TEXT because PostgreSQL JSON type requires more setup
    # Parse it in Python with json.loads(notice.audience_json)
    audience_json = Column(Text, nullable=False, default='{"type":"all"}')
    
    # When this notice becomes visible to users
    # Allows scheduling notices in advance
    publish_at = Column(DateTime(timezone=True), nullable=False)
    
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # If True, drivers must explicitly tap "I acknowledge" — not just open it
    requires_ack = Column(Boolean, default=False, nullable=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # --- Relationships ---
    creator = relationship("User", back_populates="created_notices")
    reads = relationship("NoticeRead", back_populates="notice")

    @property
    def audience(self) -> dict:
        """Parse audience_json into a Python dict."""
        return json.loads(self.audience_json)

    def __repr__(self):
        return f"<Notice #{self.id}: {self.title[:40]}>"
