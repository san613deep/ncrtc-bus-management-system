"""
services/notice_service.py — CMS Notice Business Logic
========================================================
"""

import json
from datetime import datetime, timezone
from sqlalchemy.orm import Session

from app.models.notice import Notice
from app.models.notice_read import NoticeRead
from app.models.user import User, UserRole
from app.schemas.notice import NoticeCreate, NoticeOut, NoticeListItem, NoticeReadOut
from app.core.exceptions import NotFoundError, InsufficientPermissionsError


class NoticeService:
    def __init__(self, db: Session):
        self.db = db

    def _user_matches_audience(self, user: User, notice: Notice) -> bool:
        """Check if a notice is visible to a specific user based on audience rules."""
        audience = notice.audience
        a_type = audience.get("type", "all")

        if a_type == "all":
            return True
        if a_type == "depot":
            return user.depot_id == audience.get("depot_id")
        if a_type == "role":
            return user.role.value == audience.get("role")
        return False

    def list_notices_for_user(self, user: User) -> list[dict]:
        """Return notices visible to this user, with read/ack status."""
        now = datetime.now(timezone.utc)
        notices = (
            self.db.query(Notice)
            .filter(Notice.publish_at <= now)
            .order_by(Notice.publish_at.desc())
            .all()
        )

        # Preload this user's reads for efficiency
        read_map = {
            r.notice_id: r
            for r in self.db.query(NoticeRead).filter(NoticeRead.user_id == user.id).all()
        }

        result = []
        for notice in notices:
            if not self._user_matches_audience(user, notice):
                continue

            read_rec = read_map.get(notice.id)
            total_reads = self.db.query(NoticeRead).filter(
                NoticeRead.notice_id == notice.id
            ).count()

            result.append({
                "id": notice.id,
                "title": notice.title,
                "publish_at": notice.publish_at,
                "requires_ack": notice.requires_ack,
                "is_read": read_rec is not None,
                "is_acked": read_rec.acked_at is not None if read_rec else False,
                "read_count": total_reads,
                "total_audience": 0,  # Can be computed separately if needed
            })
        return result

    def create_notice(self, data: NoticeCreate, creator: User) -> Notice:
        notice = Notice(
            title=data.title,
            body=data.body,
            audience_json=data.audience_json,
            publish_at=data.publish_at,
            created_by=creator.id,
            requires_ack=data.requires_ack,
        )
        self.db.add(notice)
        self.db.commit()
        self.db.refresh(notice)
        return notice

    def get_notice_and_mark_read(self, notice_id: int, user: User) -> dict:
        """Fetch notice detail and mark as read (side effect)."""
        notice = self.db.query(Notice).filter(Notice.id == notice_id).first()
        if not notice:
            raise NotFoundError("Notice", notice_id)

        if not self._user_matches_audience(user, notice):
            raise InsufficientPermissionsError()

        # Mark as read if not already
        existing_read = self.db.query(NoticeRead).filter(
            NoticeRead.notice_id == notice_id,
            NoticeRead.user_id == user.id,
        ).first()

        if not existing_read:
            read_rec = NoticeRead(notice_id=notice_id, user_id=user.id)
            self.db.add(read_rec)
            self.db.commit()
            existing_read = read_rec

        return {
            "id": notice.id,
            "title": notice.title,
            "body": notice.body,
            "audience_json": notice.audience_json,
            "publish_at": notice.publish_at,
            "requires_ack": notice.requires_ack,
            "created_at": notice.created_at,
            "created_by_name": notice.creator.full_name if notice.creator else "Admin",
            "is_read": True,
            "is_acked": existing_read.acked_at is not None,
        }

    def acknowledge_notice(self, notice_id: int, user: User) -> None:
        notice = self.db.query(Notice).filter(Notice.id == notice_id).first()
        if not notice:
            raise NotFoundError("Notice", notice_id)

        read_rec = self.db.query(NoticeRead).filter(
            NoticeRead.notice_id == notice_id,
            NoticeRead.user_id == user.id,
        ).first()

        if not read_rec:
            read_rec = NoticeRead(notice_id=notice_id, user_id=user.id)
            self.db.add(read_rec)

        read_rec.acked_at = datetime.now(timezone.utc)
        self.db.commit()

    def get_read_receipts(self, notice_id: int, user: User) -> list[dict]:
        notice = self.db.query(Notice).filter(Notice.id == notice_id).first()
        if not notice:
            raise NotFoundError("Notice", notice_id)

        reads = (
            self.db.query(NoticeRead)
            .filter(NoticeRead.notice_id == notice_id)
            .all()
        )

        result = []
        for r in reads:
            result.append({
                "user_id": r.user_id,
                "user_name": r.user.full_name if r.user else f"User {r.user_id}",
                "read_at": r.read_at,
                "acked_at": r.acked_at,
            })
        return result
