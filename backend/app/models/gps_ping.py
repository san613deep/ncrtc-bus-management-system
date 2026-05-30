"""
models/gps_ping.py — GPS Ping Model
========================================
Every GPS position update from a vehicle is stored as one row.
This is the highest-volume table in the system.

For 50 vehicles pinging every 5 seconds = 10 pings/second = 36,000 rows/hour.
The index on (vehicle_id, ts DESC) makes "last 30 min of pings" queries fast.

WHY BIGSERIAL instead of SERIAL?
- SERIAL is 32-bit: max ~2 billion rows
- BIGSERIAL is 64-bit: max ~9 quintillion rows
- GPS pings accumulate fast — use BIGSERIAL to be safe
"""

from sqlalchemy import Column, BigInteger, Integer, ForeignKey, DateTime, Numeric, Boolean, Index
from sqlalchemy.orm import relationship
from app.database import Base


class GpsPing(Base):
    __tablename__ = "gps_pings"

    # BigInteger for high-volume tables
    id = Column(BigInteger, primary_key=True, index=True)
    
    vehicle_id = Column(Integer, ForeignKey("vehicles.id"), nullable=False)
    
    # Timestamp with timezone — always store UTC in the DB
    # Convert to IST (UTC+5:30) in the frontend
    ts = Column(DateTime(timezone=True), nullable=False, index=True)
    
    # 7 decimal places of precision = ~1cm accuracy
    lat = Column(Numeric(10, 7), nullable=False)
    lng = Column(Numeric(10, 7), nullable=False)
    
    speed_kmh = Column(Numeric(5, 2), default=0)
    
    ignition_on = Column(Boolean, default=True)

    # --- Relationships ---
    vehicle = relationship("Vehicle", back_populates="gps_pings")

    # --- Composite Index ---
    # This is the MOST IMPORTANT index in the whole database.
    # "Give me the last 30 pings for vehicle 7" = indexed scan, not full table scan.
    __table_args__ = (
        Index("idx_gps_vehicle_ts", "vehicle_id", ts.desc()),
    )

    def __repr__(self):
        return f"<GpsPing vehicle={self.vehicle_id} ts={self.ts} ({self.lat},{self.lng})>"
