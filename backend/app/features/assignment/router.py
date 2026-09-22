from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.app.core.database import get_db
from backend.app.core.security import get_current_user, get_classroom_or_404, check_classroom_role
from backend.app.shared.models import User, Assignment
from backend.app.features.assignment.schemas import (
    CreateAssignmentRequest, UpdateAssignmentRequest, AssignmentDetail, AssignmentSummary, ReasonedActionRequest
)
from backend.app.features.assignment.services import (
    create_assignment, update_assignment, list_assignments, get_assignment_detail,
    unpublish_assignment, reopen_assignment, delete_assignment
)

router = APIRouter(tags=["Assignments & Criteria"])

@router.get("/classrooms/{classroomId}/assignments", response_model=List[AssignmentSummary])
def list_assignments_endpoint(
    classroomId: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    classroom, _ = get_classroom_or_404(classroomId, current_user, db)
    return list_assignments(db, classroom)

@router.post("/classrooms/{classroomId}/assignments", response_model=AssignmentDetail, status_code=201)
def create_assignment_endpoint(
    classroomId: str,
    req: CreateAssignmentRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    classroom, member = get_classroom_or_404(classroomId, current_user, db)
    check_classroom_role(member, ["OWNER", "CO_TEACHER"])
    return create_assignment(db, classroom, req, current_user)

@router.get("/assignments/{assignmentId}", response_model=AssignmentDetail)
def get_assignment_endpoint(
    assignmentId: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    assignment = db.query(Assignment).filter(Assignment.id == assignmentId).first()
    if not assignment:
        from fastapi import HTTPException, status
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found")
    get_classroom_or_404(assignment.classroom_id, current_user, db)
    return get_assignment_detail(db, assignment)

@router.patch("/assignments/{assignmentId}", response_model=AssignmentDetail)
def update_assignment_endpoint(
    assignmentId: str,
    req: UpdateAssignmentRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    assignment = db.query(Assignment).filter(Assignment.id == assignmentId).first()
    if not assignment:
        from fastapi import HTTPException, status
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found")
    _, member = get_classroom_or_404(assignment.classroom_id, current_user, db)
    check_classroom_role(member, ["OWNER", "CO_TEACHER"])
    return update_assignment(db, assignment, req, current_user)

@router.post("/assignments/{assignmentId}:unpublish", response_model=AssignmentDetail)
def unpublish_endpoint(
    assignmentId: str,
    req: ReasonedActionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    assignment = db.query(Assignment).filter(Assignment.id == assignmentId).first()
    if not assignment:
        from fastapi import HTTPException, status
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found")
    _, member = get_classroom_or_404(assignment.classroom_id, current_user, db)
    check_classroom_role(member, ["OWNER", "CO_TEACHER"])
    return unpublish_assignment(db, assignment, req, current_user)

@router.post("/assignments/{assignmentId}:reopen", response_model=AssignmentDetail)
def reopen_endpoint(
    assignmentId: str,
    req: ReasonedActionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    assignment = db.query(Assignment).filter(Assignment.id == assignmentId).first()
    if not assignment:
        from fastapi import HTTPException, status
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found")
    _, member = get_classroom_or_404(assignment.classroom_id, current_user, db)
    check_classroom_role(member, ["OWNER", "CO_TEACHER"])
    return reopen_assignment(db, assignment, req, current_user)

@router.delete("/assignments/{assignmentId}", status_code=204)
def delete_assignment_endpoint(
    assignmentId: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    assignment = db.query(Assignment).filter(Assignment.id == assignmentId).first()
    if not assignment:
        from fastapi import HTTPException, status
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found")
    _, member = get_classroom_or_404(assignment.classroom_id, current_user, db)
    check_classroom_role(member, ["OWNER", "CO_TEACHER"])
    delete_assignment(db, assignment)
    return None
