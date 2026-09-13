from pydantic import BaseModel, Field
from typing import Optional, List, Dict
from datetime import datetime

class CriterionScoreOut(BaseModel):
    criterion_id: str
    criterion_name: str
    side: str
    weight_pct: float
    comparison_count: int
    effective_weight_sum: float
    quality_index: float
    score_ratio: float
    weighted_score: float
    flags: List[str] = []

class GroupScoreSummaryOut(BaseModel):
    group_id: str
    group_name: str
    component_score: float
    max_score: float
    comparison_count: int
    flags: List[str] = []
    criteria_breakdown: List[CriterionScoreOut] = []
    is_overridden: bool = False
    override_score: Optional[float] = None
    override_reason: Optional[str] = None

class IndividualScoreSummaryOut(BaseModel):
    student_user_id: str
    display_name: str
    email: str
    student_id: Optional[str] = None
    group_id: Optional[str] = None
    group_name: Optional[str] = None
    group_component_score: float
    individual_component_score: float
    raw_total_score: float
    assigned_comparisons: int
    submitted_comparisons: int
    participation_ratio: float
    participation_multiplier: float
    net_final_score: float
    max_possible_score: float
    flags: List[str] = []
    criteria_breakdown: List[CriterionScoreOut] = []
    is_overridden: bool = False
    override_score: Optional[float] = None
    override_reason: Optional[str] = None

class ScoreOverrideRequest(BaseModel):
    side: str  # GROUP | INDIVIDUAL
    item_id: str  # group_id or student_user_id
    criterion_id: Optional[str] = None
    override_value: float
    reason: str

class FinalizeAssignmentRequest(BaseModel):
    allow_low_confidence: bool = False
    notes: Optional[str] = None

class ScoreRecomputeResponse(BaseModel):
    success: bool
    formula_version: str
    groups_computed: int
    students_computed: int
    computed_at: datetime
    message: str

class StudentScoreViewResponse(BaseModel):
    assignment_id: str
    assignment_name: str
    group_name: Optional[str] = None
    group_score: float
    group_max_score: float
    individual_score: Optional[float] = None
    individual_max_score: float
    participation_ratio: float
    participation_multiplier: float
    net_score: float
    total_max_score: float
    is_final: bool
    status_label: str
    k_anonymity_satisfied: bool
    k_anonymity_notice: Optional[str] = None
