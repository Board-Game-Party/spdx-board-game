from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class QualitySignalItem(BaseModel):
    signal_id: str  # QS-01..07
    signal_name: str
    severity: str  # INFO | WARNING | ALERT
    affected_entity_type: str  # EVALUATOR | ITEM | CRITERION
    affected_entity_id: str
    affected_entity_name: str
    metric_value: float
    threshold_value: float
    details: str
    recommended_action: str

class QualityReportResponse(BaseModel):
    assignment_id: str
    total_comparisons: int
    submitted_comparisons: int
    signals: List[QualitySignalItem] = []
    has_anomalies: bool
    summary: str

class ExcludeComparisonRequest(BaseModel):
    comparison_id: str
    reason: str
