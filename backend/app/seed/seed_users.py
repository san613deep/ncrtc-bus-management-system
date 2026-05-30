"""
seed/seed_users.py — Seed Demo Users
=======================================
Creates one user of each role for demo purposes.
All passwords are "password" (bcrypt hashed).

⚠️ DEMO ONLY — never use these credentials in production.
"""

from sqlalchemy.orm import Session
from app.models.user import User, UserRole
from app.models.depot import Depot
from app.core.security import hash_password


def seed_users(db: Session):
    """Seed demo users. Idempotent — skips if already seeded."""
    existing = db.query(User).count()
    if existing > 0:
        print(f"    (Users already seeded: {existing} found, skipping)")
        return

    # Get depot IDs for depot-scoped users
    depots = {d.code: d.id for d in db.query(Depot).all()}
    noida_id = depots.get("DEP-NDA")
    avh_id = depots.get("DEP-AVH")
    gzb_id = depots.get("DEP-GZB")

    hashed_pw = hash_password("password")  # All demo users share this password

    users = [
        # --- Admins (no depot) ---
        User(username="admin", password_hash=hashed_pw, full_name="System Admin",
             role=UserRole.ADMIN, depot_id=None, phone="9000000001"),

        # --- Control Operators (no depot) ---
        User(username="operator1", password_hash=hashed_pw,
             full_name="Rajesh Kumar (Control Room)",
             role=UserRole.CONTROL_OPERATOR, depot_id=None, phone="9000000002"),
        User(username="operator2", password_hash=hashed_pw,
             full_name="Sunita Sharma (Control Room)",
             role=UserRole.CONTROL_OPERATOR, depot_id=None, phone="9000000003"),

        # --- Depot Managers ---
        User(username="manager1", password_hash=hashed_pw,
             full_name="Amit Singh (Noida Manager)",
             role=UserRole.DEPOT_MANAGER, depot_id=noida_id, phone="9000000010"),
        User(username="manager2", password_hash=hashed_pw,
             full_name="Priya Patel (Anand Vihar Manager)",
             role=UserRole.DEPOT_MANAGER, depot_id=avh_id, phone="9000000011"),
        User(username="manager3", password_hash=hashed_pw,
             full_name="Vikram Yadav (Ghaziabad Manager)",
             role=UserRole.DEPOT_MANAGER, depot_id=gzb_id, phone="9000000012"),

        # --- Drivers (Noida Depot) ---
        User(username="driver1", password_hash=hashed_pw,
             full_name="Ravi Kumar", role=UserRole.DRIVER,
             depot_id=noida_id, phone="9000000020"),
        User(username="driver2", password_hash=hashed_pw,
             full_name="Suresh Verma", role=UserRole.DRIVER,
             depot_id=noida_id, phone="9000000021"),
        User(username="driver3", password_hash=hashed_pw,
             full_name="Mohan Lal", role=UserRole.DRIVER,
             depot_id=noida_id, phone="9000000022"),
        User(username="driver4", password_hash=hashed_pw,
             full_name="Deepak Tiwari", role=UserRole.DRIVER,
             depot_id=avh_id, phone="9000000023"),
        User(username="driver5", password_hash=hashed_pw,
             full_name="Ajay Mishra", role=UserRole.DRIVER,
             depot_id=avh_id, phone="9000000024"),
        User(username="driver6", password_hash=hashed_pw,
             full_name="Ramesh Gupta", role=UserRole.DRIVER,
             depot_id=gzb_id, phone="9000000025"),

        # --- Conductors ---
        User(username="conductor1", password_hash=hashed_pw,
             full_name="Sanjay Pal", role=UserRole.CONDUCTOR,
             depot_id=noida_id, phone="9000000030"),
        User(username="conductor2", password_hash=hashed_pw,
             full_name="Neha Singh", role=UserRole.CONDUCTOR,
             depot_id=avh_id, phone="9000000031"),
    ]

    for user in users:
        db.add(user)

    db.commit()
    print(f"    Created {len(users)} demo users")
    print(f"    All passwords: 'password' ⚠️  DEMO ONLY")
