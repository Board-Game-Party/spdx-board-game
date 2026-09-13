from typing import List, Dict, Optional
from sqlalchemy.orm import Session

from backend.app.shared.models import (
    Assignment, Criterion, ClassroomMember, User, GroupEntity,
    PairAssignment, Comparison, ScoreOverride
)
from backend.app.features.scoring.services import run_scoring_engine_for_assignment
from backend.app.features.scoring.schemas import (
    GroupScoreSummaryOut, IndividualScoreSummaryOut, CriterionScoreOut
)
from backend.app.features.reporting.schemas import (
    GroupSummaryReportResponse, IndividualSummaryReportResponse,
    PairCoverageReportResponse, PairCoverageItemOut
)

def get_group_summary_report(db: Session, assignment: Assignment) -> GroupSummaryReportResponse:
    """US-REPORT-01 / FR-REPORT-01: Group Summary Report"""
    result = run_scoring_engine_for_assignment(db, assignment)
    criteria = db.query(Criterion).filter(
        Criterion.assignment_id == assignment.id,
        Criterion.side == "GROUP"
    ).order_by(Criterion.display_order).all()
    crit_dict = {c.id: c for c in criteria}

    groups = db.query(GroupEntity).filter(GroupEntity.classroom_id == assignment.classroom_id).all()
    group_map = {g.id: g for g in groups}

    group_outs = []
    for g_id, g_total in result.group_scores.items():
        g_name = group_map[g_id].name if g_id in group_map else "Unknown Group"
        
        # Check override
        override = db.query(ScoreOverride).filter(
            ScoreOverride.assignment_id == assignment.id,
            ScoreOverride.side == "GROUP",
            ScoreOverride.item_id == g_id
        ).order_by(ScoreOverride.created_at.desc()).first()

        crit_breakdown = []
        for cr_id, cr_score in g_total.criterion_scores.items():
            cr_obj = crit_dict.get(cr_id)
            crit_breakdown.append(CriterionScoreOut(
                criterion_id=cr_id,
                criterion_name=cr_obj.name if cr_obj else cr_id,
                side="GROUP",
                weight_pct=float(cr_score.score_ratio),  # or weight
                comparison_count=cr_score.comparison_count,
                effective_weight_sum=float(cr_score.effective_weight_sum),
                quality_index=float(cr_score.quality_index),
                score_ratio=float(cr_score.score_ratio),
                weighted_score=float(cr_score.weighted_score),
                flags=cr_score.flags
            ))

        group_outs.append(GroupScoreSummaryOut(
            group_id=g_id,
            group_name=g_name,
            component_score=float(g_total.component_score),
            max_score=float(assignment.group_max_score),
            comparison_count=g_total.comparison_count,
            flags=g_total.flags,
            criteria_breakdown=crit_breakdown,
            is_overridden=bool(override),
            override_score=float(override.override_value) if override else None,
            override_reason=override.reason if override else None
        ))

    return GroupSummaryReportResponse(
        assignment_id=assignment.id,
        assignment_name=assignment.name,
        status=assignment.status,
        group_max_score=float(assignment.group_max_score),
        groups=group_outs
    )

