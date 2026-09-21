from pydantic import BaseModel, Field
from typing import Optional, List, Literal
from datetime import datetime

class CreateClassroomRequest(BaseModel):
    name: str
    slug: str
    timezone: str = "Asia/Bangkok"
    allowed_email_domains: List[str] = []

class UpdateClassroomRequest(BaseModel):
    name: Optional[str] = None
    timezone: Optional[str] = None
    allowed_email_domains: Optional[List[str]] = None
    status: Optional[Literal["ACTIVE", "ARCHIVED"]] = None

class GroupSummary(BaseModel):
    id: str
    name: str
    member_count: int

class ClassroomSummary(BaseModel):
    id: str
    name: str
    slug: str
    timezone: str
    status: str
    role: str
    member_count: int
    group_count: int
    created_at: datetime

class ClassroomMemberOut(BaseModel):
    id: str
    user_id: str
    email_raw: str
    email_normalized: str
    display_name: Optional[str] = None
    role: str
    group_id: Optional[str] = None
    group_name: Optional[str] = None
    student_id: Optional[str] = None
    user_status: str
    joined_at: datetime

class ClassroomDetail(BaseModel):
    id: str
    name: str
    slug: str
    timezone: str
    allowed_email_domains: List[str]
    status: str
    created_by: str
    created_at: datetime
    members: List[ClassroomMemberOut] = []
    groups: List[GroupSummary] = []

class AddMemberRequest(BaseModel):
    email: str
    role: Literal["CO_TEACHER", "TA", "STUDENT"]
    display_name: Optional[str] = None
    student_id: Optional[str] = None
    group_name: Optional[str] = None

class UpdateMemberRequest(BaseModel):
    role: Optional[Literal["OWNER", "CO_TEACHER", "TA", "STUDENT"]] = None
    group_name: Optional[str] = None
    student_id: Optional[str] = None

class RosterDiffItem(BaseModel):
    email: str
    student_id: Optional[str] = None
    display_name: Optional[str] = None
    old_group: Optional[str] = None
    new_group: Optional[str] = None
    action: str  # ADDED | UPDATED | UNCHANGED | REMOVED

class RosterImportResult(BaseModel):
    success: bool
    mode: str
    dry_run: bool
    total_rows: int
    imported_students: int
    groups_created: int
    warnings: List[str] = []
    diffs: List[RosterDiffItem] = []
