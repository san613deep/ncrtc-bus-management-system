"""
database.py — SQLAlchemy Database Setup
========================================
This file creates:
1. The database ENGINE — the connection to PostgreSQL
2. The SESSION FACTORY — creates database sessions for each request
3. The BASE CLASS — all your models inherit from this

WHY SQLAlchemy?
- Prevents SQL injection (parameterized queries automatically)
- Lets you write Python classes instead of raw SQL
- Handles connection pooling automatically
"""

from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.config import get_settings

settings = get_settings()

# -------------------------------------------------------------------
# Engine — the connection pool to PostgreSQL
# pool_pre_ping=True: validates connections before using them
# (prevents "lost connection" errors after idle periods)
# -------------------------------------------------------------------
engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,
    pool_size=10,        # Max connections in the pool
    max_overflow=20,     # Extra connections when pool is full
    echo=not settings.is_production,  # Log SQL in dev, not in prod
)

# -------------------------------------------------------------------
# SessionLocal — factory that creates database sessions
# Each API request gets its own session (via the get_db dependency)
# autocommit=False: you must explicitly commit transactions
# autoflush=False: don't flush until commit (prevents accidental writes)
# -------------------------------------------------------------------
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# -------------------------------------------------------------------
# Base — all SQLAlchemy models inherit from this
# This is how SQLAlchemy knows which classes are database tables
# -------------------------------------------------------------------
Base = declarative_base()
