from decimal import Decimal
from datetime import datetime, timezone
from typing import List, Optional, Dict, Tuple
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from backend.app.shared.models import (
    Assignment, Criterion, ClassroomMember, User, GroupEntity,
    PairAssignment, Comparison, ComputedScore, ScoreOverride, AuditEvent, Notification
)
from backend.app.features.assignment.services import get_assignment_detail
from backend.app.features.scoring.pure_engine import (
    AssignmentScoringConfig, CriterionConfig, RawComparisonInput,
    compute_quality_index_and_scores, ScoringEngineResult
)
from backend.app.features.scoring.schemas import (
    GroupScoreSummaryOut, IndividualScoreSummaryOut, CriterionScoreOut,
    ScoreOverrideRequest, FinalizeAssignmentRequest, ScoreRecomputeResponse,
    StudentScoreViewResponse
)

def run_scoring_engine_for_assignment(
    db: Session,
    assignment: Assignment
) -> ScoringEngineResult:
    """Extracts DB data, feeds into AR-01 Pure Function Scoring Engine, returns calculated result."""
    criteria = db.query(Criterion).filter(Criterion.assignment_id == assignment.id).all()
    criteria_configs = [
        CriterionConfig(
            id=c.id,
            side=c.side,
            name=c.name,
            weight_pct=Decimal(str(c.weight_pct))
        )
        for c in criteria
    ]

    config = AssignmentScoringConfig(
        assignment_id=assignment.id,
        group_max_score=Decimal(str(assignment.group_max_score)),
        individual_max_score=Decimal(str(assignment.individual_max_score)),
        score_floor=Decimal(str(assignment.score_floor)),
        score_ceiling=Decimal(str(assignment.score_ceiling)),
        instructor_weight=Decimal(str(assignment.instructor_weight)),
        completion_threshold=Decimal(str(assignment.completion_threshold)),
        min_comparisons=assignment.min_comparisons,
        formula_version=assignment.scoring_formula_version
    )

    # Instructors in classroom
    instructor_members = db.query(ClassroomMember).filter(
        ClassroomMember.classroom_id == assignment.classroom_id,
        ClassroomMember.role.in_(["OWNER", "CO_TEACHER"])
    ).all()
    instructor_user_ids = set(m.user_id for m in instructor_members)

    all_pairs = db.query(PairAssignment).filter(PairAssignment.assignment_id == assignment.id).all()
    all_comparisons = db.query(Comparison).join(
        PairAssignment, Comparison.pair_assignment_id == PairAssignment.id
    ).filter(PairAssignment.assignment_id == assignment.id).all()

    raw_comps = []
    for c in all_comparisons:
        if c.status == "EXCLUDED":
            continue
        p = c.pair_assignment
        is_inst = (c.evaluator_user_id in instructor_user_ids) or (p.source in ["INSTRUCTOR_SELF", "INSTRUCTOR_EXTRA"])
        raw_comps.append(
            RawComparisonInput(
                pair_assignment_id=p.id,
                criterion_id=p.criterion_id,
                side=p.side,
                item_a_id=p.item_a_id,
                item_b_id=p.item_b_id,
                display_left_item_id=p.display_left_item_id,
                evaluator_user_id=c.evaluator_user_id,
                evaluator_is_instructor=is_inst,
                choice=c.choice or 0,
                status=c.status
            )
        )

    students = db.query(ClassroomMember).filter(
        ClassroomMember.classroom_id == assignment.classroom_id,
        ClassroomMember.role == "STUDENT"
    ).all()
    student_group_mapping = {s.user_id: s.group_id for s in students}

    # Find small groups (m=3) for confidence flagging (FR-PAIR-13)
    groups = db.query(GroupEntity).filter(GroupEntity.classroom_id == assignment.classroom_id).all()
    small_group_ids = set()
    for g in groups:
        m_cnt = db.query(ClassroomMember).filter(
            ClassroomMember.classroom_id == assignment.classroom_id,
            ClassroomMember.group_id == g.id,
            ClassroomMember.role == "STUDENT"
        ).count()
        if m_cnt == 3:
            small_group_ids.add(g.id)

    return compute_quality_index_and_scores(
        config=config,
        criteria=criteria_configs,
        all_comparisons=raw_comps,
        all_assigned_pairs=all_pairs,
        student_group_mapping=student_group_mapping,
        small_group_ids=small_group_ids
    )

