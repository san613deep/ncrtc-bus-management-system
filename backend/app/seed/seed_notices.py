"""
seed/seed_notices.py — Seed Sample Notices
============================================
Creates 3 notices: one read, one unread, one requiring acknowledgment.
"""

import json
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from app.models.notice import Notice
from app.models.notice_read import NoticeRead
from app.models.user import User


def seed_notices(db: Session):
    """Seed sample notices. Idempotent."""
    existing = db.query(Notice).count()
    if existing > 0:
        print(f"    (Notices already seeded: {existing} found, skipping)")
        return

    admin = db.query(User).filter(User.username == "admin").first()
    driver1 = db.query(User).filter(User.username == "driver1").first()
    driver2 = db.query(User).filter(User.username == "driver2").first()

    if not admin:
        print("    (Admin user not found — seed users first)")
        return

    now = datetime.now(timezone.utc)

    notices = [
        Notice(
            title="🔧 Monthly Vehicle Inspection — Action Required",
            body="""Dear Drivers,

All vehicles are due for monthly inspection on **15th June 2025**.

Please bring your vehicle to the depot service bay by 8:00 AM.
Documents required:
- Vehicle log book
- Previous inspection report

Any questions, contact your depot manager.

Thank you,
NCRTC Operations Team""",
            audience_json=json.dumps({"type": "all"}),
            publish_at=now - timedelta(days=2),
            created_by=admin.id,
            requires_ack=True,
        ),
        Notice(
            title="📢 Route Change: RT-NDA-01 Effective 1st June",
            body="""**Notice to all Noida Depot drivers:**

Route RT-NDA-01 will have an additional stop at **Sector 62 Metro Station** effective 1st June 2025.

Updated route:
- Sector 37 Depot → Sector 18 → **Sector 62 Metro** → Botanical Garden

Updated timetables will be distributed by your manager.

Operations Dept, NCRTC""",
            audience_json=json.dumps({"type": "depot", "depot_id": 1}),
            publish_at=now - timedelta(days=1),
            created_by=admin.id,
            requires_ack=False,
        ),
        Notice(
            title="☀️ Summer Schedule — Revised Shift Timings",
            body="""Due to extreme heat conditions, the following shift adjustments are effective immediately:

- Morning shift: 5:00 AM – 11:00 AM (earlier start)
- Afternoon shift: 3:30 PM – 9:30 PM (later start to avoid peak heat)
- All drivers are entitled to one 15-minute cooling break per shift

Please acknowledge this notice. Your health and safety is our priority.

NCRTC HR & Operations""",
            audience_json=json.dumps({"type": "role", "role": "driver"}),
            publish_at=now - timedelta(hours=6),
            created_by=admin.id,
            requires_ack=True,
        ),
    ]

    for notice in notices:
        db.add(notice)
    db.flush()

    # Simulate some read receipts
    if driver1 and len(notices) >= 2:
        # driver1 has read the first two notices
        db.add(NoticeRead(notice_id=notices[0].id, user_id=driver1.id,
                          acked_at=now - timedelta(days=1)))
        db.add(NoticeRead(notice_id=notices[1].id, user_id=driver1.id))

    if driver2:
        # driver2 has only read the route change notice
        db.add(NoticeRead(notice_id=notices[1].id, user_id=driver2.id))

    db.commit()
    print(f"    Created {len(notices)} sample notices with read receipts")
