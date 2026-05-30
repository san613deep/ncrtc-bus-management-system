"""
seed/seed_depots.py — Seed Depots
====================================
Real NCR depot locations with actual GPS coordinates.
Polygon GeoJSON is a rough rectangle around each depot area.
"""

from sqlalchemy.orm import Session
from app.models.depot import Depot


DEPOTS = [
    {
        "code": "DEP-NDA",
        "name": "Noida Sector 37 Depot",
        "location_lat": 28.5706,
        "location_lng": 77.3219,
        "polygon_geojson": '{"type":"Polygon","coordinates":[[[77.318,28.567],[77.326,28.567],[77.326,28.574],[77.318,28.574],[77.318,28.567]]]}'
    },
    {
        "code": "DEP-AVH",
        "name": "Anand Vihar Depot",
        "location_lat": 28.6469,
        "location_lng": 77.3159,
        "polygon_geojson": '{"type":"Polygon","coordinates":[[[77.312,28.643],[77.320,28.643],[77.320,28.651],[77.312,28.651],[77.312,28.643]]]}'
    },
    {
        "code": "DEP-GZB",
        "name": "Ghaziabad Depot",
        "location_lat": 28.6692,
        "location_lng": 77.4538,
        "polygon_geojson": '{"type":"Polygon","coordinates":[[[77.450,28.665],[77.458,28.665],[77.458,28.673],[77.450,28.673],[77.450,28.665]]]}'
    },
    {
        "code": "DEP-MRT",
        "name": "Meerut South Depot",
        "location_lat": 28.9845,
        "location_lng": 77.7064,
        "polygon_geojson": '{"type":"Polygon","coordinates":[[[77.702,28.980],[77.711,28.980],[77.711,28.989],[77.702,28.989],[77.702,28.980]]]}'
    },
]


def seed_depots(db: Session):
    """Seed depots. Skip if already seeded (idempotent)."""
    existing = db.query(Depot).count()
    if existing > 0:
        print(f"    (Depots already seeded: {existing} found, skipping)")
        return
    
    for data in DEPOTS:
        depot = Depot(**data)
        db.add(depot)
    
    db.commit()
    print(f"    Created {len(DEPOTS)} depots")
