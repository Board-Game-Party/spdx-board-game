from decimal import Decimal, ROUND_HALF_UP
from typing import List, Dict, Tuple, Optional, Any
from dataclasses import dataclass, field

CHOICE_POINT_MAP = {
    1: (Decimal("1.0"), Decimal("0.0")),  # Left much better
    2: (Decimal("0.8"), Decimal("0.2")),  # Left better
    3: (Decimal("0.6"), Decimal("0.4")),  # Left slightly better
    4: (Decimal("0.4"), Decimal("0.6")),  # Right slightly better
    5: (Decimal("0.2"), Decimal("0.8")),  # Right better
    6: (Decimal("0.0"), Decimal("1.0")),  # Right much better
}

@dataclass
class RawComparisonInput:
    pair_assignment_id: str
    criterion_id: str
    side: str  # GROUP | INDIVIDUAL
    item_a_id: str
    item_b_id: str
    display_left_item_id: str
    evaluator_user_id: str
    evaluator_is_instructor: bool
    choice: int  # 1..6
    status: str  # SUBMITTED | DRAFT | EXCLUDED

@dataclass
class CriterionConfig:
    id: str
    side: str
    name: str
    weight_pct: Decimal  # e.g. Decimal("40.0")

@dataclass
class AssignmentScoringConfig:
    assignment_id: str
    group_max_score: Decimal
    individual_max_score: Decimal
    score_floor: Decimal = Decimal("0.600")
    score_ceiling: Decimal = Decimal("1.000")
    instructor_weight: Decimal = Decimal("1.0")
    completion_threshold: Decimal = Decimal("0.900")
    min_comparisons: int = 3
    formula_version: str = "v2.0"

@dataclass
class ItemCriterionScore:
    item_id: str
    criterion_id: str
    side: str
    comparison_count: int
    effective_weight_sum: Decimal
    quality_index: Decimal
    score_ratio: Decimal
    weighted_score: Decimal
    flags: List[str] = field(default_factory=list)

@dataclass
class ItemTotalScore:
    item_id: str
    side: str  # GROUP | INDIVIDUAL
    component_score: Decimal
    criterion_scores: Dict[str, ItemCriterionScore]
    comparison_count: int
    flags: List[str] = field(default_factory=list)

@dataclass
class StudentPersonalScore:
    student_user_id: str
    group_id: Optional[str]
    group_component_score: Decimal
    individual_component_score: Decimal
    assigned_comparisons: int
    submitted_comparisons: int
    participation_ratio: Decimal
    participation_multiplier: Decimal
    net_score: Decimal
    flags: List[str] = field(default_factory=list)

@dataclass
class ScoringEngineResult:
    group_scores: Dict[str, ItemTotalScore]
    individual_scores: Dict[str, ItemTotalScore]
    student_personal_scores: Dict[str, StudentPersonalScore]
    formula_version: str

