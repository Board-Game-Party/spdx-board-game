from typing import List, Optional
from fastapi import APIRouter, Depends, UploadFile, File, Form, Query, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.core.database import get_db
from backend.app.core.security import get_current_user, get_classroom_or_404, check_classroom_role
from backend.app.shared.models import User, ClassroomMember
from backend.app.features.classroom.schemas import (
    CreateClassroomRequest, UpdateClassroomRequest, ClassroomDetail, ClassroomSummary,
    ClassroomMemberOut, AddMemberRequest, UpdateMemberRequest, RosterImportResult
)
from backend.app.features.classroom.services import (
    create_classroom, update_classroom, list_user_classrooms, get_classroom_detail,
    add_classroom_member, update_classroom_member, remove_classroom_member, import_roster_csv
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

@router.patch("/{classroomId}/members/{memberId}", response_model=ClassroomMemberOut)
def update_member(
    classroomId: str,
    memberId: str,
    req: UpdateMemberRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update member role, group, or student_id (Owner or Co-Teacher)"""
    classroom, member = get_classroom_or_404(classroomId, current_user, db)
    check_classroom_role(member, ["OWNER", "CO_TEACHER"])

    target_member = db.query(ClassroomMember).filter(
        ClassroomMember.id == memberId,
        ClassroomMember.classroom_id == classroom.id
    ).first()
    if not target_member:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found")

    if member.role == "CO_TEACHER" and target_member.role == "OWNER":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="CO_TEACHER cannot modify an OWNER"
        )

    if req.role == "OWNER" and member.role != "OWNER":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Owners can grant the OWNER role"
        )

    updated = update_classroom_member(db, classroom, memberId, req)
    g_name = updated.group.name if updated.group else None
    return ClassroomMemberOut(
        id=updated.id,
        user_id=updated.user_id,
        email_raw=updated.user.email_raw,
        email_normalized=updated.user.email_normalized,
        display_name=updated.user.display_name,
        role=updated.role,
        group_id=updated.group_id,
        group_name=g_name,
        student_id=updated.student_id,
        user_status=updated.user.status,
        joined_at=updated.joined_at
    )

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

    target_member = db.query(ClassroomMember).filter(
        ClassroomMember.id == memberId,
        ClassroomMember.classroom_id == classroom.id
    ).first()
    if not target_member:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found")

    if member.role == "CO_TEACHER" and target_member.role == "OWNER":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="CO_TEACHER cannot delete an OWNER"
        )

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
