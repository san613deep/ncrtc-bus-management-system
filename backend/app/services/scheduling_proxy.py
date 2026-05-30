"""
services/scheduling_proxy.py — HTTP Proxy to Spring Boot
==========================================================
Makes async HTTP calls to the Spring Boot scheduling service.
Uses httpx (async HTTP client) for non-blocking requests.
"""

import httpx
from fastapi import HTTPException
from app.config import get_settings
from app.models.user import User

settings = get_settings()


class SchedulingProxyService:
    """
    Thin HTTP client that proxies requests to the Spring Boot service.
    
    Automatically adds:
    - Internal API key header (authentication for Spring Boot)
    - User context headers (so Spring Boot knows who's calling)
    """

    def __init__(self):
        self.base_url = settings.scheduling_service_url
        self.headers = {
            "Authorization": f"Bearer {settings.internal_api_key}",
            "Content-Type": "application/json",
        }

    def _user_headers(self, user: User) -> dict:
        """Pass user context to Spring Boot via headers."""
        return {
            "X-User-Id": str(user.id),
            "X-User-Role": user.role.value,
            "X-User-Depot": str(user.depot_id) if user.depot_id else "",
        }

    async def get(self, path: str, user: User) -> dict:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{self.base_url}{path}",
                headers={**self.headers, **self._user_headers(user)},
                timeout=10.0,
            )
            return self._handle_response(resp)

    async def post(self, path: str, body: dict, user: User) -> dict:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{self.base_url}{path}",
                json=body,
                headers={**self.headers, **self._user_headers(user)},
                timeout=10.0,
            )
            return self._handle_response(resp)

    async def put(self, path: str, body: dict, user: User) -> dict:
        async with httpx.AsyncClient() as client:
            resp = await client.put(
                f"{self.base_url}{path}",
                json=body,
                headers={**self.headers, **self._user_headers(user)},
                timeout=10.0,
            )
            return self._handle_response(resp)

    async def patch(self, path: str, body: dict, user: User) -> dict:
        async with httpx.AsyncClient() as client:
            resp = await client.patch(
                f"{self.base_url}{path}",
                json=body,
                headers={**self.headers, **self._user_headers(user)},
                timeout=10.0,
            )
            return self._handle_response(resp)

    async def delete(self, path: str, user: User):
        async with httpx.AsyncClient() as client:
            resp = await client.delete(
                f"{self.base_url}{path}",
                headers={**self.headers, **self._user_headers(user)},
                timeout=10.0,
            )
            return self._handle_response(resp)

    def _handle_response(self, resp: httpx.Response):
        """Convert Spring Boot response to FastAPI response or raise exception."""
        if resp.status_code >= 400:
            try:
                detail = resp.json()
            except Exception:
                detail = resp.text
            raise HTTPException(status_code=resp.status_code, detail=detail)
        
        if resp.status_code == 204:
            return None
        
        return resp.json()
