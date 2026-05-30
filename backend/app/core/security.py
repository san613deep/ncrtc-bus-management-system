"""
core/security.py — JWT + Password Hashing
==========================================
This is the most security-critical file in the project.
It handles:
1. Password hashing with bcrypt (NEVER store plain passwords)
2. JWT token creation and verification
3. Token payload structure

INTERVIEW TALKING POINT:
"We use bcrypt with a cost factor of 12. The cost factor means hashing is
intentionally slow — it takes ~300ms. This is a FEATURE, not a bug: it makes
brute-force attacks impractical. If an attacker steals our DB, they can only
try ~3 passwords per second per core."
"""

from datetime import datetime, timedelta, timezone
from typing import Optional
import uuid

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.config import get_settings

settings = get_settings()

# -------------------------------------------------------------------
# Password Hashing
# CryptContext handles choosing the algorithm and upgrading hashes.
# schemes=["bcrypt"]: use bcrypt exclusively
# deprecated="auto": automatically rehash old passwords on login
# -------------------------------------------------------------------
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(plain_password: str) -> str:
    """
    Hash a plain text password using bcrypt.
    Returns a string like: $2b$12$eImiTXuWVxfM37uY4JANjQ...
    
    NEVER store the plain password — only ever store this hash.
    """
    return pwd_context.hash(plain_password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Check if a plain password matches a stored bcrypt hash.
    Used during login to verify the user's password.
    Returns True if match, False if not.
    """
    return pwd_context.verify(plain_password, hashed_password)


# -------------------------------------------------------------------
# JWT Token Management
# JWT = JSON Web Token. It's a signed string that proves identity.
# Structure: header.payload.signature
# 
# Our payload contains:
#   sub: user ID (the "subject" of the token)
#   role: user's role (for quick role checks without a DB query)
#   depot_id: user's depot (for quick depot scoping)
#   jti: unique token ID (used for blacklisting on logout)
#   exp: expiration timestamp
# -------------------------------------------------------------------

def create_access_token(user_id: int, role: str, depot_id: Optional[int]) -> tuple[str, str]:
    """
    Create a JWT access token.
    
    Returns:
        (token_string, jti) — jti is needed for blacklisting on logout
    
    WHY include role and depot_id in the token?
    - Avoids a DB query on every API request just to check role
    - The token is signed — it can't be tampered with
    """
    jti = str(uuid.uuid4())  # Unique ID for this specific token
    
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=settings.jwt_access_token_expire_minutes
    )
    
    payload = {
        "sub": str(user_id),        # subject — who this token is for
        "role": role,               # user's role
        "depot_id": depot_id,       # user's depot (None for admin/control_operator)
        "jti": jti,                 # unique token ID (for blacklisting)
        "exp": expire,              # expiration time
        "iat": datetime.now(timezone.utc),  # issued at
    }
    
    token = jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)
    return token, jti


def decode_access_token(token: str) -> dict:
    """
    Decode and verify a JWT token.
    
    Raises:
        JWTError: if the token is invalid, expired, or tampered with
    
    Returns:
        The payload dict (sub, role, depot_id, jti, exp, iat)
    """
    return jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