def get_individual_summary_report(db: Session, assignment: Assignment) -> IndividualSummaryReportResponse:
    """US-REPORT-01 / FR-REPORT-02: Individual Summary Report"""
    result = run_scoring_engine_for_assignment(db, assignment)
    criteria = db.query(Criterion).filter(
        Criterion.assignment_id == assignment.id,
        Criterion.side == "INDIVIDUAL"
    ).order_by(Criterion.display_order).all()
    crit_dict = {c.id: c for c in criteria}

    students = db.query(ClassroomMember).filter(
        ClassroomMember.classroom_id == assignment.classroom_id,
        ClassroomMember.role == "STUDENT"
    ).all()

    student_outs = []
    total_max = float(assignment.group_max_score + assignment.individual_max_score)

    for s in students:
        p_score = result.student_personal_scores.get(s.user_id)
        if not p_score:
            continue

        u_obj = s.user
        g_name = s.group.name if s.group else None

        # Check override
        override = db.query(ScoreOverride).filter(
            ScoreOverride.assignment_id == assignment.id,
            ScoreOverride.side == "INDIVIDUAL",
            ScoreOverride.item_id == s.user_id
        ).order_by(ScoreOverride.created_at.desc()).first()

        indiv_total = result.individual_scores.get(s.user_id)
        crit_breakdown = []
        if indiv_total:
            for cr_id, cr_score in indiv_total.criterion_scores.items():
                cr_obj = crit_dict.get(cr_id)
                crit_breakdown.append(CriterionScoreOut(
                    criterion_id=cr_id,
                    criterion_name=cr_obj.name if cr_obj else cr_id,
                    side="INDIVIDUAL",
                    weight_pct=float(cr_obj.weight_pct) if cr_obj else 0.0,
                    comparison_count=cr_score.comparison_count,
                    effective_weight_sum=float(cr_score.effective_weight_sum),
                    quality_index=float(cr_score.quality_index),
                    score_ratio=float(cr_score.score_ratio),
                    weighted_score=float(cr_score.weighted_score),
                    flags=cr_score.flags
                ))

        student_outs.append(IndividualScoreSummaryOut(
            student_user_id=s.user_id,
            display_name=u_obj.display_name or u_obj.email_raw,
            email=u_obj.email_raw,
            student_id=s.student_id,
            group_id=s.group_id,
            group_name=g_name,
            group_component_score=float(p_score.group_component_score),
            individual_component_score=float(p_score.individual_component_score),
            raw_total_score=float(p_score.group_component_score + p_score.individual_component_score),
            assigned_comparisons=p_score.assigned_comparisons,
            submitted_comparisons=p_score.submitted_comparisons,
            participation_ratio=float(p_score.participation_ratio),
            participation_multiplier=float(p_score.participation_multiplier),
            net_final_score=float(override.override_value) if override else float(p_score.net_score),
            max_possible_score=total_max,
            flags=p_score.flags,
            criteria_breakdown=crit_breakdown,
            is_overridden=bool(override),
            override_score=float(override.override_value) if override else None,
            override_reason=override.reason if override else None
        ))

    return IndividualSummaryReportResponse(
        assignment_id=assignment.id,
        assignment_name=assignment.name,
        status=assignment.status,
        total_max_score=total_max,
        students=student_outs
    )

def get_pair_coverage_report(db: Session, assignment: Assignment) -> PairCoverageReportResponse:
    """US-REPORT-02 / FR-REPORT-03: Pair Coverage Report"""
    pairs = db.query(PairAssignment).filter(PairAssignment.assignment_id == assignment.id).all()
    criteria = db.query(Criterion).filter(Criterion.assignment_id == assignment.id).all()
    crit_map = {c.id: c for c in criteria}

    users = db.query(User).all()
    user_map = {u.id: (u.display_name or u.email_raw) for u in users}

    groups = db.query(GroupEntity).filter(GroupEntity.classroom_id == assignment.classroom_id).all()
    group_map = {g.id: g.name for g in groups}

    # Group pairs by unique combination (criterion_id, side, item_a_id, item_b_id)
    unique_pairs_dict = {}
    for p in pairs:
        key = (p.criterion_id, p.side, p.item_a_id, p.item_b_id)
        unique_pairs_dict.setdefault(key, []).append(p)

    pair_items = []
    low_cov_count = 0

    for (cr_id, side, a_id, b_id), p_list in unique_pairs_dict.items():
        cr = crit_map.get(cr_id)
        cr_name = cr.name if cr else cr_id

        if side == "GROUP":
            a_name = group_map.get(a_id, "Unknown Group")
            b_name = group_map.get(b_id, "Unknown Group")
        else:
            a_name = user_map.get(a_id, "Unknown Student")
            b_name = user_map.get(b_id, "Unknown Student")

        # Count submissions
        p_ids = [p.id for p in p_list]
        comps = db.query(Comparison).filter(
            Comparison.pair_assignment_id.in_(p_ids),
            Comparison.status == "SUBMITTED"
        ).all()

        submitted_cnt = len(comps)
        choices = [c.choice for c in comps if c.choice is not None]
        mean_c = (sum(choices) / len(choices)) if choices else None

        is_low = (submitted_cnt < assignment.min_comparisons)
        if is_low:
            low_cov_count += 1

        pair_items.append(PairCoverageItemOut(
            pair_id=p_list[0].id,
            criterion_id=cr_id,
            criterion_name=cr_name,
            side=side,
            item_a_id=a_id,
            item_a_name=a_name,
            item_b_id=b_id,
            item_b_name=b_name,
            target_coverage=assignment.target_coverage,
            actual_coverage=submitted_cnt,
            mean_choice=round(mean_c, 2) if mean_c is not None else None,
            is_low_coverage=is_low,
            assigned_evaluator_count=len(p_list),
            submitted_evaluator_count=submitted_cnt
        ))

    return PairCoverageReportResponse(
        assignment_id=assignment.id,
        target_coverage=assignment.target_coverage,
        total_pairs=len(pair_items),
        low_coverage_pair_count=low_cov_count,
        pairs=pair_items
    )
