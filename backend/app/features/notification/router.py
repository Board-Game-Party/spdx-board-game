from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.app.core.database import get_db
from backend.app.core.security import get_current_user
from backend.app.shared.models import User
from backend.app.features.notification.schemas import NotificationListResponse
from backend.app.features.notification.services import list_user_notifications, mark_notification_as_read

router = APIRouter(prefix="/notifications", tags=["Notifications"])

@router.get("", response_model=NotificationListResponse)
def get_notifications(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all milestone and task notifications for current user"""
    return list_user_notifications(db, current_user)

@router.post("/{notificationId}:read")
def mark_read(
    notificationId: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mark notification as read"""
    return mark_notification_as_read(db, notificationId, current_user)
