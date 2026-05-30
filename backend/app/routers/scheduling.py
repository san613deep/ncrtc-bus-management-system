"""
routers/scheduling.py — Scheduling Proxy Endpoints
====================================================
These endpoints proxy requests to the Spring Boot scheduling service.
FastAPI validates auth/role, then forwards the request to Spring Boot.

WHY proxy instead of direct calls?
- Users only need to know about ONE API (FastAPI on port 8000)
- Auth/RBAC is enforced in FastAPI, not Spring Boot
- Spring Boot port 8080 is not exposed to the internet
"""

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
from typing import Any

from app.services.scheduling_proxy import SchedulingProxyService
from app.dependencies.db import get_db
from app.dependencies.auth import get_current_user, require_role
from app.models.user import User

router = APIRouter(prefix="/scheduling")


# --- Routes ---

@router.get("/routes")
async def list_routes(
    current_user: User = Depends(get_current_user),
):
    """List all routes."""
    proxy = SchedulingProxyService()
    return await proxy.get("/routes", current_user)


@router.post("/routes", status_code=201)
async def create_route(
    request: Request,
    current_user: User = Depends(require_role("admin", "depot_manager")),
):
    """Create a new route. Admin or depot manager only."""
    body = await request.json()
    proxy = SchedulingProxyService()
    return await proxy.post("/routes", body, current_user)


@router.put("/routes/{route_id}")
async def update_route(
    route_id: int,
    request: Request,
    current_user: User = Depends(require_role("admin", "depot_manager")),
):
    body = await request.json()
    proxy = SchedulingProxyService()
    return await proxy.put(f"/routes/{route_id}", body, current_user)


@router.delete("/routes/{route_id}", status_code=204)
async def delete_route(
    route_id: int,
    current_user: User = Depends(require_role("admin")),
):
    proxy = SchedulingProxyService()
    return await proxy.delete(f"/routes/{route_id}", current_user)


# --- Duties ---

@router.get("/duties")
async def list_duties(
    request: Request,
    current_user: User = Depends(get_current_user),
):
    """
    Get duties (roster grid).
    Query params forwarded: ?depot_id=&week=2025-W03
    """
    proxy = SchedulingProxyService()
    return await proxy.get(f"/duties?{request.query_params}", current_user)


@router.post("/duties", status_code=201)
async def create_duty(
    request: Request,
    current_user: User = Depends(require_role("admin", "depot_manager")),
):
    """Assign a driver to a vehicle for a duty date."""
    body = await request.json()
    proxy = SchedulingProxyService()
    return await proxy.post("/duties", body, current_user)


@router.patch("/duties/{duty_id}/publish")
async def publish_duty(
    duty_id: int,
    current_user: User = Depends(require_role("admin", "depot_manager")),
):
    """Publish a duty — makes it visible to the assigned driver."""
    proxy = SchedulingProxyService()
    return await proxy.patch(f"/duties/{duty_id}/publish", {}, current_user)


@router.get("/duties/mine")
async def get_my_duties(
    current_user: User = Depends(require_role("driver", "conductor")),
):
    """Driver's own duties (today + upcoming). Used by the PWA."""
    proxy = SchedulingProxyService()
    return await proxy.get(f"/duties/mine?driver_id={current_user.id}", current_user)


@router.patch("/duties/{duty_id}/ack")
async def acknowledge_duty(
    duty_id: int,
    current_user: User = Depends(require_role("driver", "conductor")),
):
    """Driver acknowledges a duty. Records ack_at timestamp."""
    proxy = SchedulingProxyService()
    return await proxy.patch(f"/duties/{duty_id}/ack", {}, current_user)
