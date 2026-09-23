import math
from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from backend.app.shared.models import (
    Assignment, Criterion, Classroom, ClassroomMember, User, PairAssignment, AuditEvent
)
from backend.app.features.assignment.schemas import (
    CreateAssignmentRequest, UpdateAssignmentRequest, AssignmentDetail, AssignmentSummary,
    CriterionOut, ReasonedActionRequest
)

def validate_criteria_weights(criteria: List, individual_max_score: float = 5.0):
    """US-ASSIGN-02 / FR-ASSIGN-02: Criteria weights must sum to 100.00% (+-0.01%) per side"""
    group_weights = [c.weight_pct if hasattr(c, "weight_pct") else c["weight_pct"] for c in criteria if (c.side if hasattr(c, "side") else c["side"]) == "GROUP"]
    indiv_weights = [c.weight_pct if hasattr(c, "weight_pct") else c["weight_pct"] for c in criteria if (c.side if hasattr(c, "side") else c["side"]) == "INDIVIDUAL"]

    if group_weights:
        group_sum = sum(group_weights)
        if not math.isclose(group_sum, 100.0, abs_tol=0.01):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Group criteria weights must sum to 100.00% (currently {group_sum:.2f}%)"
            )
    
    if individual_max_score > 0 and indiv_weights:
        indiv_sum = sum(indiv_weights)
        if not math.isclose(indiv_sum, 100.0, abs_tol=0.01):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Individual criteria weights must sum to 100.00% (currently {indiv_sum:.2f}%)"
            )

def create_assignment(db: Session, classroom: Classroom, req: CreateAssignmentRequest, current_user: User) -> AssignmentDetail:
    existing = db.query(Assignment).filter(
        Assignment.classroom_id == classroom.id,
        Assignment.slug == req.slug
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Assignment slug '{req.slug}' already exists in this classroom"
        )

    if req.criteria:
        validate_criteria_weights(req.criteria, req.individual_max_score)

    assignment = Assignment(
        classroom_id=classroom.id,
        name=req.name,
        slug=req.slug,
        description=req.description,
        artifact_url=req.artifact_url,
        group_max_score=req.group_max_score,
        individual_max_score=req.individual_max_score,
        group_deadline_utc=req.group_deadline_utc,
        individual_deadline_utc=req.individual_deadline_utc,
        instructor_weight=req.instructor_weight,
        target_coverage=req.target_coverage,
        max_workload=req.max_workload,
        min_comparisons=req.min_comparisons,
        score_floor=req.score_floor,
        score_ceiling=req.score_ceiling,
        completion_threshold=req.completion_threshold,
        pairing_seed=req.pairing_seed,
        status="DRAFT",
        created_by=current_user.id
    )
    db.add(assignment)
    db.flush()

    for idx, c in enumerate(req.criteria):
        crit = Criterion(
            assignment_id=assignment.id,
            side=c.side,
            name=c.name,
            description=c.description,
            weight_pct=c.weight_pct,
            display_order=c.display_order if c.display_order else idx
        )
        db.add(crit)

    db.commit()
    db.refresh(assignment)
    return get_assignment_detail(db, assignment)

def update_assignment(db: Session, assignment: Assignment, req: UpdateAssignmentRequest, current_user: User) -> AssignmentDetail:
    # If not in DRAFT, check what is allowed to be modified (US-ASSIGN-03)
    if assignment.status != "DRAFT":
        if req.criteria is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Cannot modify criteria when assignment is not in DRAFT status. Please Unpublish first."
            )
        if req.group_max_score is not None or req.individual_max_score is not None or req.target_coverage is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Cannot modify core scoring/pairing configuration when assignment is active."
            )

    if req.name is not None:
        assignment.name = req.name
    if req.slug is not None and req.slug != assignment.slug:
        existing = db.query(Assignment).filter(
            Assignment.classroom_id == assignment.classroom_id,
            Assignment.slug == req.slug
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Assignment slug '{req.slug}' already exists in this classroom"
            )
        assignment.slug = req.slug
    if req.description is not None:
        assignment.description = req.description
    if req.artifact_url is not None:
        assignment.artifact_url = req.artifact_url
    if req.group_max_score is not None:
        assignment.group_max_score = req.group_max_score
    if req.individual_max_score is not None:
        assignment.individual_max_score = req.individual_max_score
    if req.group_deadline_utc is not None:
        assignment.group_deadline_utc = req.group_deadline_utc
    if req.individual_deadline_utc is not None:
        assignment.individual_deadline_utc = req.individual_deadline_utc
    if req.instructor_weight is not None:
        assignment.instructor_weight = req.instructor_weight
    if req.target_coverage is not None:
        assignment.target_coverage = req.target_coverage
    if req.max_workload is not None:
        assignment.max_workload = req.max_workload
    if req.min_comparisons is not None:
        assignment.min_comparisons = req.min_comparisons
    if req.score_floor is not None:
        assignment.score_floor = req.score_floor
    if req.score_ceiling is not None:
        assignment.score_ceiling = req.score_ceiling
    if req.completion_threshold is not None:
        assignment.completion_threshold = req.completion_threshold
    if req.pairing_seed is not None:
        assignment.pairing_seed = req.pairing_seed

    if req.criteria is not None and assignment.status == "DRAFT":
        validate_criteria_weights(req.criteria, assignment.individual_max_score)
        # Replace criteria
        db.query(Criterion).filter(Criterion.assignment_id == assignment.id).delete()
        for idx, c in enumerate(req.criteria):
            crit = Criterion(
                assignment_id=assignment.id,
                side=c.side,
                name=c.name,
                description=c.description,
                weight_pct=c.weight_pct,
                display_order=c.display_order if c.display_order else idx
            )
            db.add(crit)

    db.commit()
    db.refresh(assignment)
    return get_assignment_detail(db, assignment)

