from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime

class AuditEventOut(BaseModel):
    id: str
    classroom_id: Optional[str] = None
    assignment_id: Optional[str] = None
    actor_user_id: str
    actor_name: str
    action: str
    resource_type: str
    resource_id: Optional[str] = None
    before_json: Optional[Dict[str, Any]] = None
    after_json: Optional[Dict[str, Any]] = None
    reason: Optional[str] = None
    ip_address: Optional[str] = None
    occurred_at: datetime

class CreateAppealRequest(BaseModel):
    message: str

class ResolveAppealRequest(BaseModel):
    status: str  # RESOLVED | REJECTED
    resolution: str
    override_score: Optional[float] = None

class AppealOut(BaseModel):
    id: str
    assignment_id: str
    assignment_name: str
    student_user_id: str
    student_name: str
    message: str
    status: str
    resolution: Optional[str] = None
    resolved_by_name: Optional[str] = None
    created_at: datetime
    resolved_at: Optional[datetime] = None
