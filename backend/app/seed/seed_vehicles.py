"""
seed/seed_vehicles.py — Seed Vehicles
=======================================
Creates 50 buses spread across 4 depots.
Registration numbers follow real Delhi format: DL XX PC XXXX
"""

from sqlalchemy.orm import Session
from app.models.vehicle import Vehicle, VehicleStatus
from app.models.depot import Depot


def seed_vehicles(db: Session):
    """Seed vehicles. Idempotent."""
    existing = db.query(Vehicle).count()
    if existing > 0:
        print(f"    (Vehicles already seeded: {existing} found, skipping)")
        return

    depots = db.query(Depot).all()
    depot_map = {d.code: d.id for d in depots}

    vehicles = []

    # Noida: 15 vehicles
    for i in range(1, 16):
        vehicles.append(Vehicle(
            reg_no=f"DL1PC{i:04d}",
            depot_id=depot_map["DEP-NDA"],
            status=VehicleStatus.ON_DUTY if i <= 10 else VehicleStatus.IDLE,
            model="Tata Starbus Ultra 12m",
            capacity=45,
        ))

    # Anand Vihar: 15 vehicles
    for i in range(101, 116):
        vehicles.append(Vehicle(
            reg_no=f"DL1PC{i:04d}",
            depot_id=depot_map["DEP-AVH"],
            status=VehicleStatus.ON_DUTY if i <= 110 else VehicleStatus.IDLE,
            model="Tata Starbus Urban 9m",
            capacity=35,
        ))

    # Ghaziabad: 12 vehicles
    for i in range(201, 213):
        vehicles.append(Vehicle(
            reg_no=f"UP14PC{i:04d}",
            depot_id=depot_map["DEP-GZB"],
            status=VehicleStatus.ON_DUTY if i <= 207 else VehicleStatus.IDLE,
            model="Ashok Leyland Lynx",
            capacity=40,
        ))

    # Meerut: 8 vehicles
    for i in range(301, 309):
        vehicles.append(Vehicle(
            reg_no=f"UP15PC{i:04d}",
            depot_id=depot_map["DEP-MRT"],
            status=VehicleStatus.ON_DUTY if i <= 304 else VehicleStatus.MAINTENANCE,
            model="Ashok Leyland Lynx",
            capacity=40,
        ))

    for v in vehicles:
        db.add(v)

    db.commit()
    print(f"    Created {len(vehicles)} vehicles")
