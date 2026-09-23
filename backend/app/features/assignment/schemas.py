from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class CriterionInput(BaseModel):
    id: Optional[str] = None
    side: str = "GROUP"  # GROUP | INDIVIDUAL
    name: str
    description: str = ""
    weight_pct: float
    display_order: int = 0

class CriterionOut(BaseModel):
    id: str
    assignment_id: str
    side: str
    name: str
    description: str
    weight_pct: float
    display_order: int

class CreateAssignmentRequest(BaseModel):
    name: str
    slug: str
    description: str = ""
    artifact_url: str = ""
    group_max_score: float = 15.0
    individual_max_score: float = 5.0
    group_deadline_utc: Optional[datetime] = None
    individual_deadline_utc: Optional[datetime] = None
    instructor_weight: float = 1.0
    target_coverage: int = 5
    max_workload: int = 8
    min_comparisons: int = 3
    score_floor: float = 0.600
    score_ceiling: float = 1.000
    completion_threshold: float = 0.900
    pairing_seed: Optional[int] = None
    criteria: List[CriterionInput] = []

class UpdateAssignmentRequest(BaseModel):
    name: Optional[str] = None
    slug: Optional[str] = None
    description: Optional[str] = None
    artifact_url: Optional[str] = None
    group_max_score: Optional[float] = None
    individual_max_score: Optional[float] = None
    group_deadline_utc: Optional[datetime] = None
    individual_deadline_utc: Optional[datetime] = None
    instructor_weight: Optional[float] = None
    target_coverage: Optional[int] = None
    max_workload: Optional[int] = None
    min_comparisons: Optional[int] = None
    score_floor: Optional[float] = None
    score_ceiling: Optional[float] = None
    completion_threshold: Optional[float] = None
    pairing_seed: Optional[int] = None
    criteria: Optional[List[CriterionInput]] = None

class ReasonedActionRequest(BaseModel):
    reason: str

class AssignmentSummary(BaseModel):
    id: str
    classroom_id: str
    name: str
    slug: str
    status: str
    group_max_score: float
    individual_max_score: float
    group_deadline_utc: Optional[datetime] = None
    individual_deadline_utc: Optional[datetime] = None
    created_at: datetime
    published_at: Optional[datetime] = None
    finalized_at: Optional[datetime] = None

class AssignmentDetail(BaseModel):
    id: str
    classroom_id: str
    name: str
    slug: str
    description: str
    artifact_url: str
    group_max_score: float
    individual_max_score: float
    group_deadline_utc: Optional[datetime] = None
    individual_deadline_utc: Optional[datetime] = None
    instructor_weight: float
    target_coverage: int
    max_workload: int
    min_comparisons: int
    score_floor: float
    score_ceiling: float
    completion_threshold: float
    scoring_formula_version: str
    pairing_seed: Optional[int] = None
    status: str
    published_at: Optional[datetime] = None
    finalized_at: Optional[datetime] = None
    created_by: str
    created_at: datetime
    criteria: List[CriterionOut] = []
    group_pair_count: int = 0
    individual_pair_count: int = 0
