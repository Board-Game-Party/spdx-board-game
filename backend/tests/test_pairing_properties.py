import pytest
from backend.app.features.pairing.feasibility import solve_pairing_feasibility
from backend.app.shared.models import Classroom, GroupEntity, ClassroomMember, User, Assignment, Criterion, PairAssignment
from backend.app.features.pairing.engine import (
    generate_group_pairs_for_criterion, generate_individual_pairs_for_criterion
)

def test_feasibility_auto_reduction_small_class():
    """
    US-PAIR-01 / §8.2 Example 2: Small room (S=12, N=3, R=5)
    Should automatically reduce R to 4 with clear explanation.
    """
    res = solve_pairing_feasibility(
        num_students=12,
        group_sizes=[4, 4, 4],
        target_coverage=5,
        max_workload=8
    )
    assert res.is_feasible is True
    assert res.auto_reduced is True
    assert res.actual_coverage == 4
    assert res.workload_per_student_per_criterion == 1
    assert "สูงสุด 4 ครั้งต่อคู่" in res.explanation

def test_feasibility_large_class():
    """
    US-PAIR-01 / §8.2 Example 1: Large room (S=200, N=10, R=5)
    Should pass with R=5 and workload k=2.
    """
    res = solve_pairing_feasibility(
        num_students=200,
        group_sizes=[20] * 10,
        target_coverage=5,
        max_workload=8
    )
    assert res.is_feasible is True
    assert res.auto_reduced is False
    assert res.actual_coverage == 5
    assert res.workload_per_student_per_criterion == 2

def test_pairing_invariants_inv1_to_inv5(db_session):
    """
    US-PAIR-02 / INV-1..5:
    - INV-1: No evaluator gets pair with own group
    - INV-2: No evaluator gets same pair twice in same criterion
    - INV-3: Balanced coverage (max - min <= 1)
    - INV-4: Balanced workload (max - min <= 1)
    - INV-5: Determinism with seed
    """
    # Create test classroom with 4 groups of 4 students each = 16 students
    user_creator = User(email_normalized="creator@uni.ac.th", email_raw="creator@uni.ac.th", status="ACTIVE")
    db_session.add(user_creator)
    db_session.flush()

    c = Classroom(name="Test Room", slug="test-room", created_by=user_creator.id)
    db_session.add(c)
    db_session.flush()

    groups = []
    students = []
    for g_idx in range(4):
        grp = GroupEntity(classroom_id=c.id, name=f"Group_{g_idx+1}")
        db_session.add(grp)
        db_session.flush()
        groups.append(grp)

        for s_idx in range(4):
            u = User(email_normalized=f"s{g_idx}_{s_idx}@uni.ac.th", email_raw=f"s{g_idx}_{s_idx}@uni.ac.th", status="ACTIVE")
            db_session.add(u)
            db_session.flush()
            mem = ClassroomMember(classroom_id=c.id, user_id=u.id, role="STUDENT", group_id=grp.id)
            db_session.add(mem)
            students.append(u)

    asg = Assignment(
        classroom_id=c.id,
        name="Asg 1",
        slug="asg-1",
        target_coverage=5,
        max_workload=8,
        status="DRAFT",
        created_by=user_creator.id
    )
    db_session.add(asg)
    db_session.flush()

    crit = Criterion(assignment_id=asg.id, side="GROUP", name="Crit 1", weight_pct=100.0)
    db_session.add(crit)
    db_session.commit()

    # Generate pairs with fixed seed
    seed = 12345
    feas = solve_pairing_feasibility(16, [4, 4, 4, 4], 5, 8)
    pairs_gen1 = generate_group_pairs_for_criterion(
        db_session, asg, crit, seed, feas.actual_coverage, feas.workload_per_student_per_criterion
    )

    # Student to group mapping
    student_group_map = {}
    for s in students:
        m = db_session.query(ClassroomMember).filter(ClassroomMember.user_id == s.id).first()
        student_group_map[s.id] = m.group_id

    # Test INV-1: No student gets own group
    for p in pairs_gen1:
        eval_group = student_group_map[p.evaluator_user_id]
        assert eval_group != p.item_a_id, "INV-1 violated: evaluator assigned pair containing own group!"
        assert eval_group != p.item_b_id, "INV-1 violated: evaluator assigned pair containing own group!"

    # Test INV-2: No student gets same pair twice
    eval_assigned_pairs = {}
    for p in pairs_gen1:
        pair_key = (min(p.item_a_id, p.item_b_id), max(p.item_a_id, p.item_b_id))
        eval_assigned_pairs.setdefault(p.evaluator_user_id, []).append(pair_key)

    for eval_id, p_list in eval_assigned_pairs.items():
        assert len(p_list) == len(set(p_list)), f"INV-2 violated: duplicate pair for evaluator {eval_id}"

    # Test INV-3: Balanced coverage
    pair_coverage = {}
    for p in pairs_gen1:
        pair_key = (min(p.item_a_id, p.item_b_id), max(p.item_a_id, p.item_b_id))
        pair_coverage[pair_key] = pair_coverage.get(pair_key, 0) + 1

    assert max(pair_coverage.values()) - min(pair_coverage.values()) <= 1, "INV-3 violated: coverage difference > 1"

    # Test INV-4: Balanced workload
    workloads = [len(plist) for plist in eval_assigned_pairs.values()]
    assert max(workloads) - min(workloads) <= 1, "INV-4 violated: workload difference > 1"

    # Test INV-5: Determinism (re-running with same seed produces identical pair list)
    db_session.query(PairAssignment).filter(PairAssignment.assignment_id == asg.id).delete()
    pairs_gen2 = generate_group_pairs_for_criterion(
        db_session, asg, crit, seed, feas.actual_coverage, feas.workload_per_student_per_criterion
    )

    assert len(pairs_gen1) == len(pairs_gen2)
    for p1, p2 in zip(pairs_gen1, pairs_gen2):
        assert p1.item_a_id == p2.item_a_id
        assert p1.item_b_id == p2.item_b_id
        assert p1.evaluator_user_id == p2.evaluator_user_id
        assert p1.display_left_item_id == p2.display_left_item_id

