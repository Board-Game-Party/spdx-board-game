from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class EvaluationItemCard(BaseModel):
    id: str
    name: str
    artifact_url: Optional[str] = None
    member_names: List[str] = []

class ComparisonItemOut(BaseModel):
    pair_assignment_id: str
    side: str  # GROUP | INDIVIDUAL
    criterion_id: str
    criterion_name: str
    criterion_description: str
    display_order: int
    left_item: EvaluationItemCard
    right_item: EvaluationItemCard
    current_choice: Optional[int] = None  # 1..6
    status: str  # DRAFT | SUBMITTED | EXCLUDED
    time_on_task_ms: int = 0
    saved_at: Optional[datetime] = None
    submitted_at: Optional[datetime] = None

class EvaluationSectionOut(BaseModel):
    criterion_id: str
    criterion_name: str
    criterion_description: str
    weight_pct: float
    comparisons: List[ComparisonItemOut] = []
    answered_count: int = 0
    total_count: int = 0

class EvaluationWorksheetResponse(BaseModel):
    assignment_id: str
    assignment_name: str
    artifact_url: str
    side: str  # GROUP | INDIVIDUAL
    status: str  # DRAFT | OPEN | CLOSED | FINALIZED
    is_submitted: bool
    deadline_utc: Optional[datetime] = None
    total_comparisons: int
    answered_comparisons: int
    progress_pct: float
    sections: List[EvaluationSectionOut] = []
    participation_ratio: float = 0.0
    participation_multiplier: float = 1.0

class SaveDraftRequest(BaseModel):
    pair_assignment_id: str
    choice: int  # 1..6
    time_on_task_ms: Optional[int] = 0

class BatchSaveDraftRequest(BaseModel):
    drafts: List[SaveDraftRequest]

class SubmitEvaluationRequest(BaseModel):
    side: str = "GROUP"  # GROUP | INDIVIDUAL
    confirm_incomplete: bool = False
    idempotency_key: Optional[str] = None

class SubmitEvaluationResponse(BaseModel):
    success: bool
    submitted_count: int
    total_assigned: int
    unanswered_count: int
    submitted_at: datetime
    message: str
