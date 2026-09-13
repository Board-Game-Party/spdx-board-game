from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class FeasibilityReportResponse(BaseModel):
    is_feasible: bool
    target_coverage: int
    actual_coverage: int
    workload_per_student_per_criterion: int
    total_group_pairs: int
    total_group_comparisons_per_criterion: int
    total_students: int
    total_groups: int
    auto_reduced: bool
    explanation: str

class AddExtraEvaluatorsRequest(BaseModel):
    pair_assignment_id: Optional[str] = None
    item_a_id: str
    item_b_id: str
    criterion_id: str
    side: str = "GROUP"  # GROUP | INDIVIDUAL
    evaluator_count: int = 1
    evaluator_user_ids: Optional[List[str]] = None
    is_instructor_self: bool = False

class PairAssignmentOut(BaseModel):
    id: str
    assignment_id: str
    criterion_id: str
    criterion_name: str
    side: str
    item_a_id: str
    item_a_name: str
    item_b_id: str
    item_b_name: str
    evaluator_user_id: str
    display_left_item_id: str
    generation: int
    source: str
    created_at: datetime