def compute_quality_index_and_scores(
    config: AssignmentScoringConfig,
    criteria: List[CriterionConfig],
    all_comparisons: List[RawComparisonInput],
    all_assigned_pairs: List[Any],
    student_group_mapping: Dict[str, Optional[str]],
    small_group_ids: Optional[set] = None
) -> ScoringEngineResult:
    """
    AR-01 / FR-SCORE-01..13 / PRD §9: Pure Function Scoring Engine.
    Zero internal state, fully reproducible.
    """
    small_group_ids = small_group_ids or set()
    # Filter only SUBMITTED comparisons (DR-01)
    valid_comps = [
        c for c in all_comparisons
        if c.status == "SUBMITTED" and 1 <= c.choice <= 6
    ]

    # Map comparisons by (item_id, criterion_id)
    # Each entry: list of (evaluator_weight, point_for_item)
    item_criterion_votes: Dict[Tuple[str, str], List[Tuple[Decimal, Decimal]]] = {}

    for c in valid_comps:
        w_e = config.instructor_weight if c.evaluator_is_instructor else Decimal("1.0")
        s_left, s_right = CHOICE_POINT_MAP[c.choice]

        # Left item gets s_left, Right item gets s_right
        left_id = c.display_left_item_id
        right_id = c.item_b_id if c.item_a_id == left_id else c.item_a_id

        item_criterion_votes.setdefault((left_id, c.criterion_id), []).append((w_e, s_left))
        item_criterion_votes.setdefault((right_id, c.criterion_id), []).append((w_e, s_right))

    # All unique items per side
    group_criteria = [cr for cr in criteria if cr.side == "GROUP"]
    indiv_criteria = [cr for cr in criteria if cr.side == "INDIVIDUAL"]

    group_item_ids = set()
    indiv_item_ids = set()
    for p in all_assigned_pairs:
        side = p.side if hasattr(p, "side") else p["side"]
        item_a = p.item_a_id if hasattr(p, "item_a_id") else p["item_a_id"]
        item_b = p.item_b_id if hasattr(p, "item_b_id") else p["item_b_id"]
        if side == "GROUP":
            group_item_ids.add(item_a)
            group_item_ids.add(item_b)
        else:
            indiv_item_ids.add(item_a)
            indiv_item_ids.add(item_b)

    # 1. Compute Group Item Scores
    group_scores: Dict[str, ItemTotalScore] = {}
    for g_id in group_item_ids:
        crit_map = {}
        total_comp_count = 0
        total_component = Decimal("0.0")
        group_flags = []

        for cr in group_criteria:
            votes = item_criterion_votes.get((g_id, cr.id), [])
            count = len(votes)
            total_comp_count += count

            if votes:
                sum_weighted_points = sum(w * pt for w, pt in votes)
                sum_weights = sum(w for w, _ in votes)
                q = sum_weighted_points / sum_weights
            else:
                sum_weights = Decimal("0.0")
                q = Decimal("0.50000")  # Default neutral

            # Band mapping: score_ratio = floor + (ceiling - floor) * q
            score_ratio = config.score_floor + (config.score_ceiling - config.score_floor) * q

            # Weighted score: score_ratio * (weight_pct / 100) * group_max_score
            weighted = score_ratio * (cr.weight_pct / Decimal("100.0")) * config.group_max_score
            total_component += weighted

            c_flags = []
            if count < config.min_comparisons:
                c_flags.append("LOW_CONFIDENCE")
                if "LOW_CONFIDENCE" not in group_flags:
                    group_flags.append("LOW_CONFIDENCE")

            crit_map[cr.id] = ItemCriterionScore(
                item_id=g_id,
                criterion_id=cr.id,
                side="GROUP",
                comparison_count=count,
                effective_weight_sum=sum_weights,
                quality_index=q,
                score_ratio=score_ratio,
                weighted_score=weighted,
                flags=c_flags
            )

        group_scores[g_id] = ItemTotalScore(
            item_id=g_id,
            side="GROUP",
            component_score=total_component,
            criterion_scores=crit_map,
            comparison_count=total_comp_count,
            flags=group_flags
        )

    # 2. Compute Individual Item Scores
    indiv_scores: Dict[str, ItemTotalScore] = {}
    for u_id in indiv_item_ids:
        crit_map = {}
        total_comp_count = 0
        total_component = Decimal("0.0")
        indiv_flags = []

        # Check if student is in small group (m=3)
        student_grp = student_group_mapping.get(u_id)
        if student_grp in small_group_ids:
            indiv_flags.append("LOW_CONFIDENCE")

        for cr in indiv_criteria:
            votes = item_criterion_votes.get((u_id, cr.id), [])
            count = len(votes)
            total_comp_count += count

            if votes:
                sum_weighted_points = sum(w * pt for w, pt in votes)
                sum_weights = sum(w for w, _ in votes)
                q = sum_weighted_points / sum_weights
            else:
                sum_weights = Decimal("0.0")
                q = Decimal("0.50000")

            score_ratio = config.score_floor + (config.score_ceiling - config.score_floor) * q
            weighted = score_ratio * (cr.weight_pct / Decimal("100.0")) * config.individual_max_score
            total_component += weighted

            c_flags = []
            if count < config.min_comparisons or student_grp in small_group_ids:
                c_flags.append("LOW_CONFIDENCE")
                if "LOW_CONFIDENCE" not in indiv_flags:
                    indiv_flags.append("LOW_CONFIDENCE")

            crit_map[cr.id] = ItemCriterionScore(
                item_id=u_id,
                criterion_id=cr.id,
                side="INDIVIDUAL",
                comparison_count=count,
                effective_weight_sum=sum_weights,
                quality_index=q,
                score_ratio=score_ratio,
                weighted_score=weighted,
                flags=c_flags
            )

        indiv_scores[u_id] = ItemTotalScore(
            item_id=u_id,
            side="INDIVIDUAL",
            component_score=total_component,
            criterion_scores=crit_map,
            comparison_count=total_comp_count,
            flags=indiv_flags
        )

    # 3. Compute Participation Ratio (p), Multiplier (M), and Final Personal Score
    student_personal_scores: Dict[str, StudentPersonalScore] = {}

    # Count assigned vs submitted comparisons per student
    student_assigned_cnt: Dict[str, int] = {}
    for p in all_assigned_pairs:
        eval_uid = p.evaluator_user_id if hasattr(p, "evaluator_user_id") else p["evaluator_user_id"]
        student_assigned_cnt[eval_uid] = student_assigned_cnt.get(eval_uid, 0) + 1

    student_submitted_cnt: Dict[str, int] = {}
    for c in valid_comps:
        student_submitted_cnt[c.evaluator_user_id] = student_submitted_cnt.get(c.evaluator_user_id, 0) + 1

    for s_id, g_id in student_group_mapping.items():
        assigned = student_assigned_cnt.get(s_id, 0)
        submitted = student_submitted_cnt.get(s_id, 0)

        if assigned > 0:
            p_ratio = Decimal(submitted) / Decimal(assigned)
        else:
            p_ratio = Decimal("1.0")

        if config.completion_threshold > Decimal("0.0"):
            raw_m = p_ratio / config.completion_threshold
            multiplier = min(Decimal("1.0"), raw_m)
        else:
            multiplier = Decimal("1.0")

        grp_comp = group_scores[g_id].component_score if g_id and g_id in group_scores else Decimal("0.0")
        ind_comp = indiv_scores[s_id].component_score if s_id in indiv_scores else Decimal("0.0")

        net_score = (grp_comp + ind_comp) * multiplier

        student_flags = []
        if g_id and g_id in group_scores and "LOW_CONFIDENCE" in group_scores[g_id].flags:
            student_flags.append("LOW_CONFIDENCE_GROUP")
        if s_id in indiv_scores and "LOW_CONFIDENCE" in indiv_scores[s_id].flags:
            student_flags.append("LOW_CONFIDENCE_INDIVIDUAL")

        student_personal_scores[s_id] = StudentPersonalScore(
            student_user_id=s_id,
            group_id=g_id,
            group_component_score=grp_comp,
            individual_component_score=ind_comp,
            assigned_comparisons=assigned,
            submitted_comparisons=submitted,
            participation_ratio=p_ratio,
            participation_multiplier=multiplier,
            net_score=net_score,
            flags=student_flags
        )

    return ScoringEngineResult(
        group_scores=group_scores,
        individual_scores=indiv_scores,
        student_personal_scores=student_personal_scores,
        formula_version=config.formula_version
    )