def persist_computed_scores(
    db: Session,
    assignment: Assignment,
    result: ScoringEngineResult,
    is_final: bool = False
):
    """Persists computed scores to computed_scores table."""
    now_utc = datetime.now(timezone.utc)
    if is_final:
        # Immutable snapshot (DR-03)
        db.query(ComputedScore).filter(
            ComputedScore.assignment_id == assignment.id,
            ComputedScore.is_final == True
        ).delete()
    else:
        db.query(ComputedScore).filter(
            ComputedScore.assignment_id == assignment.id,
            ComputedScore.is_final == False
        ).delete()

    # Save group criteria scores
    for g_id, g_total in result.group_scores.items():
        for cr_id, cr_score in g_total.criterion_scores.items():
            db.add(ComputedScore(
                assignment_id=assignment.id,
                criterion_id=cr_id,
                side="GROUP",
                item_id=g_id,
                comparison_count=cr_score.comparison_count,
                effective_weight_sum=float(cr_score.effective_weight_sum),
                quality_index=float(cr_score.quality_index),
                score_ratio=float(cr_score.score_ratio),
                weighted_score=float(cr_score.weighted_score),
                flags=cr_score.flags,
                is_final=is_final,
                formula_version=result.formula_version,
                computed_at=now_utc
            ))

    # Save individual criteria scores
    for u_id, u_total in result.individual_scores.items():
        for cr_id, cr_score in u_total.criterion_scores.items():
            db.add(ComputedScore(
                assignment_id=assignment.id,
                criterion_id=cr_id,
                side="INDIVIDUAL",
                item_id=u_id,
                comparison_count=cr_score.comparison_count,
                effective_weight_sum=float(cr_score.effective_weight_sum),
                quality_index=float(cr_score.quality_index),
                score_ratio=float(cr_score.score_ratio),
                weighted_score=float(cr_score.weighted_score),
                flags=cr_score.flags,
                is_final=is_final,
                formula_version=result.formula_version,
                computed_at=now_utc
            ))

    db.commit()

def recompute_assignment_scores(
    db: Session,
    assignment: Assignment
) -> ScoreRecomputeResponse:
    result = run_scoring_engine_for_assignment(db, assignment)
    persist_computed_scores(db, assignment, result, is_final=False)
    return ScoreRecomputeResponse(
        success=True,
        formula_version=result.formula_version,
        groups_computed=len(result.group_scores),
        students_computed=len(result.student_personal_scores),
        computed_at=datetime.now(timezone.utc),
        message="Interim scores computed successfully."
    )

def finalize_assignment_scores(
    db: Session,
    assignment: Assignment,
    req: Optional[FinalizeAssignmentRequest],
    current_user: User
):
    """
    US-SCORE-03 / FR-SCORE-09 / US-ASSIGN-03 / US-NOTIF-01:
    Validate low confidence, take immutable snapshot, transition to FINALIZED.
    """
    result = run_scoring_engine_for_assignment(db, assignment)

    # Check low confidence items
    low_conf_items = []
    for g_id, g in result.group_scores.items():
        if "LOW_CONFIDENCE" in g.flags:
            low_conf_items.append(f"Group {g_id}")
    for u_id, u in result.individual_scores.items():
        if "LOW_CONFIDENCE" in u.flags:
            low_conf_items.append(f"Student {u_id}")

    allow_low = req.allow_low_confidence if req else False
    if low_conf_items and not allow_low:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Cannot finalize: {len(low_conf_items)} item(s) have LOW_CONFIDENCE flag. Set allow_low_confidence=True to proceed."
        )

    # Save immutable snapshot
    persist_computed_scores(db, assignment, result, is_final=True)

    assignment.status = "FINALIZED"
    assignment.finalized_at = datetime.now(timezone.utc)

    # Log audit event (FR-AUDIT-01)
    audit = AuditEvent(
        classroom_id=assignment.classroom_id,
        assignment_id=assignment.id,
        actor_user_id=current_user.id,
        action="FINALIZE",
        resource_type="ASSIGNMENT",
        resource_id=assignment.id,
        reason=req.notes if req and req.notes else "Finalize assignment scores"
    )
    audit.after_json = {
        "status": "FINALIZED",
        "groups_finalized": len(result.group_scores),
        "students_finalized": len(result.student_personal_scores)
    }
    db.add(audit)

    # Notify students (FR-NOTIF-04)
    students = db.query(ClassroomMember).filter(
        ClassroomMember.classroom_id == assignment.classroom_id,
        ClassroomMember.role == "STUDENT"
    ).all()
    for s in students:
        notif = Notification(
            user_id=s.user_id,
            type="FINALIZED"
        )
        notif.payload_json = {
            "assignment_id": assignment.id,
            "assignment_name": assignment.name,
            "message": f"ผลคะแนนงาน '{assignment.name}' ได้รับการยืนยัน (Finalized) เรียบร้อยแล้ว"
        }
        db.add(notif)

    db.commit()
    db.refresh(assignment)
    return get_assignment_detail(db, assignment)

