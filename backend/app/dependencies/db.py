"""
dependencies/db.py — Database Session Dependency
==================================================
FastAPI's dependency injection system manages the database session lifecycle.
Every API request that needs DB access declares `db: Session = Depends(get_db)`.

FastAPI will:
1. Call get_db() to create a new session for this request
2. Pass the session to your route handler
3. After the response is sent, run the finally block to close the session

WHY a generator (yield)?
- The 'yield' pauses the generator after giving the session to the handler
- FastAPI runs the handler (your route function)
- Then FastAPI resumes the generator to run the finally block
- This guarantees the session is ALWAYS closed, even if an exception occurred
- It's equivalent to a try/finally without try/except
"""

from sqlalchemy.orm import Session
from app.database import SessionLocal


def get_db():
    """
    Dependency that provides a database session per request.
    
    Usage in a router:
        @router.get("/something")
        def my_route(db: Session = Depends(get_db)):
            users = db.query(User).all()
            return users
    """
    db = SessionLocal()
    try:
        yield db          # ← FastAPI runs your route handler here
    finally:
        db.close()        # ← Always runs, even if an exception was raised
