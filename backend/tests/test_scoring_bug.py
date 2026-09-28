import pytest
from unittest.mock import patch
from sqlalchemy.orm import Session
from backend.app.shared.models import Assignment, ClassroomMember, User, GroupEntity, ScoreOverride
from backend.app.features.scoring.services import get_student_score_view
from backend.app.features.scoring.pure_engine import ScoringEngineResult
from decimal import Decimal

@patch("backend.app.features.scoring.services.run_scoring_engine_for_assignment")
def test_override_individual_score(mock_run, db_session: Session):
    # Setup mock result
    class MockComponent:
        def __init__(self, c):
            self.component_score = c
    class MockIndiv:
        def __init__(self, c, count, net):
            self.component_score = c
            self.comparison_count = count
            self.net_score = net
            self.participation_ratio = 1.0
            self.participation_multiplier = 1.0

    mock_run.return_value = ScoringEngineResult(
        formula_version="v2.0",
        group_scores={"g1": MockComponent(12.0)},
        individual_scores={"u1": MockIndiv(3.0, 5, 15.0)},
        student_personal_scores={"u1": MockIndiv(3.0, 5, 15.0)}
    )

    # Setup DB
    u1 = User(id="u1", email="u1@test.com", display_name="User 1")
    db_session.add(u1)
    
    group = GroupEntity(id="g1", classroom_id="c1", name="Group 1")
    db_session.add(group)
    
    assignment = Assignment(
        id="a1", classroom_id="c1", name="A1", slug="a1", status="PUBLISHED",
        group_max_score=15.0, individual_max_score=5.0, min_comparisons=3
    )
    db_session.add(assignment)
    
    mem = ClassroomMember(id="m1", classroom_id="c1", user_id="u1", group_id="g1", role="STUDENT")
    db_session.add(mem)
    
    # Add override
    override = ScoreOverride(
        id="o1", assignment_id="a1", side="INDIVIDUAL", item_id="u1",
        original_value=3.0, override_value=4.0, reason="Test", created_by="u1"
    )
    db_session.add(override)
    
    db_session.commit()
    
    res = get_student_score_view(db_session, assignment, u1)
    
    assert res.group_score == 12.0
    assert res.individual_score == 4.0
    # Net score should be 12.0 + 4.0 = 16.0, not 4.0
    assert res.net_score == 16.0, f"Net score is {res.net_score}, expected 16.0"

