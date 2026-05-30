"""
seed/run_seed.py — Master Seed Runner
=======================================
This script populates a fresh database with all demo data.
Runs automatically on first docker compose up (via the backend command).
Safe to re-run: checks if data already exists before inserting.

Run manually: docker exec ncrtc_backend python -m app.seed.run_seed
"""

import sys
from sqlalchemy.orm import Session
from app.database import SessionLocal, engine, Base
from app.models import *  # Import all models so tables are created

# Import individual seeders
from app.seed.seed_depots import seed_depots
from app.seed.seed_users import seed_users
from app.seed.seed_vehicles import seed_vehicles
from app.seed.seed_gps_history import seed_gps_history
from app.seed.seed_incidents import seed_incidents
from app.seed.seed_notices import seed_notices


def run_seed():
    """Run all seed functions in the correct order (dependencies first)."""
    db: Session = SessionLocal()
    
    try:
        print("🌱 Starting database seed...")
        
        # Order matters! Users need depots, vehicles need depots, etc.
        print("  → Seeding depots...")
        seed_depots(db)
        
        print("  → Seeding users...")
        seed_users(db)
        
        print("  → Seeding vehicles...")
        seed_vehicles(db)
        
        print("  → Seeding GPS history...")
        seed_gps_history(db)
        
        print("  → Seeding incidents...")
        seed_incidents(db)
        
        print("  → Seeding notices...")
        seed_notices(db)
        
        print("✅ Seed complete! Demo credentials:")
        print("   admin / password       (Admin)")
        print("   manager1 / password    (Depot Manager - Noida)")
        print("   operator1 / password   (Control Operator)")
        print("   driver1 / password     (Driver - Noida)")
        print("   ⚠️  These are DEMO credentials only — change before any real deployment!")
        
    except Exception as e:
        db.rollback()
        print(f"❌ Seed failed: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    run_seed()
