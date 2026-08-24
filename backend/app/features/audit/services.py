from datetime import datetime, timezone, timedelta
from typing import List, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from backend.app.shared.models import (
    Assignment, User, AuditEvent, Appeal, ScoreOverride, ClassroomMember
)
from backend.app.features.audit.schemas import (
    AuditEventOut, AppealOut, CreateAppealRequest, ResolveAppealRequest
)

def list_audit_events(
    db: Session,
    classroom_id: str,
    assignment_id: Optional[str] = None
) -> List[AuditEventOut]:
    """US-AUDIT-01 / FR-AUDIT-01..03: Immutable append-only audit trail query"""
    q = db.query(AuditEvent).filter(AuditEvent.classroom_id == classroom_id)
    if assignment_id:
        q = q.filter(AuditEvent.assignment_id == assignment_id)
    events = q.order_by(AuditEvent.occurred_at.desc()).all()

    users = db.query(User).all()
    user_map = {u.id: (u.display_name or u.email_raw) for u in users}

    results = []
    for e in events:
        results.append(AuditEventOut(
            id=e.id,
            classroom_id=e.classroom_id,
            assignment_id=e.assignment_id,
            actor_user_id=e.actor_user_id,
            actor_name=user_map.get(e.actor_user_id, e.actor_user_id),
            action=e.action,
            resource_type=e.resource_type,
            resource_id=e.resource_id,
            before_json=e.before_json,
            after_json=e.after_json,
            reason=e.reason,
            ip_address=e.ip_address,
            occurred_at=e.occurred_at
        ))
    return results

def create_student_appeal(
    db: Session,
    assignment: Assignment,
    req: CreateAppealRequest,
    current_user: User
) -> AppealOut:
    """
    US-APPEAL-01 / FR-APPEAL-01:
    Submit dispute appeal within 7 days of finalization.
    """
    if assignment.status != "FINALIZED":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Appeals can only be submitted for FINALIZED assignments."
        )

    if not assignment.finalized_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Assignment has no recorded finalization timestamp."
        )

    now_utc = datetime.now(timezone.utc)
    finalized_time = assignment.finalized_at
    if finalized_time.tzinfo is None:
        finalized_time = finalized_time.replace(tzinfo=timezone.utc)

    # 7-day window check
    if now_utc > finalized_time + timedelta(days=7):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Appeals window closed (must be submitted within 7 days of finalization)."
        )

    appeal = Appeal(
        assignment_id=assignment.id,
        student_user_id=current_user.id,
        message=req.message,
        status="OPEN"
    )
    db.add(appeal)
    db.commit()
    db.refresh(appeal)

    return AppealOut(
        id=appeal.id,
        assignment_id=assignment.id,
        assignment_name=assignment.name,
        student_user_id=current_user.id,
        student_name=current_user.display_name or current_user.email_raw,
        message=appeal.message,
        status=appeal.status,
        created_at=appeal.created_at
    )

def list_assignment_appeals(db: Session, assignment: Assignment) -> List[AppealOut]:
    appeals = db.query(Appeal).filter(Appeal.assignment_id == assignment.id).order_by(Appeal.created_at.desc()).all()
    users = db.query(User).all()
    user_map = {u.id: (u.display_name or u.email_raw) for u in users}

    results = []
    for a in appeals:
        results.append(AppealOut(
            id=a.id,
            assignment_id=assignment.id,
            assignment_name=assignment.name,
            student_user_id=a.student_user_id,
            student_name=user_map.get(a.student_user_id, a.student_user_id),
            message=a.message,
            status=a.status,
            resolution=a.resolution,
            resolved_by_name=user_map.get(a.resolved_by) if a.resolved_by else None,
            created_at=a.created_at,
            resolved_at=a.resolved_at
        ))
    return results

def resolve_appeal(
    db: Session,
    assignment: Assignment,
    appeal_id: str,
    req: ResolveAppealRequest,
    current_user: User
) -> AppealOut:
    """US-APPEAL-01 / FR-APPEAL-02: Instructor resolves score dispute"""
    appeal = db.query(Appeal).filter(
        Appeal.id == appeal_id,
        Appeal.assignment_id == assignment.id
    ).first()
    if not appeal:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appeal not found")

    appeal.status = req.status
    appeal.resolution = req.resolution
    appeal.resolved_by = current_user.id
    appeal.resolved_at = datetime.now(timezone.utc)

    if req.override_score is not None:
        override = ScoreOverride(
            assignment_id=assignment.id,
            side="INDIVIDUAL",
            item_id=appeal.student_user_id,
            original_value=0.0,
            override_value=req.override_score,
            reason=f"Resolved appeal: {req.resolution}",
            created_by=current_user.id
        )
        db.add(override)

    # Log audit event
    audit = AuditEvent(
        classroom_id=assignment.classroom_id,
        assignment_id=assignment.id,
        actor_user_id=current_user.id,
        action="RESOLVE_APPEAL",
        resource_type="APPEAL",
        resource_id=appeal.id,
        reason=req.resolution
    )
    audit.after_json = {
        "status": req.status,
        "resolution": req.resolution,
        "override_score": req.override_score
    }
    db.add(audit)

    db.commit()
    db.refresh(appeal)

    users = db.query(User).all()
    user_map = {u.id: (u.display_name or u.email_raw) for u in users}

    return AppealOut(
        id=appeal.id,
        assignment_id=assignment.id,
        assignment_name=assignment.name,
        student_user_id=appeal.student_user_id,
        student_name=user_map.get(appeal.student_user_id, appeal.student_user_id),
        message=appeal.message,
        status=appeal.status,
        resolution=appeal.resolution,
        resolved_by_name=user_map.get(appeal.resolved_by) if appeal.resolved_by else None,
        created_at=appeal.created_at,
        resolved_at=appeal.resolved_at
    )
