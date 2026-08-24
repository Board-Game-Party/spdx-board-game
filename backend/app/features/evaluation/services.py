from datetime import datetime, timezone
from typing import List, Optional, Dict
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from backend.app.shared.models import (
    Assignment, Criterion, ClassroomMember, User, GroupEntity,
    PairAssignment, Comparison, ComparisonRevision
)
from backend.app.features.evaluation.schemas import (
    EvaluationWorksheetResponse, EvaluationSectionOut, ComparisonItemOut,
    EvaluationItemCard, SaveDraftRequest, BatchSaveDraftRequest,
    SubmitEvaluationRequest, SubmitEvaluationResponse
)

def get_item_card(db: Session, item_id: str, side: str, default_artifact_url: str = "") -> EvaluationItemCard:
    if side == "GROUP":
        grp = db.query(GroupEntity).filter(GroupEntity.id == item_id).first()
        if grp:
            members = db.query(ClassroomMember).filter(ClassroomMember.group_id == grp.id).all()
            member_names = [m.user.display_name or m.user.email_raw for m in members]
            return EvaluationItemCard(
                id=grp.id,
                name=grp.name,
                artifact_url=default_artifact_url,
                member_names=member_names
            )
    else:  # INDIVIDUAL
        usr = db.query(User).filter(User.id == item_id).first()
        if usr:
            return EvaluationItemCard(
                id=usr.id,
                name=usr.display_name or usr.email_raw,
                artifact_url=default_artifact_url,
                member_names=[]
            )
    return EvaluationItemCard(id=item_id, name="Unknown Item", artifact_url=default_artifact_url, member_names=[])

def get_evaluation_worksheet(
    db: Session,
    assignment: Assignment,
    side: str,
    current_user: User
) -> EvaluationWorksheetResponse:
    """
    US-EVAL-01 / US-EVAL-04:
    Retrieve student's evaluation worksheet grouped by criteria sections.
    """
    deadline = assignment.group_deadline_utc if side == "GROUP" else assignment.individual_deadline_utc

    # Check if student belongs to a small group (m <= 2) for individual eval
    if side == "INDIVIDUAL":
        member = db.query(ClassroomMember).filter(
            ClassroomMember.classroom_id == assignment.classroom_id,
            ClassroomMember.user_id == current_user.id
        ).first()
        if member and member.group_id:
            group_size = db.query(ClassroomMember).filter(
                ClassroomMember.classroom_id == assignment.classroom_id,
                ClassroomMember.group_id == member.group_id
            ).count()
            if group_size <= 2:
                # FR-EVAL-12 / FR-PAIR-12: Small group notice
                return EvaluationWorksheetResponse(
                    assignment_id=assignment.id,
                    assignment_name=assignment.name,
                    artifact_url=assignment.artifact_url,
                    side=side,
                    status=assignment.status,
                    is_submitted=False,
                    deadline_utc=deadline,
                    total_comparisons=0,
                    answered_comparisons=0,
                    progress_pct=100.0,
                    sections=[],
                    participation_ratio=1.0,
                    participation_multiplier=1.0
                )

    criteria = db.query(Criterion).filter(
        Criterion.assignment_id == assignment.id,
        Criterion.side == side
    ).order_by(Criterion.display_order).all()

    pairs = db.query(PairAssignment).filter(
        PairAssignment.assignment_id == assignment.id,
        PairAssignment.evaluator_user_id == current_user.id,
        PairAssignment.side == side
    ).all()

    # Map pairs by criterion_id
    pair_map: Dict[str, List[PairAssignment]] = {}
    for p in pairs:
        pair_map.setdefault(p.criterion_id, []).append(p)

    sections: List[EvaluationSectionOut] = []
    total_comps = len(pairs)
    answered_comps = 0
    submitted_comps = 0

    for crit in criteria:
        crit_pairs = pair_map.get(crit.id, [])
        comp_items: List[ComparisonItemOut] = []
        crit_answered = 0

        for p in crit_pairs:
            comp = db.query(Comparison).filter(Comparison.pair_assignment_id == p.id).first()
            current_choice = comp.choice if comp else None
            comp_status = comp.status if comp else "DRAFT"
            tot_ms = comp.time_on_task_ms if comp else 0
            saved_at = comp.saved_at if comp else None
            sub_at = comp.submitted_at if comp else None

            if current_choice is not None:
                crit_answered += 1
                answered_comps += 1
            if comp and comp.status == "SUBMITTED":
                submitted_comps += 1

            # Resolve left vs right item according to display_left_item_id (FR-PAIR-08)
            left_id = p.display_left_item_id
            right_id = p.item_b_id if p.item_a_id == left_id else p.item_a_id

            left_card = get_item_card(db, left_id, side, assignment.artifact_url)
            right_card = get_item_card(db, right_id, side, assignment.artifact_url)

            comp_items.append(ComparisonItemOut(
                pair_assignment_id=p.id,
                side=p.side,
                criterion_id=crit.id,
                criterion_name=crit.name,
                criterion_description=crit.description,
                display_order=crit.display_order,
                left_item=left_card,
                right_item=right_card,
                current_choice=current_choice,
                status=comp_status,
                time_on_task_ms=tot_ms,
                saved_at=saved_at,
                submitted_at=sub_at
            ))

        sections.append(EvaluationSectionOut(
            criterion_id=crit.id,
            criterion_name=crit.name,
            criterion_description=crit.description,
            weight_pct=float(crit.weight_pct),
            comparisons=comp_items,
            answered_count=crit_answered,
            total_count=len(crit_pairs)
        ))

    progress = (answered_comps / total_comps * 100.0) if total_comps > 0 else 100.0
    p_ratio = (submitted_comps / total_comps) if total_comps > 0 else 1.0
    thresh = float(assignment.completion_threshold)
    p_mult = min(1.0, p_ratio / thresh) if thresh > 0 else 1.0

    return EvaluationWorksheetResponse(
        assignment_id=assignment.id,
        assignment_name=assignment.name,
        artifact_url=assignment.artifact_url,
        side=side,
        status=assignment.status,
        is_submitted=(submitted_comps > 0 and submitted_comps == total_comps),
        deadline_utc=deadline,
        total_comparisons=total_comps,
        answered_comparisons=answered_comps,
        progress_pct=round(progress, 1),
        sections=sections,
        participation_ratio=round(p_ratio, 3),
        participation_multiplier=round(p_mult, 3)
    )

