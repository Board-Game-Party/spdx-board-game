import random
import itertools
from datetime import datetime, timezone
from typing import List, Dict, Tuple, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from backend.app.shared.models import (
    Assignment, Criterion, Classroom, ClassroomMember, User, GroupEntity,
    PairAssignment, Comparison, AuditEvent, Notification
)
from backend.app.features.assignment.services import validate_criteria_weights, get_assignment_detail
from backend.app.features.pairing.feasibility import solve_pairing_feasibility
from backend.app.features.pairing.schemas import FeasibilityReportResponse, AddExtraEvaluatorsRequest

def get_assignment_feasibility(db: Session, assignment: Assignment) -> FeasibilityReportResponse:
    groups = db.query(GroupEntity).filter(GroupEntity.classroom_id == assignment.classroom_id).all()
    group_sizes = []
    total_students = 0
    for g in groups:
        cnt = db.query(ClassroomMember).filter(
            ClassroomMember.classroom_id == assignment.classroom_id,
            ClassroomMember.group_id == g.id,
            ClassroomMember.role == "STUDENT"
        ).count()
        group_sizes.append(cnt)
        total_students += cnt

    return solve_pairing_feasibility(
        num_students=total_students,
        group_sizes=group_sizes,
        target_coverage=assignment.target_coverage,
        max_workload=assignment.max_workload
    )

def generate_group_pairs_for_criterion(
    db: Session,
    assignment: Assignment,
    criterion: Criterion,
    seed: int,
    solved_R: int,
    solved_k: int
) -> List[PairAssignment]:
    """
    US-PAIR-02 / FR-PAIR-01..09 / PRD §8.4:
    Deterministic balanced group pair generation fulfilling INV-1..5.
    """
    # Deterministic RNG derived from seed + assignment + criterion
    rng = random.Random(f"{seed}:{assignment.id}:{criterion.id}")

    groups = db.query(GroupEntity).filter(GroupEntity.classroom_id == assignment.classroom_id).all()
    students = db.query(ClassroomMember).filter(
        ClassroomMember.classroom_id == assignment.classroom_id,
        ClassroomMember.role == "STUDENT",
        ClassroomMember.group_id.isnot(None)
    ).all()

    if len(groups) < 2 or not students:
        return []

    # Map student to their group_id
    student_group_map = {s.user_id: s.group_id for s in students}
    student_ids = [s.user_id for s in students]

    # Generate all group pairs {a, b}
    group_pairs: List[Tuple[str, str]] = []
    for g1, g2 in itertools.combinations([g.id for g in groups], 2):
        if g1 > g2:
            g1, g2 = g2, g1
        group_pairs.append((g1, g2))

    # Target demand per pair
    demand: Dict[Tuple[str, str], int] = {p: solved_R for p in group_pairs}
    pair_assignments: List[PairAssignment] = []

    # Randomize evaluator order to avoid first-group bias
    shuffled_students = list(student_ids)
    rng.shuffle(shuffled_students)

    evaluator_assignments: Dict[str, List[Tuple[str, str]]] = {s_id: [] for s_id in shuffled_students}

    for evaluator_id in shuffled_students:
        eval_group = student_group_map.get(evaluator_id)
        # Eligible pairs: evaluator group not in pair (INV-1) and not already assigned (INV-2)
        eligible = [
            p for p in group_pairs
            if eval_group not in p and p not in evaluator_assignments[evaluator_id]
        ]

        # Prioritize pairs with highest unmet demand (balanced coverage INV-3)
        # Secondary sort key: deterministic random float for tie-breaking
        eligible.sort(key=lambda p: (-demand[p], rng.random()))
        chosen_pairs = eligible[:solved_k]

        for p in chosen_pairs:
            evaluator_assignments[evaluator_id].append(p)
            demand[p] -= 1

            # FR-PAIR-08 / D8: Randomized left/right item presentation
            left_item = p[0] if rng.random() < 0.5 else p[1]

            pair_obj = PairAssignment(
                assignment_id=assignment.id,
                criterion_id=criterion.id,
                side="GROUP",
                item_a_id=p[0],
                item_b_id=p[1],
                evaluator_user_id=evaluator_id,
                display_left_item_id=left_item,
                generation=1,
                source="AUTO"
            )
            db.add(pair_obj)
            pair_assignments.append(pair_obj)

    return pair_assignments

