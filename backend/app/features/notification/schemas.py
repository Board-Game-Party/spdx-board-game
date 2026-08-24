from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import datetime

class NotificationOut(BaseModel):
    id: str
    user_id: str
    type: str
    payload: Dict[str, Any]
    sent_at: datetime
    read_at: Optional[datetime] = None

class NotificationListResponse(BaseModel):
    notifications: List[NotificationOut] = []
    unread_count: int = 0
