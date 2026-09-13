from pydantic import BaseModel, Field
from typing import Optional, List, Dict
from datetime import datetime
from backend.app.features.scoring.schemas import GroupScoreSummaryOut, IndividualScoreSummaryOut, CriterionScoreOut

class PairCoverageItemOut(BaseModel):
    pair_id: str
    criterion_id: str
    criterion_name: str
    side: str
    item_a_id: str
    item_a_name: str
    item_b_id: str
    item_b_name: str
    target_coverage: int
    actual_coverage: int
    mean_choice: Optional[float] = None
    is_low_coverage: bool = False
    assigned_evaluator_count: int
    submitted_evaluator_count: int

class PairCoverageReportResponse(BaseModel):
    assignment_id: str
    target_coverage: int
    total_pairs: int
    low_coverage_pair_count: int
    pairs: List[PairCoverageItemOut] = []

class GroupSummaryReportResponse(BaseModel):
    assignment_id: str
    assignment_name: str
    status: str
    group_max_score: float
    groups: List[GroupScoreSummaryOut] = []

class IndividualSummaryReportResponse(BaseModel):
    assignment_id: str
    assignment_name: str
    status: str
    total_max_score: float
    students: List[IndividualScoreSummaryOut] = []
