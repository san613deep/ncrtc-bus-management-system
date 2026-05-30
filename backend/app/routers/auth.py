"""
routers/auth.py — Authentication Endpoints
============================================
POST /api/v1/auth/login   — get a JWT token
POST /api/v1/auth/logout  — invalidate the JWT
GET  /api/v1/auth/me      — get current user info

MENTOR NOTE: Keep routers THIN. Business logic goes in services/.
Routers should only:
1. Validate the request (Pydantic does this automatically)
2. Call a service function
3. Return the result
"""

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.schemas.auth import LoginRequest, TokenResponse, UserOut
from app.services.auth_service import AuthService
from app.dependencies.db import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/login", response_model=TokenResponse)
def login(
    request: Request,
    body: LoginRequest,
    db: Session = Depends(get_db),
):
    """
    Login with username and password.
    Returns a JWT access token if credentials are valid.
    Rate-limited: max 10 attempts per 15 minutes per IP.
    """
    # Get the client's IP for rate limiting
    client_ip = request.client.host if request.client else "unknown"
    
    service = AuthService(db)
    return service.login(body.username, body.password, client_ip)


@router.post("/logout", status_code=204)
def logout(
    request: Request,
    current_user: User = Depends(get_current_user),
):
    """
    Logout the current user.
    Blacklists the JWT in Redis so it can't be reused.
    Returns 204 No Content on success.
    """
    # Extract the raw token from the Authorization header
    auth_header = request.headers.get("Authorization", "")
    token = auth_header.replace("Bearer ", "")
    
    service = AuthService(None)  # No DB needed for logout
    service.logout(token)
    # 204 response — no body returned


@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    """
    Get the currently logged-in user's profile.
    Used by the frontend to restore auth state on page refresh.
    """
    return current_user
