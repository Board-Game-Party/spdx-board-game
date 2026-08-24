from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.core.database import get_db
from backend.app.core.security import get_current_user, get_classroom_or_404, check_classroom_role
from backend.app.shared.models import User, Assignment
from backend.app.features.integrity.schemas import QualityReportResponse, ExcludeComparisonRequest
from backend.app.features.integrity.detector import detect_quality_signals, exclude_comparison

router = APIRouter(tags=["Quality Signals & Integrity"])

@router.get("/assignments/{assignmentId}/reports/quality", response_model=QualityReportResponse)
def get_quality_report_endpoint(
    assignmentId: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    assignment = db.query(Assignment).filter(Assignment.id == assignmentId).first()
    if not assignment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found")
    _, member = get_classroom_or_404(assignment.classroom_id, current_user, db)
    check_classroom_role(member, ["OWNER", "CO_TEACHER", "TA"])
    return detect_quality_signals(db, assignment)

@router.post("/assignments/{assignmentId}/comparisons:exclude")
def exclude_comparison_endpoint(
    assignmentId: str,
    req: ExcludeComparisonRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    assignment = db.query(Assignment).filter(Assignment.id == assignmentId).first()
    if not assignment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found")
    _, member = get_classroom_or_404(assignment.classroom_id, current_user, db)
    check_classroom_role(member, ["OWNER", "CO_TEACHER"])
    return exclude_comparison(db, assignment, req, current_user)