def test_individual_pairing_small_group_handling(db_session):
    """
    US-PAIR-03 / FR-PAIR-12 / FR-PAIR-13 / §8.3:
    Group size m <= 2 has 0 pairs.
    Group size m = 3 creates pairs.
    """
    user_creator = User(email_normalized="owner@uni.ac.th", email_raw="owner@uni.ac.th", status="ACTIVE")
    db_session.add(user_creator)
    db_session.flush()

    c = Classroom(name="Room Small", slug="room-small", created_by=user_creator.id)
    db_session.add(c)
    db_session.flush()

    # Small group 1: 2 students
    g2 = GroupEntity(classroom_id=c.id, name="Group2")
    db_session.add(g2)
    db_session.flush()
    for i in range(2):
        u = User(email_normalized=f"g2_{i}@uni.ac.th", email_raw=f"g2_{i}@uni.ac.th", status="ACTIVE")
        db_session.add(u)
        db_session.flush()
        db_session.add(ClassroomMember(classroom_id=c.id, user_id=u.id, role="STUDENT", group_id=g2.id))

    # Small group 2: 3 students
    g3 = GroupEntity(classroom_id=c.id, name="Group3")
    db_session.add(g3)
    db_session.flush()
    for i in range(3):
        u = User(email_normalized=f"g3_{i}@uni.ac.th", email_raw=f"g3_{i}@uni.ac.th", status="ACTIVE")
        db_session.add(u)
        db_session.flush()
        db_session.add(ClassroomMember(classroom_id=c.id, user_id=u.id, role="STUDENT", group_id=g3.id))

    asg = Assignment(
        classroom_id=c.id,
        name="Asg Indiv",
        slug="asg-indiv",
        group_max_score=15.0,
        individual_max_score=5.0,
        max_workload=8,
        status="DRAFT",
        created_by=user_creator.id
    )
    db_session.add(asg)
    db_session.flush()

    crit = Criterion(assignment_id=asg.id, side="INDIVIDUAL", name="Teamwork", weight_pct=100.0)
    db_session.add(crit)
    db_session.commit()

    pairs = generate_individual_pairs_for_criterion(db_session, asg, crit, seed=42)

    # Group 2 should have 0 pairs
    # Group 3 has 3 students. For each evaluator, they evaluate the other 2 (1 pair each) -> total 3 pairs.
    assert len(pairs) == 3
    for p in pairs:
        # Evaluator must not be in item_a or item_b
        assert p.evaluator_user_id not in [p.item_a_id, p.item_b_id]
