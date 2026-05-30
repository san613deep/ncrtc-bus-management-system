"""
redis_client.py — Redis Connection
====================================
Redis is our in-memory cache. We use it for:
1. Caching each vehicle's last GPS position (avoids 50 DB queries every 5s)
2. JWT blacklisting (logout invalidation)
3. Login rate limiting (prevent brute-force attacks)

WHY Redis instead of just the DB?
- Redis reads are ~100x faster than PostgreSQL for simple key-value lookups
- GPS position cache: 50 vehicles × polling every 5s = 600 reads/min
  - Without cache: 600 PostgreSQL queries/min (heavy)
  - With Redis cache: 600 Redis reads/min (lightweight)
"""

import redis
from app.config import get_settings

settings = get_settings()

# -------------------------------------------------------------------
# Global Redis client — created once when the module loads
# decode_responses=True: return strings instead of bytes
# -------------------------------------------------------------------
redis_client = redis.from_url(
    settings.redis_url,
    decode_responses=True,
)


def get_redis():
    """
    Dependency-injectable Redis client.
    Usage in a router:
        from app.redis_client import get_redis
        redis = Depends(get_redis)
    """
    return redis_client


# -------------------------------------------------------------------
# Helper functions for vehicle position caching
# Key pattern: "vehicle:pos:{vehicle_id}"
# -------------------------------------------------------------------

VEHICLE_POS_TTL = 120  # seconds — position expires after 2 min (stale data guard)


def cache_vehicle_position(vehicle_id: int, lat: float, lng: float,
                           speed: float, ts: str) -> None:
    """Store a vehicle's latest GPS position in Redis."""
    key = f"vehicle:pos:{vehicle_id}"
    redis_client.hset(key, mapping={
        "lat": lat,
        "lng": lng,
        "speed": speed,
        "ts": ts,
    })
    redis_client.expire(key, VEHICLE_POS_TTL)


def get_vehicle_position(vehicle_id: int) -> dict | None:
    """Retrieve a vehicle's cached position. Returns None if not in cache."""
    key = f"vehicle:pos:{vehicle_id}"
    data = redis_client.hgetall(key)
    if not data:
        return None
    return {
        "lat": float(data["lat"]),
        "lng": float(data["lng"]),
        "speed": float(data["speed"]),
        "ts": data["ts"],
    }


def get_all_vehicle_positions(vehicle_ids: list[int]) -> dict[int, dict]:
    """Bulk fetch positions for multiple vehicles using a pipeline (one round-trip)."""
    pipe = redis_client.pipeline()
    for vid in vehicle_ids:
        pipe.hgetall(f"vehicle:pos:{vid}")
    results = pipe.execute()

    positions = {}
    for vid, data in zip(vehicle_ids, results):
        if data:
            positions[vid] = {
                "lat": float(data["lat"]),
                "lng": float(data["lng"]),
                "speed": float(data["speed"]),
                "ts": data["ts"],
            }
    return positions


# -------------------------------------------------------------------
# JWT Blacklist helpers
# When a user logs out, we blacklist their JWT so it can't be reused
# -------------------------------------------------------------------

def blacklist_token(jti: str, expires_in_seconds: int) -> None:
    """Add a JWT ID to the blacklist until it naturally expires."""
    redis_client.setex(f"jwt:blacklist:{jti}", expires_in_seconds, "1")


def is_token_blacklisted(jti: str) -> bool:
    """Check if a JWT has been blacklisted (user logged out)."""
    return redis_client.exists(f"jwt:blacklist:{jti}") == 1


# -------------------------------------------------------------------
# Rate limiting helpers
# Prevent brute-force login attacks (max 5 attempts per 15 min per IP)
# -------------------------------------------------------------------

LOGIN_MAX_ATTEMPTS = 10
LOGIN_WINDOW_SECONDS = 900  # 15 minutes


def check_and_increment_login_attempts(ip: str) -> tuple[bool, int]:
    """
    Returns (is_allowed, current_attempt_count).
    Blocks the IP if it has exceeded LOGIN_MAX_ATTEMPTS.
    """
    key = f"rate:login:{ip}"
    pipe = redis_client.pipeline()
    pipe.incr(key)
    pipe.expire(key, LOGIN_WINDOW_SECONDS)
    count, _ = pipe.execute()
    count = int(count)
    return count <= LOGIN_MAX_ATTEMPTS, count


def reset_login_attempts(ip: str) -> None:
    """Clear rate limit counter on successful login."""
    redis_client.delete(f"rate:login:{ip}")
