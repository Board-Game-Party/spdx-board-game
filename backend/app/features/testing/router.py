"""E2E test support endpoints.

Registered in main.py only when NODE_ENV is "development" or "test".
Every operation is scoped to rows that carry the E2E prefix, so a
developer's own data in the same database is never touched.
"""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.app.core.database import get_db
from backend.app.shared.models import (
    AuditEvent, Classroom, ClassroomMember, Notification, User,
)

router = APIRouter(prefix="/test", tags=["testing"])

E2E_EMAIL_DOMAIN = "e2e.test"
E2E_SLUG_PREFIX = "e2e-"
SEED_EMAIL = f"teacher@{E2E_EMAIL_DOMAIN}"
SEED_SLUG = f"{E2E_SLUG_PREFIX}existing"


def _cleanup(db: Session) -> None:
    users = db.query(User).filter(
        User.email_normalized.like(f"%@{E2E_EMAIL_DOMAIN}")
    ).all()
    user_ids = [u.id for u in users]
    classrooms = db.query(Classroom).filter(
        Classroom.slug.like(f"{E2E_SLUG_PREFIX}%")
    ).all()
    class_ids = [c.id for c in classrooms]

    if class_ids:
        db.query(AuditEvent).filter(AuditEvent.classroom_id.in_(class_ids)).delete(
            synchronize_session=False
        )
    if user_ids:
        db.query(AuditEvent).filter(AuditEvent.actor_user_id.in_(user_ids)).delete(
            synchronize_session=False
        )
        db.query(Notification).filter(Notification.user_id.in_(user_ids)).delete(
            synchronize_session=False
        )
    for classroom in classrooms:
        db.delete(classroom)  # ORM cascade removes members, groups, assignments
    db.flush()
    for user in users:
        db.delete(user)
    db.commit()


@router.post("/seed")
def seed(db: Session = Depends(get_db)):
    _cleanup(db)
    teacher = User(
        email_normalized=SEED_EMAIL,
        email_raw=SEED_EMAIL,
        display_name="E2E Teacher",
        status="ACTIVE",
        last_login_at=datetime.now(timezone.utc),
    )
    db.add(teacher)
    db.flush()
    classroom = Classroom(
        name="E2E Existing Classroom", slug=SEED_SLUG, created_by=teacher.id
    )
    db.add(classroom)
    db.flush()
    db.add(ClassroomMember(
        classroom_id=classroom.id, user_id=teacher.id, role="OWNER"
    ))
    db.commit()
    return {"email": SEED_EMAIL, "classroom_slug": SEED_SLUG}


@router.post("/cleanup")
def cleanup(db: Session = Depends(get_db)):
    _cleanup(db)
    return {"status": "cleaned"}
