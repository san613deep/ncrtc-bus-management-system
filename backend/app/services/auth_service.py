"""
services/auth_service.py — Authentication Business Logic
=========================================================
All the actual work of login/logout lives here.
The router just calls these methods.
"""

from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from jose import JWTError

from app.models.user import User
from app.core.security import verify_password, create_access_token, decode_access_token
from app.core.exceptions import (
    InvalidCredentialsError, TooManyLoginAttemptsError
)
from app.redis_client import (
    check_and_increment_login_attempts,
    reset_login_attempts,
    blacklist_token,
)
from app.schemas.auth import TokenResponse, UserOut
from app.config import get_settings

settings = get_settings()


class AuthService:
    def __init__(self, db: Session | None):
        self.db = db

    def login(self, username: str, password: str, client_ip: str) -> TokenResponse:
        """
        Authenticate a user and return a JWT token.
        
        Steps:
        1. Check rate limit (prevent brute-force attacks)
        2. Look up user by username
        3. Verify password with bcrypt
        4. Create JWT with user info embedded
        5. Reset rate limit counter on success
        """
        # --- Step 1: Rate Limiting ---
        is_allowed, attempt_count = check_and_increment_login_attempts(client_ip)
        if not is_allowed:
            raise TooManyLoginAttemptsError()

        # --- Step 2: Find the user ---
        user = self.db.query(User).filter(
            User.username == username,
            User.is_active == True
        ).first()

        # --- Step 3: Verify password ---
        # IMPORTANT: We check both user existence AND password in the same
        # condition. This prevents "username enumeration" attacks where an
        # attacker could tell which usernames exist based on error messages.
        if not user or not verify_password(password, user.password_hash):
            raise InvalidCredentialsError()

        # --- Step 4: Create JWT ---
        token, jti = create_access_token(
            user_id=user.id,
            role=user.role.value,
            depot_id=user.depot_id,
        )

        # --- Step 5: Reset rate limit on success ---
        reset_login_attempts(client_ip)

        return TokenResponse(
            access_token=token,
            token_type="bearer",
            expires_in_minutes=settings.jwt_access_token_expire_minutes,
            user=UserOut.model_validate(user),
        )

    def logout(self, token: str) -> None:
        """
        Blacklist the JWT so it can't be reused after logout.
        
        WHY is this needed?
        JWTs are stateless — by default, a token is valid until it expires,
        even after "logout". By blacklisting the JTI (JWT ID) in Redis,
        we effectively invalidate the token immediately.
        """
        try:
            payload = decode_access_token(token)
            jti = payload.get("jti")
            exp = payload.get("exp")
            
            if jti and exp:
                # Calculate remaining lifetime of the token
                now = int(datetime.now(timezone.utc).timestamp())
                remaining_seconds = max(exp - now, 0)
                
                # Blacklist until natural expiry
                blacklist_token(jti, remaining_seconds)
        except JWTError:
            # Token is already invalid — no need to blacklist
            pass
