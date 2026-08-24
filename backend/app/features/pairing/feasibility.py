import math
from typing import List, Tuple, Dict
from backend.app.features.pairing.schemas import FeasibilityReportResponse

def solve_pairing_feasibility(
    num_students: int,
    group_sizes: List[int],
    target_coverage: int = 5,
    max_workload: int = 8
) -> FeasibilityReportResponse:
    """
    US-PAIR-01 / FR-PAIR-04 / FR-PAIR-05 / PRD §8.2:
    Computes mathematical feasibility for group pairwise evaluation.
    P = C(N, 2)
    slots_needed = P * R
    k = ceil(slots_needed / S)

    Constraints:
    (1) k <= P - (N - 1)
    (2) k <= k_max
    (3) R <= min over pairs of (S - |a| - |b|)
    """
    N = len(group_sizes)
    S = num_students

    if N < 2 or S < 2:
        return FeasibilityReportResponse(
            is_feasible=False,
            target_coverage=target_coverage,
            actual_coverage=0,
            workload_per_student_per_criterion=0,
            total_group_pairs=0,
            total_group_comparisons_per_criterion=0,
            total_students=S,
            total_groups=N,
            auto_reduced=True,
            explanation="Requires at least 2 groups and 2 students to perform evaluation."
        )

    P = N * (N - 1) // 2

    # (3) Max theoretical eligible students for any group pair (a, b)
    # The two largest groups determine the bottleneck
    sorted_sizes = sorted(group_sizes, reverse=True)
    largest_pair_size = sorted_sizes[0] + sorted_sizes[1] if N >= 2 else sorted_sizes[0]
    max_possible_R = max(0, S - largest_pair_size)

    # Solve for highest feasible R <= target_coverage
    solved_R = min(target_coverage, max_possible_R)
    solved_k = 0

    while solved_R > 0:
        slots_needed = P * solved_R
        k = math.ceil(slots_needed / S) if S > 0 else 0

        cond1 = (k <= P - (N - 1))  # Cannot evaluate pairs containing own group
        cond2 = (k <= max_workload)  # Workload ceiling
        cond3 = (solved_R <= max_possible_R)  # Availability of eligible peers

        if cond1 and cond2 and cond3:
            solved_k = k
            break
        solved_R -= 1

    if solved_R == 0:
        return FeasibilityReportResponse(
            is_feasible=False,
            target_coverage=target_coverage,
            actual_coverage=0,
            workload_per_student_per_criterion=0,
            total_group_pairs=P,
            total_group_comparisons_per_criterion=0,
            total_students=S,
            total_groups=N,
            auto_reduced=True,
            explanation="Classroom size/group distribution is too small to form valid pairwise comparisons without self-evaluations."
        )

    auto_reduced = (solved_R < target_coverage)
    if auto_reduced:
        explanation = (
            f"ห้องนี้มี {N} กลุ่ม (นักศึกษา {S} คน) แต่ละคู่มีผู้มีสิทธิ์ประเมินสูงสุด {max_possible_R} คน "
            f"จึงตั้ง coverage ได้สูงสุด {solved_R} ครั้งต่อคู่ (จากเป้าหมายเดิม {target_coverage}) "
            f"นักศึกษาแต่ละคนจะได้ภาระงาน {solved_k} คู่ต่อเกณฑ์"
        )
    else:
        explanation = (
            f"ความพร้อมสมบูรณ์: นักศึกษา {S} คน, {N} กลุ่ม จัดสรรเป้าหมาย coverage {solved_R} ครั้งต่อคู่ "
            f"ภาระงาน {solved_k} คู่ต่อคนต่อเกณฑ์ (รวม {P * solved_R} comparisons)"
        )

    return FeasibilityReportResponse(
        is_feasible=True,
        target_coverage=target_coverage,
        actual_coverage=solved_R,
        workload_per_student_per_criterion=solved_k,
        total_group_pairs=P,
        total_group_comparisons_per_criterion=P * solved_R,
        total_students=S,
        total_groups=N,
        auto_reduced=auto_reduced,
        explanation=explanation
    )
