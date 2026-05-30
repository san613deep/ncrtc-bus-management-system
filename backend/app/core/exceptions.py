"""
core/exceptions.py — Custom HTTP Exceptions
=============================================
Centralizing exceptions here means:
1. Consistent error response format across all endpoints
2. Easy to find and update error messages
3. No 500 Internal Server Error leaking to users

Standard error response format:
  {
    "detail": "Human-readable error message",
    "code": "MACHINE_READABLE_CODE"    ← optional, for frontend to handle
  }
"""

from fastapi import HTTPException, status


# -------------------------------------------------------------------
# Authentication & Authorization Errors
# -------------------------------------------------------------------

class InvalidCredentialsError(HTTPException):
    """Raised when username/password is wrong during login."""
    def __init__(self):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )


class TokenExpiredError(HTTPException):
    """Raised when the JWT token has expired."""
    def __init__(self):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired. Please log in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )


class TokenInvalidError(HTTPException):
    """Raised when the JWT token is malformed or tampered with."""
    def __init__(self):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token.",
            headers={"WWW-Authenticate": "Bearer"},
        )


class NotAuthenticatedError(HTTPException):
    """Raised when no token is provided and auth is required."""
    def __init__(self):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please log in.",
            headers={"WWW-Authenticate": "Bearer"},
        )


class InsufficientPermissionsError(HTTPException):
    """
    Raised when a user tries to access a resource they don't have access to.
    e.g., a driver trying to access the admin panel.
    """
    def __init__(self, required_roles: list[str] | None = None):
        detail = "You don't have permission to perform this action."
        if required_roles:
            detail += f" Required role(s): {', '.join(required_roles)}"
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=detail,
        )


class TooManyLoginAttemptsError(HTTPException):
    """Raised when too many failed login attempts from one IP."""
    def __init__(self):
        super().__init__(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many login attempts. Please try again in 15 minutes.",
        )


# -------------------------------------------------------------------
# Resource Not Found Errors
# -------------------------------------------------------------------

class NotFoundError(HTTPException):
    """Generic 404 — raised when a requested resource doesn't exist."""
    def __init__(self, resource: str = "Resource", resource_id: int | str = ""):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"{resource} with id={resource_id} not found.",
        )


# -------------------------------------------------------------------
# Business Logic Errors
# -------------------------------------------------------------------

class InvalidStatusTransitionError(HTTPException):
    """
    Raised when an invalid incident status transition is attempted.
    e.g., trying to go from 'open' directly to 'resolved' (must go through steps).
    """
    def __init__(self, from_status: str, to_status: str):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot transition incident from '{from_status}' to '{to_status}'.",
        )


class DepotAccessDeniedError(HTTPException):
    """
    Raised when a depot-scoped user tries to access another depot's data.
    e.g., a Noida manager trying to see Ghaziabad's incidents.
    """
    def __init__(self):
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only access data from your own depot.",
        )


class DuplicateDutyError(HTTPException):
    """Raised when trying to assign a driver who already has a duty that day."""
    def __init__(self, driver_name: str, date: str):
        super().__init__(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Driver '{driver_name}' already has a duty assigned on {date}.",
        )
