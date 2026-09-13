from typing import List, Optional
from fastapi import APIRouter, Depends, UploadFile, File, Form, Query
from sqlalchemy.orm import Session

from backend.app.core.database import get_db
from backend.app.core.security import get_current_user, get_classroom_or_404, check_classroom_role
from backend.app.shared.models import User
from backend.app.features.classroom.schemas import (
    CreateClassroomRequest, UpdateClassroomRequest, ClassroomDetail, ClassroomSummary,
    ClassroomMemberOut, AddMemberRequest, RosterImportResult
)
from backend.app.features.classroom.services import (
    create_classroom, update_classroom, list_user_classrooms, get_classroom_detail,
    add_classroom_member, remove_classroom_member, import_roster_csv
)

router = APIRouter(prefix="/classrooms", tags=["Classrooms & Roster"])

@router.get("", response_model=List[ClassroomSummary])
def list_classrooms(
    status: str = Query("ACTIVE", enum=["ACTIVE", "ARCHIVED", "ALL"]),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List classrooms for current user"""
    return list_user_classrooms(db, current_user, status)

@router.post("", response_model=ClassroomDetail, status_code=201)
def create_new_classroom(
    req: CreateClassroomRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new classroom"""
    return create_classroom(db, req, current_user)

@router.get("/{classroomId}", response_model=ClassroomDetail)
def get_single_classroom(
    classroomId: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get single classroom details (enforces 404 isolation)"""
    classroom, _ = get_classroom_or_404(classroomId, current_user, db)
    return get_classroom_detail(db, classroom)

@router.patch("/{classroomId}", response_model=ClassroomDetail)
def update_single_classroom(
    classroomId: str,
    req: UpdateClassroomRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update or archive classroom (Owner or Co-Teacher only)"""
    classroom, member = get_classroom_or_404(classroomId, current_user, db)
    check_classroom_role(member, ["OWNER", "CO_TEACHER"])
    return update_classroom(db, classroom, req)

@router.post("/{classroomId}/members", response_model=ClassroomMemberOut, status_code=201)
def add_member(
    classroomId: str,
    req: AddMemberRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add Co-Teacher, TA, or Student to classroom"""
    classroom, member = get_classroom_or_404(classroomId, current_user, db)
    check_classroom_role(member, ["OWNER", "CO_TEACHER"])
    return add_classroom_member(db, classroom, req)

@router.delete("/{classroomId}/members/{memberId}", status_code=204)
def remove_member(
    classroomId: str,
    memberId: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Remove member from classroom (prevents deleting last Owner)"""
    classroom, member = get_classroom_or_404(classroomId, current_user, db)
    check_classroom_role(member, ["OWNER", "CO_TEACHER"])
    remove_classroom_member(db, classroom, memberId)
    return None

@router.post("/{classroomId}/roster:import", response_model=RosterImportResult)
async def import_roster(
    classroomId: str,
    file: UploadFile = File(...),
    mode: str = Form("UPSERT"),
    dry_run: bool = Form(False),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Atomic CSV Roster Import and Upsert with diff preview support"""
    classroom, member = get_classroom_or_404(classroomId, current_user, db)
    check_classroom_role(member, ["OWNER", "CO_TEACHER", "TA"])
    content_bytes = await file.read()
    content_str = content_bytes.decode("utf-8-sig", errors="replace")
    return import_roster_csv(db, classroom, content_str, mode=mode, dry_run=dry_run)