def save_comparison_draft(
    db: Session,
    req: SaveDraftRequest,
    current_user: User
) -> Comparison:
    """
    US-EVAL-02 / FR-EVAL-04:
    Autosave draft choice (1..6) and elapsed time.
    """
    if req.choice < 1 or req.choice > 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Choice must be between 1 and 6 on the 6-point scale."
        )

    pair = db.query(PairAssignment).filter(
        PairAssignment.id == req.pair_assignment_id,
        PairAssignment.evaluator_user_id == current_user.id
    ).first()
    if not pair:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pair assignment not found")

    # Check deadline
    assignment = pair.assignment
    deadline = assignment.group_deadline_utc if pair.side == "GROUP" else assignment.individual_deadline_utc
    if deadline and datetime.now(timezone.utc) > deadline:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Deadline has passed. Read-only mode.")

    comp = db.query(Comparison).filter(Comparison.pair_assignment_id == pair.id).first()
    now_utc = datetime.now(timezone.utc)
    if not comp:
        comp = Comparison(
            pair_assignment_id=pair.id,
            evaluator_user_id=current_user.id,
            choice=req.choice,
            status="DRAFT",
            time_on_task_ms=req.time_on_task_ms or 0,
            first_seen_at=now_utc,
            saved_at=now_utc
        )
        db.add(comp)
    else:
        comp.choice = req.choice
        comp.time_on_task_ms += (req.time_on_task_ms or 0)
        comp.saved_at = now_utc

    db.commit()
    db.refresh(comp)
    return comp

def batch_save_drafts(
    db: Session,
    req: BatchSaveDraftRequest,
    current_user: User
) -> List[Comparison]:
    """US-EVAL-05 / FR-EVAL-13: Resilient offline sync batch save"""
    results = []
    for d in req.drafts:
        c = save_comparison_draft(db, d, current_user)
        results.append(c)
    return results

def submit_evaluation(
    db: Session,
    assignment: Assignment,
    req: SubmitEvaluationRequest,
    current_user: User
) -> SubmitEvaluationResponse:
    """
    US-EVAL-03 / FR-EVAL-05 / FR-EVAL-06 / FR-EVAL-08:
    Submit or re-submit evaluation with revision tracking.
    """
    deadline = assignment.group_deadline_utc if req.side == "GROUP" else assignment.individual_deadline_utc
    now_utc = datetime.now(timezone.utc)
    if deadline and now_utc > deadline:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Submission rejected: assignment deadline has passed."
        )

    pairs = db.query(PairAssignment).filter(
        PairAssignment.assignment_id == assignment.id,
        PairAssignment.evaluator_user_id == current_user.id,
        PairAssignment.side == req.side
    ).all()

    if not pairs:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No pairs assigned for this side.")

    submitted_count = 0
    unanswered_count = 0

    for p in pairs:
        comp = db.query(Comparison).filter(Comparison.pair_assignment_id == p.id).first()
        if not comp or comp.choice is None:
            unanswered_count += 1
        else:
            comp.status = "SUBMITTED"
            comp.submitted_at = now_utc
            submitted_count += 1

            # Append revision record (FR-EVAL-06)
            prev_rev_cnt = db.query(ComparisonRevision).filter(
                ComparisonRevision.comparison_id == comp.id
            ).count()

            rev = ComparisonRevision(
                comparison_id=comp.id,
                choice=comp.choice,
                status="SUBMITTED",
                submitted_at=now_utc,
                revision_no=prev_rev_cnt + 1
            )
            db.add(rev)

    if unanswered_count > 0 and not req.confirm_incomplete:
        # Prompt user about unanswered questions before committing
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"You have {unanswered_count} unanswered comparison(s). Pass confirm_incomplete=True to submit partially."
        )

    db.commit()

    return SubmitEvaluationResponse(
        success=True,
        submitted_count=submitted_count,
        total_assigned=len(pairs),
        unanswered_count=unanswered_count,
        submitted_at=now_utc,
        message=f"ส่งผลการประเมินสำเร็จ ({submitted_count}/{len(pairs)} ข้อ)"
    )
