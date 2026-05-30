"""
models/notice_read.py — Notice Read Receipts
===============================================
Tracks which drivers have read (and acknowledged) each notice.

This is a junction table with extra columns (read_at, acked_at).
When a driver opens a notice → read_at is set.
If the notice requires_ack and driver taps "Acknowledge" → acked_at is set.

Admin can see the read receipt list: "3 of 8 drivers in Depot Noida have read this."
"""

from sqlalchemy import Column, Integer, ForeignKey, DateTime, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class NoticeRead(Base):
    __tablename__ = "notice_reads"

    # Composite primary key: one row per (notice, user) combination
    notice_id = Column(Integer, ForeignKey("notices.id"), primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), primary_key=True)
    
    # Set when the driver opens the notice detail page
    read_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Set only if notice.requires_ack=True and driver taps "I Acknowledge"
    # NULL means not yet acknowledged
    acked_at = Column(DateTime(timezone=True), nullable=True)

    # --- Relationships ---
    notice = relationship("Notice", back_populates="reads")
    user = relationship("User", back_populates="notice_reads")

    def __repr__(self):
        return f"<NoticeRead notice={self.notice_id} user={self.user_id}>"
