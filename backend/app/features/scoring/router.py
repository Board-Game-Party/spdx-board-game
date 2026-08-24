from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional

from backend.app.core.database import get_db
from backend.app.core.security import get_current_user, get_classroom_or_404, check_classroom_role
from backend.app.shared.models import User, Assignment
from backend.app.features.assignment.schemas import AssignmentDetail
from backend.app.features.scoring.schemas import (
    ScoreOverrideRequest, FinalizeAssignmentRequest, ScoreRecomputeResponse, StudentScoreViewResponse
)
from backend.app.features.scoring.services import (
    recompute_assignment_scores, finalize_assignment_scores, override_score, get_student_score_view
)

router = APIRouter(tags=["Scoring & Reports"])

@router.post("/assignments/{assignmentId}:recompute", response_model=ScoreRecomputeResponse)
def recompute_endpoint(
    assignmentId: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    assignment = db.query(Assignment).filter(Assignment.id == assignmentId).first()
    if not assignment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found")
    _, member = get_classroom_or_404(assignment.classroom_id, current_user, db)
    check_classroom_role(member, ["OWNER", "CO_TEACHER", "TA"])
    return recompute_assignment_scores(db, assignment)

@router.post("/assignments/{assignmentId}:finalize", response_model=AssignmentDetail)
def finalize_endpoint(
    assignmentId: str,
    req: Optional[FinalizeAssignmentRequest] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    assignment = db.query(Assignment).filter(Assignment.id == assignmentId).first()
    if not assignment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found")
    _, member = get_classroom_or_404(assignment.classroom_id, current_user, db)
    check_classroom_role(member, ["OWNER"])
    return finalize_assignment_scores(db, assignment, req, current_user)

@router.post("/assignments/{assignmentId}/scores:override")
def override_score_endpoint(
    assignmentId: str,
    req: ScoreOverrideRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    assignment = db.query(Assignment).filter(Assignment.id == assignmentId).first()
    if not assignment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found")
    _, member = get_classroom_or_404(assignment.classroom_id, current_user, db)
    check_classroom_role(member, ["OWNER"])
    return override_score(db, assignment, req, current_user)

@router.get("/assignments/{assignmentId}/my-score", response_model=StudentScoreViewResponse)
def get_my_score_endpoint(
    assignmentId: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    assignment = db.query(Assignment).filter(Assignment.id == assignmentId).first()
    if not assignment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found")
    get_classroom_or_404(assignment.classroom_id, current_user, db)
    return get_student_score_view(db, assignment, current_user)
