from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.core.database import get_db
from backend.app.core.security import get_current_user, get_classroom_or_404
from backend.app.shared.models import User, Assignment
from backend.app.features.evaluation.schemas import (
    EvaluationWorksheetResponse, SaveDraftRequest, BatchSaveDraftRequest,
    SubmitEvaluationRequest, SubmitEvaluationResponse
)
from backend.app.features.evaluation.services import (
    get_evaluation_worksheet, save_comparison_draft, batch_save_drafts, submit_evaluation
)

router = APIRouter(tags=["Evaluation Workflow"])

@router.get("/assignments/{assignmentId}/evaluations", response_model=EvaluationWorksheetResponse)
def get_evaluations_endpoint(
    assignmentId: str,
    side: str = Query("GROUP", enum=["GROUP", "INDIVIDUAL"]),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve personal evaluation worksheet for group or individual side"""
    assignment = db.query(Assignment).filter(Assignment.id == assignmentId).first()
    if not assignment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found")
    get_classroom_or_404(assignment.classroom_id, current_user, db)
    return get_evaluation_worksheet(db, assignment, side, current_user)

@router.post("/evaluations/draft")
def save_draft_endpoint(
    req: SaveDraftRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Autosave draft choice (1..6) and elapsed time on task"""
    comp = save_comparison_draft(db, req, current_user)
    return {"success": True, "comparison_id": comp.id, "saved_at": comp.saved_at}

@router.post("/evaluations/draft:batch")
def batch_save_draft_endpoint(
    req: BatchSaveDraftRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Batch autosave drafts for offline sync resilience"""
    comps = batch_save_drafts(db, req, current_user)
    return {"success": True, "saved_count": len(comps)}

@router.post("/assignments/{assignmentId}/evaluations:submit", response_model=SubmitEvaluationResponse)
def submit_evaluation_endpoint(
    assignmentId: str,
    req: SubmitEvaluationRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Submit evaluation responses with revision history"""
    assignment = db.query(Assignment).filter(Assignment.id == assignmentId).first()
    if not assignment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found")
    get_classroom_or_404(assignment.classroom_id, current_user, db)
    return submit_evaluation(db, assignment, req, current_user)
