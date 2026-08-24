from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.core.database import get_db
from backend.app.core.security import get_current_user, get_classroom_or_404, check_classroom_role
from backend.app.shared.models import User, Assignment
from backend.app.features.audit.schemas import (
    AuditEventOut, AppealOut, CreateAppealRequest, ResolveAppealRequest
)
from backend.app.features.audit.services import (
    list_audit_events, create_student_appeal, list_assignment_appeals, resolve_appeal
)

router = APIRouter(tags=["Audit & Appeals"])

@router.get("/classrooms/{classroomId}/audit", response_model=List[AuditEventOut])
def get_audit_trail_endpoint(
    classroomId: str,
    assignment_id: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve immutable audit events for classroom (Owner/Co-teacher)"""
    classroom, member = get_classroom_or_404(classroomId, current_user, db)
    check_classroom_role(member, ["OWNER", "CO_TEACHER"])
    return list_audit_events(db, classroomId, assignment_id)

@router.post("/assignments/{assignmentId}/appeals", response_model=AppealOut, status_code=201)
def submit_appeal_endpoint(
    assignmentId: str,
    req: CreateAppealRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Submit score dispute appeal within 7 days of finalization"""
    assignment = db.query(Assignment).filter(Assignment.id == assignmentId).first()
    if not assignment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found")
    get_classroom_or_404(assignment.classroom_id, current_user, db)
    return create_student_appeal(db, assignment, req, current_user)

@router.get("/assignments/{assignmentId}/appeals", response_model=List[AppealOut])
def list_appeals_endpoint(
    assignmentId: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List appeals for an assignment (Instructor only)"""
    assignment = db.query(Assignment).filter(Assignment.id == assignmentId).first()
    if not assignment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found")
    _, member = get_classroom_or_404(assignment.classroom_id, current_user, db)
    check_classroom_role(member, ["OWNER", "CO_TEACHER"])
    return list_assignment_appeals(db, assignment)

@router.post("/assignments/{assignmentId}/appeals/{appealId}:resolve", response_model=AppealOut)
def resolve_appeal_endpoint(
    assignmentId: str,
    appealId: str,
    req: ResolveAppealRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Resolve score dispute appeal with optional score override"""
    assignment = db.query(Assignment).filter(Assignment.id == assignmentId).first()
    if not assignment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found")
    _, member = get_classroom_or_404(assignment.classroom_id, current_user, db)
    check_classroom_role(member, ["OWNER", "CO_TEACHER"])
    return resolve_appeal(db, assignment, appealId, req, current_user)
