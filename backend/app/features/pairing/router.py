from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.core.database import get_db
from backend.app.core.security import get_current_user, get_classroom_or_404, check_classroom_role
from backend.app.shared.models import User, Assignment
from backend.app.features.assignment.schemas import AssignmentDetail
from backend.app.features.pairing.schemas import FeasibilityReportResponse, AddExtraEvaluatorsRequest
from backend.app.features.pairing.engine import (
    get_assignment_feasibility, publish_assignment_and_generate_pairs, add_extra_evaluators_to_pair
)

router = APIRouter(tags=["Pairing Engine"])

@router.get("/assignments/{assignmentId}/feasibility", response_model=FeasibilityReportResponse)
def get_feasibility_endpoint(
    assignmentId: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    assignment = db.query(Assignment).filter(Assignment.id == assignmentId).first()
    if not assignment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found")
    get_classroom_or_404(assignment.classroom_id, current_user, db)
    return get_assignment_feasibility(db, assignment)

@router.post("/assignments/{assignmentId}:publish", response_model=AssignmentDetail)
def publish_assignment_endpoint(
    assignmentId: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    assignment = db.query(Assignment).filter(Assignment.id == assignmentId).first()
    if not assignment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found")
    _, member = get_classroom_or_404(assignment.classroom_id, current_user, db)
    check_classroom_role(member, ["OWNER", "CO_TEACHER"])
    return publish_assignment_and_generate_pairs(db, assignment, current_user)

@router.post("/assignments/{assignmentId}/pairs:add-evaluators")
def add_evaluators_endpoint(
    assignmentId: str,
    req: AddExtraEvaluatorsRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    assignment = db.query(Assignment).filter(Assignment.id == assignmentId).first()
    if not assignment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found")
    _, member = get_classroom_or_404(assignment.classroom_id, current_user, db)
    check_classroom_role(member, ["OWNER", "CO_TEACHER"])
    return add_extra_evaluators_to_pair(db, assignment, req, current_user)