def override_score(
    db: Session,
    assignment: Assignment,
    req: ScoreOverrideRequest,
    current_user: User
):
    """
    US-SCORE-04 / FR-SCORE-08 / DR-03:
    Override calculated group or individual score with mandatory reason.
    """
    if not req.reason or not req.reason.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mandatory justification reason required for score override."
        )

    # Get original score
    result = run_scoring_engine_for_assignment(db, assignment)
    if req.side == "GROUP":
        orig = float(result.group_scores[req.item_id].component_score) if req.item_id in result.group_scores else 0.0
    else:
        orig = float(result.student_personal_scores[req.item_id].net_score) if req.item_id in result.student_personal_scores else 0.0

    override = ScoreOverride(
        assignment_id=assignment.id,
        side=req.side,
        item_id=req.item_id,
        criterion_id=req.criterion_id,
        original_value=orig,
        override_value=req.override_value,
        reason=req.reason,
        created_by=current_user.id
    )
    db.add(override)

    # Log audit event (FR-AUDIT-01)
    audit = AuditEvent(
        classroom_id=assignment.classroom_id,
        assignment_id=assignment.id,
        actor_user_id=current_user.id,
        action="OVERRIDE",
        resource_type="SCORE",
        resource_id=req.item_id,
        reason=req.reason
    )
    audit.before_json = {"score": orig}
    audit.after_json = {"score": req.override_value, "side": req.side}
    db.add(audit)

    db.commit()
    return {"success": True, "original_value": orig, "override_value": req.override_value, "reason": req.reason}

def get_student_score_view(
    db: Session,
    assignment: Assignment,
    current_user: User
) -> StudentScoreViewResponse:
    """
    US-REPORT-03 / FR-REPORT-06 / FR-ANON-01..04:
    Student's personal score report with k-anonymity enforcement.
    """
    result = run_scoring_engine_for_assignment(db, assignment)
    mem = db.query(ClassroomMember).filter(
        ClassroomMember.classroom_id == assignment.classroom_id,
        ClassroomMember.user_id == current_user.id
    ).first()

    group_name = mem.group.name if mem and mem.group else None
    g_id = mem.group_id if mem else None

    # Check override
    g_override = db.query(ScoreOverride).filter(
        ScoreOverride.assignment_id == assignment.id,
        ScoreOverride.side == "GROUP",
        ScoreOverride.item_id == g_id
    ).order_by(ScoreOverride.created_at.desc()).first()

    u_override = db.query(ScoreOverride).filter(
        ScoreOverride.assignment_id == assignment.id,
        ScoreOverride.side == "INDIVIDUAL",
        ScoreOverride.item_id == current_user.id
    ).order_by(ScoreOverride.created_at.desc()).first()

    grp_score = float(g_override.override_value) if g_override else (float(result.group_scores[g_id].component_score) if g_id in result.group_scores else 0.0)

    # Check k-anonymity (FR-ANON-02: must have received >= 3 comparisons)
    indiv_received_count = result.individual_scores[current_user.id].comparison_count if current_user.id in result.individual_scores else 0
    k_satisfied = (indiv_received_count >= assignment.min_comparisons) or (float(assignment.individual_max_score) == 0)

    if float(assignment.individual_max_score) > 0:
        if k_satisfied:
            indiv_score = float(u_override.override_value) if u_override else (float(result.individual_scores[current_user.id].component_score) if current_user.id in result.individual_scores else 0.0)
            k_notice = None
        else:
            indiv_score = None
            k_notice = "ยังมีข้อมูลไม่เพียงพอ (อยู่ระหว่างการเก็บผลประเมินตามเกณฑ์ k-anonymity)"
    else:
        indiv_score = 0.0
        k_notice = None

    personal = result.student_personal_scores.get(current_user.id)
    p_ratio = float(personal.participation_ratio) if personal else 1.0
    p_mult = float(personal.participation_multiplier) if personal else 1.0

    if u_override:
        net_score = float(u_override.override_value)
    else:
        if indiv_score is not None:
            net_score = round((grp_score + indiv_score) * p_mult, 3)
        else:
            net_score = round(grp_score * p_mult, 3)

    is_final = (assignment.status == "FINALIZED")
    status_label = "คะแนนสุทธิ (Final)" if is_final else "ชั่วคราว — อาจเปลี่ยนแปลงได้"

    return StudentScoreViewResponse(
        assignment_id=assignment.id,
        assignment_name=assignment.name,
        group_name=group_name,
        group_score=round(grp_score, 3),
        group_max_score=float(assignment.group_max_score),
        individual_score=round(indiv_score, 3) if indiv_score is not None else None,
        individual_max_score=float(assignment.individual_max_score),
        participation_ratio=round(p_ratio, 3),
        participation_multiplier=round(p_mult, 3),
        net_score=round(net_score, 3),
        total_max_score=float(assignment.group_max_score + assignment.individual_max_score),
        is_final=is_final,
        status_label=status_label,
        k_anonymity_satisfied=k_satisfied,
        k_anonymity_notice=k_notice
    )