def generate_individual_pairs_for_criterion(
    db: Session,
    assignment: Assignment,
    criterion: Criterion,
    seed: int
) -> List[PairAssignment]:
    """
    US-PAIR-03 / FR-PAIR-03 / FR-PAIR-12..15 / PRD §8.3:
    Individual pairwise comparisons within groups.
    """
    rng = random.Random(f"{seed}:{assignment.id}:{criterion.id}:indiv")
    groups = db.query(GroupEntity).filter(GroupEntity.classroom_id == assignment.classroom_id).all()
    pair_assignments: List[PairAssignment] = []

    for g in groups:
        members = db.query(ClassroomMember).filter(
            ClassroomMember.classroom_id == assignment.classroom_id,
            ClassroomMember.group_id == g.id,
            ClassroomMember.role == "STUDENT"
        ).all()
        m = len(members)

        # FR-PAIR-12: If group size <= 2, omit individual eval
        if m <= 2:
            continue

        member_ids = [mem.user_id for mem in members]

        for evaluator_id in member_ids:
            # Peers excluding evaluator (INV-1 / self-eval omitted)
            peers = [uid for uid in member_ids if uid != evaluator_id]
            if len(peers) < 2:
                continue

            # All 2-combinations among peers: C(m-1, 2)
            peer_pairs = []
            for u1, u2 in itertools.combinations(peers, 2):
                if u1 > u2:
                    u1, u2 = u2, u1
                peer_pairs.append((u1, u2))

            # FR-PAIR-14: If pairs > max_workload, sample max_workload pairs
            if len(peer_pairs) > assignment.max_workload:
                rng.shuffle(peer_pairs)
                chosen_pairs = peer_pairs[:assignment.max_workload]
            else:
                chosen_pairs = peer_pairs

            for p in chosen_pairs:
                left_item = p[0] if rng.random() < 0.5 else p[1]
                pair_obj = PairAssignment(
                    assignment_id=assignment.id,
                    criterion_id=criterion.id,
                    side="INDIVIDUAL",
                    item_a_id=p[0],
                    item_b_id=p[1],
                    evaluator_user_id=evaluator_id,
                    display_left_item_id=left_item,
                    generation=1,
                    source="AUTO"
                )
                db.add(pair_obj)
                pair_assignments.append(pair_obj)

    return pair_assignments

def publish_assignment_and_generate_pairs(
    db: Session,
    assignment: Assignment,
    current_user: User
):
    """
    US-ASSIGN-03 / US-PAIR-02 / US-PAIR-03 / US-NOTIF-01:
    Validate weights, solve feasibility, generate deterministic pairs, and transition to PUBLISHED / OPEN.
    """
    if assignment.status != "DRAFT":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Assignment is already in '{assignment.status}' state."
        )

    criteria = db.query(Criterion).filter(Criterion.assignment_id == assignment.id).all()
    if not criteria:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Assignment must have at least one evaluation criterion before publishing."
        )

    validate_criteria_weights(criteria, float(assignment.individual_max_score))

    feasibility = get_assignment_feasibility(db, assignment)
    if not feasibility.is_feasible:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Cannot publish: {feasibility.explanation}"
        )

    seed = assignment.pairing_seed if assignment.pairing_seed is not None else int(datetime.now().timestamp())
    assignment.pairing_seed = seed

    # Clear any leftover pairs
    db.query(PairAssignment).filter(PairAssignment.assignment_id == assignment.id).delete()

    # Generate Group pairs
    group_criteria = [c for c in criteria if c.side == "GROUP"]
    for gc in group_criteria:
        generate_group_pairs_for_criterion(
            db, assignment, gc, seed,
            solved_R=feasibility.actual_coverage,
            solved_k=feasibility.workload_per_student_per_criterion
        )

    # Generate Individual pairs if individual_max_score > 0
    if float(assignment.individual_max_score) > 0:
        indiv_criteria = [c for c in criteria if c.side == "INDIVIDUAL"]
        for ic in indiv_criteria:
            generate_individual_pairs_for_criterion(db, assignment, ic, seed)

    assignment.status = "OPEN"
    assignment.published_at = datetime.now(timezone.utc)

    # Log audit event (FR-AUDIT-01)
    audit = AuditEvent(
        classroom_id=assignment.classroom_id,
        assignment_id=assignment.id,
        actor_user_id=current_user.id,
        action="PUBLISH",
        resource_type="ASSIGNMENT",
        resource_id=assignment.id,
        reason="Publish assignment and generate balanced pairs"
    )
    audit.before_json = {"status": "DRAFT"}
    audit.after_json = {
        "status": "OPEN",
        "pairing_seed": seed,
        "solved_R": feasibility.actual_coverage,
        "solved_k": feasibility.workload_per_student_per_criterion
    }
    db.add(audit)

    # Queue student open notifications (FR-NOTIF-01)
    students = db.query(ClassroomMember).filter(
        ClassroomMember.classroom_id == assignment.classroom_id,
        ClassroomMember.role == "STUDENT"
    ).all()
    for s in students:
        notif = Notification(
            user_id=s.user_id,
            type="ASSIGNMENT_OPEN"
        )
        notif.payload_json = {
            "assignment_id": assignment.id,
            "assignment_name": assignment.name,
            "classroom_id": assignment.classroom_id,
            "message": f"งาน '{assignment.name}' เปิดให้เข้าประเมินผลงานแล้ว"
        }
        db.add(notif)

    db.commit()
    db.refresh(assignment)
    return get_assignment_detail(db, assignment)

