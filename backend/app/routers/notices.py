"""
routers/notices.py — CMS Notice Endpoints
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.schemas.notice import NoticeCreate, NoticeOut, NoticeListItem, NoticeReadOut
from app.services.notice_service import NoticeService
from app.dependencies.db import get_db
from app.dependencies.auth import get_current_user, require_role
from app.models.user import User

router = APIRouter(prefix="/notices")


@router.get("", response_model=list[NoticeListItem])
def list_notices(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    List notices visible to the current user (based on audience rules).
    Includes read/ack status for the current user.
    """
    service = NoticeService(db)
    return service.list_notices_for_user(current_user)


@router.post("", response_model=NoticeOut, status_code=201)
def create_notice(
    body: NoticeCreate,
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    """Create a new notice. Admin only."""
    service = NoticeService(db)
    return service.create_notice(body, current_user)


@router.get("/{notice_id}", response_model=NoticeOut)
def get_notice(
    notice_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get notice detail.
    Side effect: marks the notice as read for the current user.
    """
    service = NoticeService(db)
    return service.get_notice_and_mark_read(notice_id, current_user)


@router.post("/{notice_id}/ack", status_code=204)
def acknowledge_notice(
    notice_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Explicitly acknowledge a notice that requires acknowledgment."""
    service = NoticeService(db)
    service.acknowledge_notice(notice_id, current_user)


@router.get("/{notice_id}/reads", response_model=list[NoticeReadOut])
def get_read_receipts(
    notice_id: int,
    current_user: User = Depends(require_role("admin", "depot_manager")),
    db: Session = Depends(get_db),
):
    """Get read receipt list for a notice. Admin and managers only."""
    service = NoticeService(db)
    return service.get_read_receipts(notice_id, current_user)
