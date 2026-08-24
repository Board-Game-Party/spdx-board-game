from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.core.database import get_db
from backend.app.core.security import get_current_user, get_classroom_or_404, check_classroom_role
from backend.app.shared.models import User, Assignment
from backend.app.features.reporting.schemas import (
    GroupSummaryReportResponse, IndividualSummaryReportResponse, PairCoverageReportResponse
)
from backend.app.features.reporting.services import (
    get_group_summary_report, get_individual_summary_report, get_pair_coverage_report
)
from backend.app.features.reporting.export import export_assignment_csv, export_assignment_xlsx

router = APIRouter(tags=["Reports & Data Export"])

@router.get("/assignments/{assignmentId}/reports/group", response_model=GroupSummaryReportResponse)
def get_group_report_endpoint(
    assignmentId: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    assignment = db.query(Assignment).filter(Assignment.id == assignmentId).first()
    if not assignment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found")
    _, member = get_classroom_or_404(assignment.classroom_id, current_user, db)
    check_classroom_role(member, ["OWNER", "CO_TEACHER", "TA"])
    return get_group_summary_report(db, assignment)

@router.get("/assignments/{assignmentId}/reports/individual", response_model=IndividualSummaryReportResponse)
def get_individual_report_endpoint(
    assignmentId: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    assignment = db.query(Assignment).filter(Assignment.id == assignmentId).first()
    if not assignment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found")
    _, member = get_classroom_or_404(assignment.classroom_id, current_user, db)
    check_classroom_role(member, ["OWNER", "CO_TEACHER", "TA"])
    return get_individual_summary_report(db, assignment)

@router.get("/assignments/{assignmentId}/reports/coverage", response_model=PairCoverageReportResponse)
def get_coverage_report_endpoint(
    assignmentId: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    assignment = db.query(Assignment).filter(Assignment.id == assignmentId).first()
    if not assignment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found")
    _, member = get_classroom_or_404(assignment.classroom_id, current_user, db)
    check_classroom_role(member, ["OWNER", "CO_TEACHER", "TA"])
    return get_pair_coverage_report(db, assignment)

@router.get("/assignments/{assignmentId}/export/csv")
def export_csv_endpoint(
    assignmentId: str,
    report: str = Query("group", enum=["group", "individual", "coverage", "raw"]),
    mask_identities: bool = Query(True),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    assignment = db.query(Assignment).filter(Assignment.id == assignmentId).first()
    if not assignment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found")
    _, member = get_classroom_or_404(assignment.classroom_id, current_user, db)
    if not mask_identities:
        check_classroom_role(member, ["OWNER"])
    else:
        check_classroom_role(member, ["OWNER", "CO_TEACHER"])
    return export_assignment_csv(db, assignment, report, mask_identities=mask_identities, current_user=current_user)

@router.get("/assignments/{assignmentId}/export/xlsx")
def export_xlsx_endpoint(
    assignmentId: str,
    mask_identities: bool = Query(True),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    assignment = db.query(Assignment).filter(Assignment.id == assignmentId).first()
    if not assignment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found")
    _, member = get_classroom_or_404(assignment.classroom_id, current_user, db)
    check_classroom_role(member, ["OWNER", "CO_TEACHER"])
    return export_assignment_xlsx(db, assignment, mask_identities=mask_identities, current_user=current_user)
