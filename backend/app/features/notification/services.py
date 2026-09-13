from datetime import datetime, timezone
from typing import List
from sqlalchemy.orm import Session

from backend.app.shared.models import User, Notification
from backend.app.features.notification.schemas import NotificationOut, NotificationListResponse

def list_user_notifications(db: Session, current_user: User) -> NotificationListResponse:
    """US-NOTIF-01 / FR-NOTIF-01..06: Retrieve user notifications with privacy protection (no grade leakage)."""
    notifs = db.query(Notification).filter(
        Notification.user_id == current_user.id
    ).order_by(Notification.sent_at.desc()).all()

    outs = []
    unread = 0
    for n in notifs:
        if not n.read_at:
            unread += 1
        outs.append(NotificationOut(
            id=n.id,
            user_id=n.user_id,
            type=n.type,
            payload=n.payload_json,
            sent_at=n.sent_at,
            read_at=n.read_at
        ))

    return NotificationListResponse(notifications=outs, unread_count=unread)

def mark_notification_as_read(db: Session, notif_id: str, current_user: User):
    notif = db.query(Notification).filter(
        Notification.id == notif_id,
        Notification.user_id == current_user.id
    ).first()
    if notif:
        notif.read_at = datetime.now(timezone.utc)
        db.commit()
    return {"success": True}
