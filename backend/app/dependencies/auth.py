"""
dependencies/auth.py — Authentication & Authorization Dependencies
==================================================================
This is where role-based access control (RBAC) lives.

FastAPI's dependency injection makes this elegant:
  - get_current_user: extracts and validates the JWT from every request
  - require_role(*roles): factory that returns a dependency checking for specific roles

Usage in routers:
  # Only logged-in users:
  @router.get("/me")
  def get_me(user = Depends(get_current_user)):
      ...

  # Only admins:
  @router.post("/notices")
  def create_notice(user = Depends(require_role("admin"))):
      ...

  # Admins OR depot managers:
  @router.get("/duties")
  def get_duties(user = Depends(require_role("admin", "depot_manager"))):
      ...

  # Tick script (API key auth, no JWT):
  @router.post("/gps/ping")
  def ingest_ping(api_key = Depends(require_tick_api_key)):
      ...
"""

from fastapi import Depends, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError
from sqlalchemy.orm import Session
import redis as redis_lib

from app.core.security import decode_access_token
from app.core.exceptions import (
    NotAuthenticatedError, TokenInvalidError, TokenExpiredError,
    InsufficientPermissionsError
)
from app.redis_client import is_token_blacklisted, get_redis
from app.dependencies.db import get_db
from app.models.user import User
from app.config import get_settings

settings = get_settings()

# HTTPBearer extracts the "Bearer <token>" from the Authorization header
bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Security(bearer_scheme),
    db: Session = Depends(get_db),
    redis: redis_lib.Redis = Depends(get_redis),
) -> User:
    """
    Core authentication dependency.
    
    Steps:
    1. Check that an Authorization header exists
    2. Decode and verify the JWT
    3. Check the token isn't blacklisted (user logged out)
    4. Load the user from the database
    5. Check the user is still active
    
    Any failure raises an appropriate HTTP exception (401 or 403).
    """
    # Step 1: Check header exists
    if not credentials:
        raise NotAuthenticatedError()

    token = credentials.credentials

    # Step 2: Decode and verify the JWT
    try:
        payload = decode_access_token(token)
    except JWTError as e:
        error_msg = str(e)
        if "expired" in error_msg.lower():
            raise TokenExpiredError()
        raise TokenInvalidError()

    # Step 3: Check JWT blacklist (user may have logged out)
    jti = payload.get("jti")
    if jti and is_token_blacklisted(jti):
        raise TokenInvalidError()

    # Step 4: Load user from DB
    user_id = int(payload.get("sub", 0))
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise TokenInvalidError()

    # Step 5: Check account is active
    if not user.is_active:
        raise NotAuthenticatedError()

    return user


def require_role(*allowed_roles: str):
    """
    Factory function that creates a role-checking dependency.
    
    Usage: Depends(require_role("admin", "depot_manager"))
    
    Returns a FastAPI dependency function that:
    - First validates the JWT (via get_current_user)
    - Then checks if the user's role is in the allowed list
    - Raises 403 Forbidden if the role doesn't match
    """
    async def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role.value not in allowed_roles:
            raise InsufficientPermissionsError(list(allowed_roles))
        return current_user
    
    return role_checker


def require_tick_api_key(
    credentials: HTTPAuthorizationCredentials | None = Security(bearer_scheme),
) -> bool:
    """
    Special dependency for the GPS tick script endpoint.
    The tick script uses an API key instead of a JWT.
    This prevents unauthorized bots from injecting fake GPS data.
    """
    if not credentials:
        raise NotAuthenticatedError()
    
    if credentials.credentials != settings.tick_api_key:
        raise InsufficientPermissionsError()
    
    return True


def require_internal_api_key(
    credentials: HTTPAuthorizationCredentials | None = Security(bearer_scheme),
) -> bool:
    """
    Used for internal FastAPI → Spring Boot communication.
    Ensures Spring Boot endpoints can't be called directly from the internet.
    """
    if not credentials or credentials.credentials != settings.internal_api_key:
        raise InsufficientPermissionsError()
    return True
