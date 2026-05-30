"""
schemas/auth.py — Auth Request/Response Schemas
=================================================
Pydantic schemas define what data is ACCEPTED (request) and RETURNED (response).

WHY separate schemas from models?
- Your DB model (SQLAlchemy) is how data is STORED.
- Your schema (Pydantic) is what you ACCEPT from clients and RETURN to them.
- They're not always the same! E.g., you never return password_hash to the client.

This separation is called the "DTO pattern" (Data Transfer Object).
"""

from pydantic import BaseModel, Field
from typing import Optional
from app.models.user import UserRole


# -------------------------------------------------------------------
# Request Schemas (what the client sends TO us)
# -------------------------------------------------------------------

class LoginRequest(BaseModel):
    """Body of POST /auth/login"""
    username: str = Field(..., min_length=3, max_length=50,
                         example="depot_manager_1")
    password: str = Field(..., min_length=6, example="password")


# -------------------------------------------------------------------
# Response Schemas (what we send BACK to the client)
# -------------------------------------------------------------------

class UserOut(BaseModel):
    """
    Safe user representation — excludes sensitive fields like password_hash.
    This is what /auth/me and /auth/login return.
    """
    id: int
    username: str
    full_name: str
    role: UserRole
    depot_id: Optional[int] = None
    phone: Optional[str] = None
    is_active: bool

    # orm_mode tells Pydantic to read data from SQLAlchemy model attributes
    # (instead of requiring a plain dict)
    class Config:
        from_attributes = True   # Pydantic v2 equivalent of orm_mode = True


class TokenResponse(BaseModel):
    """Response body of POST /auth/login on success."""
    access_token: str
    token_type: str = "bearer"
    expires_in_minutes: int
    user: UserOut