def add_extra_evaluators_to_pair(
    db: Session,
    assignment: Assignment,
    req: AddExtraEvaluatorsRequest,
    current_user: User
):
    """
    US-PAIR-04 / FR-PAIR-10:
    Assign additional evaluators or instructor self-evaluation to pair.
    """
    criterion = db.query(Criterion).filter(Criterion.id == req.criterion_id).first()
    if not criterion:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Criterion not found")

    item_a_id = req.item_a_id
    item_b_id = req.item_b_id
    if item_a_id > item_b_id:
        item_a_id, item_b_id = item_b_id, item_a_id

    created_pairs = []

    if req.is_instructor_self:
        # Instructor self evaluation
        existing = db.query(PairAssignment).filter(
            PairAssignment.assignment_id == assignment.id,
            PairAssignment.criterion_id == criterion.id,
            PairAssignment.evaluator_user_id == current_user.id,
            PairAssignment.item_a_id == item_a_id,
            PairAssignment.item_b_id == item_b_id
        ).first()
        if not existing:
            pair = PairAssignment(
                assignment_id=assignment.id,
                criterion_id=criterion.id,
                side=req.side,
                item_a_id=item_a_id,
                item_b_id=item_b_id,
                evaluator_user_id=current_user.id,
                display_left_item_id=item_a_id,
                generation=1,
                source="INSTRUCTOR_SELF"
            )
            db.add(pair)
            created_pairs.append(pair)
    else:
        # Extra student evaluators
        students = db.query(ClassroomMember).filter(
            ClassroomMember.classroom_id == assignment.classroom_id,
            ClassroomMember.role == "STUDENT"
        ).all()

        eligible_uids = []
        for s in students:
            # Cannot evaluate own group/self
            if req.side == "GROUP" and s.group_id in [item_a_id, item_b_id]:
                continue
            if req.side == "INDIVIDUAL" and s.user_id in [item_a_id, item_b_id]:
                continue
            # Must not already be assigned this pair
            already = db.query(PairAssignment).filter(
                PairAssignment.assignment_id == assignment.id,
                PairAssignment.criterion_id == criterion.id,
                PairAssignment.evaluator_user_id == s.user_id,
                PairAssignment.item_a_id == item_a_id,
                PairAssignment.item_b_id == item_b_id
            ).first()
            if not already:
                eligible_uids.append(s.user_id)

        random.shuffle(eligible_uids)
        chosen = eligible_uids[:req.evaluator_count]
        for uid in chosen:
            pair = PairAssignment(
                assignment_id=assignment.id,
                criterion_id=criterion.id,
                side=req.side,
                item_a_id=item_a_id,
                item_b_id=item_b_id,
                evaluator_user_id=uid,
                display_left_item_id=item_a_id if random.random() < 0.5 else item_b_id,
                generation=1,
                source="INSTRUCTOR_EXTRA"
            )
            db.add(pair)
            created_pairs.append(pair)

            # Notify student (FR-NOTIF-05)
            notif = Notification(
                user_id=uid,
                type="EXTRA_PAIR"
            )
            notif.payload_json = {
                "assignment_id": assignment.id,
                "message": f"คุณได้รับมอบหมายให้ทำแบบประเมินเพิ่มเติมสำหรับงาน '{assignment.name}'"
            }
            db.add(notif)

    db.commit()
    return {"message": f"Assigned {len(created_pairs)} additional evaluator(s)", "count": len(created_pairs)}
