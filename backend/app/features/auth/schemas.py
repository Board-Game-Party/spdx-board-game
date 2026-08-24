from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class GoogleAuthRequest(BaseModel):
    id_token: Optional[str] = None
    email: str
    display_name: Optional[str] = None
    google_sub: Optional[str] = None
    classroom_id: Optional[str] = None

class MembershipOut(BaseModel):
    id: str
    classroom_id: str
    classroom_name: str
    classroom_slug: str
    role: str
    group_id: Optional[str] = None
    group_name: Optional[str] = None
    student_id: Optional[str] = None

class UserProfileResponse(BaseModel):
    id: str
    email_normalized: str
    email_raw: str
    display_name: Optional[str] = None
    status: str
    created_at: datetime
    last_login_at: Optional[datetime] = None
    memberships: List[MembershipOut] = []

class AuthTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int = 43200
    user: UserProfileResponse