def unpublish_assignment(db: Session, assignment: Assignment, req: ReasonedActionRequest, current_user: User) -> AssignmentDetail:
    if assignment.status not in ["PUBLISHED", "OPEN"]:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Cannot unpublish assignment in '{assignment.status}' state"
        )
    if not req.reason or not req.reason.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Mandatory justification reason required")

    old_status = assignment.status
    assignment.status = "DRAFT"

    # Invalidate pair assignments
    db.query(PairAssignment).filter(PairAssignment.assignment_id == assignment.id).delete()

    # Log audit event (FR-AUDIT-01)
    audit = AuditEvent(
        classroom_id=assignment.classroom_id,
        assignment_id=assignment.id,
        actor_user_id=current_user.id,
        action="UNPUBLISH",
        resource_type="ASSIGNMENT",
        resource_id=assignment.id,
        reason=req.reason
    )
    audit.before_json = {"status": old_status}
    audit.after_json = {"status": "DRAFT"}
    db.add(audit)

    db.commit()
    db.refresh(assignment)
    return get_assignment_detail(db, assignment)

def reopen_assignment(db: Session, assignment: Assignment, req: ReasonedActionRequest, current_user: User) -> AssignmentDetail:
    if assignment.status != "FINALIZED":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Cannot reopen assignment in '{assignment.status}' state. Must be FINALIZED."
        )
    if not req.reason or not req.reason.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Mandatory justification reason required")

    assignment.status = "CLOSED"
    assignment.finalized_at = None

    # Log audit event (FR-AUDIT-01)
    audit = AuditEvent(
        classroom_id=assignment.classroom_id,
        assignment_id=assignment.id,
        actor_user_id=current_user.id,
        action="REOPEN",
        resource_type="ASSIGNMENT",
        resource_id=assignment.id,
        reason=req.reason
    )
    audit.before_json = {"status": "FINALIZED"}
    audit.after_json = {"status": "CLOSED"}
    db.add(audit)

    db.commit()
    db.refresh(assignment)
    return get_assignment_detail(db, assignment)

def list_assignments(db: Session, classroom: Classroom) -> List[AssignmentSummary]:
    assignments = db.query(Assignment).filter(Assignment.classroom_id == classroom.id).all()
    results = []
    for a in assignments:
        results.append(
            AssignmentSummary(
                id=a.id,
                classroom_id=a.classroom_id,
                name=a.name,
                slug=a.slug,
                status=a.status,
                group_max_score=float(a.group_max_score),
                individual_max_score=float(a.individual_max_score),
                group_deadline_utc=a.group_deadline_utc,
                individual_deadline_utc=a.individual_deadline_utc,
                created_at=a.created_at,
                published_at=a.published_at,
                finalized_at=a.finalized_at
            )
        )
    return results

def get_assignment_detail(db: Session, assignment: Assignment) -> AssignmentDetail:
    criteria = db.query(Criterion).filter(Criterion.assignment_id == assignment.id).order_by(Criterion.display_order).all()
    crit_outs = [
        CriterionOut(
            id=c.id,
            assignment_id=c.assignment_id,
            side=c.side,
            name=c.name,
            description=c.description,
            weight_pct=float(c.weight_pct),
            display_order=c.display_order
        )
        for c in criteria
    ]

    group_pair_cnt = db.query(PairAssignment).filter(
        PairAssignment.assignment_id == assignment.id,
        PairAssignment.side == "GROUP"
    ).count()

    indiv_pair_cnt = db.query(PairAssignment).filter(
        PairAssignment.assignment_id == assignment.id,
        PairAssignment.side == "INDIVIDUAL"
    ).count()

    return AssignmentDetail(
        id=assignment.id,
        classroom_id=assignment.classroom_id,
        name=assignment.name,
        slug=assignment.slug,
        description=assignment.description,
        artifact_url=assignment.artifact_url,
        group_max_score=float(assignment.group_max_score),
        individual_max_score=float(assignment.individual_max_score),
        group_deadline_utc=assignment.group_deadline_utc,
        individual_deadline_utc=assignment.individual_deadline_utc,
        instructor_weight=float(assignment.instructor_weight),
        target_coverage=assignment.target_coverage,
        max_workload=assignment.max_workload,
        min_comparisons=assignment.min_comparisons,
        score_floor=float(assignment.score_floor),
        score_ceiling=float(assignment.score_ceiling),
        completion_threshold=float(assignment.completion_threshold),
        scoring_formula_version=assignment.scoring_formula_version,
        pairing_seed=assignment.pairing_seed,
        status=assignment.status,
        published_at=assignment.published_at,
        finalized_at=assignment.finalized_at,
        created_by=assignment.created_by,
        created_at=assignment.created_at,
        criteria=crit_outs,
        group_pair_count=group_pair_cnt,
        individual_pair_count=indiv_pair_cnt
    )

def delete_assignment(db: Session, assignment: Assignment) -> None:
    if assignment.status != "DRAFT":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Cannot delete assignment in '{assignment.status}' state. Only DRAFT assignments can be deleted."
        )

    # Detach audit events to prevent FK constraint violations
    db.query(AuditEvent).filter(AuditEvent.assignment_id == assignment.id).update({"assignment_id": None}, synchronize_session=False)
    
    db.delete(assignment)
    db.commit()
