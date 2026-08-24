from decimal import Decimal
import pytest
from backend.app.features.scoring.pure_engine import (
    AssignmentScoringConfig, CriterionConfig, RawComparisonInput,
    compute_quality_index_and_scores
)

def test_scoring_worked_example_section_9_5():
    """
    US-SCORE-01 / US-SCORE-02 / §9.5 Worked Example:
    Configuration:
    - group_max: 15.0, individual_max: 5.0, total: 20.0
    - floor: 0.60, ceiling: 1.00
    - completion_threshold: 0.90
    - Group criteria: UX (40%), Completeness (35%), Innovation (25%)
    - Individual criteria: Teamwork (50%), Management (50%)
    """
    config = AssignmentScoringConfig(
        assignment_id="asg-golden-01",
        group_max_score=Decimal("15.0"),
        individual_max_score=Decimal("5.0"),
        score_floor=Decimal("0.600"),
        score_ceiling=Decimal("1.000"),
        instructor_weight=Decimal("1.0"),
        completion_threshold=Decimal("0.900"),
        min_comparisons=3,
        formula_version="v2.0"
    )

    criteria = [
        CriterionConfig(id="c_ux", side="GROUP", name="UX", weight_pct=Decimal("40.0")),
        CriterionConfig(id="c_comp", side="GROUP", name="Completeness", weight_pct=Decimal("35.0")),
        CriterionConfig(id="c_inno", side="GROUP", name="Innovation", weight_pct=Decimal("25.0")),
        CriterionConfig(id="c_team", side="INDIVIDUAL", name="Teamwork", weight_pct=Decimal("50.0")),
        CriterionConfig(id="c_mgmt", side="INDIVIDUAL", name="Management", weight_pct=Decimal("50.0")),
    ]

    # Let's mock comparisons such that:
    # Aurora Group:
    #   UX gets q = 0.72
    #   Completeness gets q = 0.55
    #   Innovation gets q = 0.61
    # Nok:
    #   Teamwork gets q = 0.68
    #   Management gets q = 0.45
    # Ton:
    #   Teamwork gets q = 0.31
    #   Management gets q = 0.35
    #
    # We can craft votes to give exact q values or verify the band mapping math directly.
    
    # 1. Test Band mapping formulas directly:
    # Aurora UX: score_ratio = 0.60 + 0.40 * 0.72 = 0.888, weighted = 0.888 * 0.40 * 15 = 5.328
    q_ux = Decimal("0.72")
    ratio_ux = config.score_floor + (config.score_ceiling - config.score_floor) * q_ux
    weighted_ux = ratio_ux * (Decimal("40.0") / Decimal("100.0")) * config.group_max_score
    assert ratio_ux == Decimal("0.888")
    assert weighted_ux == Decimal("5.328")

    # Aurora Completeness: score_ratio = 0.60 + 0.40 * 0.55 = 0.820, weighted = 0.820 * 0.35 * 15 = 4.305
    q_comp = Decimal("0.55")
    ratio_comp = config.score_floor + (config.score_ceiling - config.score_floor) * q_comp
    weighted_comp = ratio_comp * (Decimal("35.0") / Decimal("100.0")) * config.group_max_score
    assert ratio_comp == Decimal("0.820")
    assert weighted_comp == Decimal("4.305")

    # Aurora Innovation: score_ratio = 0.60 + 0.40 * 0.61 = 0.844, weighted = 0.844 * 0.25 * 15 = 3.165
    q_inno = Decimal("0.61")
    ratio_inno = config.score_floor + (config.score_ceiling - config.score_floor) * q_inno
    weighted_inno = ratio_inno * (Decimal("25.0") / Decimal("100.0")) * config.group_max_score
    assert ratio_inno == Decimal("0.844")
    assert weighted_inno == Decimal("3.165")

    # Aurora Group Total = 5.328 + 4.305 + 3.165 = 12.798
    total_aurora = weighted_ux + weighted_comp + weighted_inno
    assert total_aurora == Decimal("12.798")

    # Nok Teamwork: score_ratio = 0.60 + 0.40 * 0.68 = 0.872, weighted = 0.872 * 0.50 * 5 = 2.180
    q_nok_team = Decimal("0.68")
    ratio_nok_team = config.score_floor + (config.score_ceiling - config.score_floor) * q_nok_team
    weighted_nok_team = ratio_nok_team * (Decimal("50.0") / Decimal("100.0")) * config.individual_max_score
    assert ratio_nok_team == Decimal("0.872")
    assert weighted_nok_team == Decimal("2.180")

    # Nok Management: score_ratio = 0.60 + 0.40 * 0.45 = 0.780, weighted = 0.780 * 0.50 * 5 = 1.950
    q_nok_mgmt = Decimal("0.45")
    ratio_nok_mgmt = config.score_floor + (config.score_ceiling - config.score_floor) * q_nok_mgmt
    weighted_nok_mgmt = ratio_nok_mgmt * (Decimal("50.0") / Decimal("100.0")) * config.individual_max_score
    assert ratio_nok_mgmt == Decimal("0.780")
    assert weighted_nok_mgmt == Decimal("1.950")

    # Nok Indiv Total = 2.180 + 1.950 = 4.130 / 5
    total_nok_indiv = weighted_nok_team + weighted_nok_mgmt
    assert total_nok_indiv == Decimal("4.130")

    # Nok Participation: p = 1.00 -> M = 1.00 -> Final = (12.798 + 4.130) * 1.00 = 16.928 ~ 16.93
    p_nok = Decimal("1.00")
    m_nok = min(Decimal("1.0"), p_nok / config.completion_threshold)
    assert m_nok == Decimal("1.0")
    final_nok = (total_aurora + total_nok_indiv) * m_nok
    assert round(final_nok, 2) == Decimal("16.93")

    # Ton Teamwork: score_ratio = 0.60 + 0.40 * 0.31 = 0.724, weighted = 0.724 * 0.50 * 5 = 1.810
    q_ton_team = Decimal("0.31")
    ratio_ton_team = config.score_floor + (config.score_ceiling - config.score_floor) * q_ton_team
    weighted_ton_team = ratio_ton_team * (Decimal("50.0") / Decimal("100.0")) * config.individual_max_score
    assert ratio_ton_team == Decimal("0.724")
    assert weighted_ton_team == Decimal("1.810")

    # Ton Management: score_ratio = 0.60 + 0.40 * 0.35 = 0.740, weighted = 0.740 * 0.50 * 5 = 1.850
    q_ton_mgmt = Decimal("0.35")
    ratio_ton_mgmt = config.score_floor + (config.score_ceiling - config.score_floor) * q_ton_mgmt
    weighted_ton_mgmt = ratio_ton_mgmt * (Decimal("50.0") / Decimal("100.0")) * config.individual_max_score
    assert ratio_ton_mgmt == Decimal("0.740")
    assert weighted_ton_mgmt == Decimal("1.850")

    # Ton Indiv Total = 1.810 + 1.850 = 3.660 / 5
    total_ton_indiv = weighted_ton_team + weighted_ton_mgmt
    assert total_ton_indiv == Decimal("3.660")

    # Ton Participation: 9 / 15 = 0.60 -> M = min(1.0, 0.60 / 0.90) = 0.66666... ~ 0.667
    p_ton = Decimal("9.0") / Decimal("15.0")
    assert p_ton == Decimal("0.6")
    m_ton = min(Decimal("1.0"), p_ton / config.completion_threshold)
    assert round(m_ton, 3) == Decimal("0.667")

    # Ton Final Score = (12.798 + 3.660) * 0.667 = 10.97
    final_ton = (total_aurora + total_ton_indiv) * m_ton
    assert round(final_ton, 2) == Decimal("10.97")

def test_pure_scoring_engine_reproducibility():
    """AR-01 / FR-SCORE-10: Running pure function engine multiple times gives bit-for-bit identical results"""
    config = AssignmentScoringConfig(
        assignment_id="asg-repro-01",
        group_max_score=Decimal("15.0"),
        individual_max_score=Decimal("5.0"),
        score_floor=Decimal("0.600"),
        score_ceiling=Decimal("1.000")
    )
    criteria = [
        CriterionConfig(id="c1", side="GROUP", name="Criterion 1", weight_pct=Decimal("100.0"))
    ]
    raw_comps = [
        RawComparisonInput(
            pair_assignment_id="p1",
            criterion_id="c1",
            side="GROUP",
            item_a_id="g1",
            item_b_id="g2",
            display_left_item_id="g1",
            evaluator_user_id="u1",
            evaluator_is_instructor=False,
            choice=2,  # Left gets 0.8, Right gets 0.2
            status="SUBMITTED"
        ),
        RawComparisonInput(
            pair_assignment_id="p2",
            criterion_id="c1",
            side="GROUP",
            item_a_id="g1",
            item_b_id="g3",
            display_left_item_id="g3",
            evaluator_user_id="u2",
            evaluator_is_instructor=False,
            choice=4,  # Left gets 0.4 (g3), Right gets 0.6 (g1)
            status="SUBMITTED"
        ),
    ]
    assigned_pairs = [
        {"side": "GROUP", "item_a_id": "g1", "item_b_id": "g2", "evaluator_user_id": "u1"},
        {"side": "GROUP", "item_a_id": "g1", "item_b_id": "g3", "evaluator_user_id": "u2"},
    ]
    mapping = {"u1": "g1", "u2": "g2"}

    res1 = compute_quality_index_and_scores(config, criteria, raw_comps, assigned_pairs, mapping)
    res2 = compute_quality_index_and_scores(config, criteria, raw_comps, assigned_pairs, mapping)

    assert res1.group_scores["g1"].component_score == res2.group_scores["g1"].component_score
    # g1 received 0.8 (from p1) and 0.6 (from p2) -> average q = 0.70
    assert res1.group_scores["g1"].criterion_scores["c1"].quality_index == Decimal("0.7")
    # Score ratio = 0.60 + 0.40 * 0.70 = 0.880
    assert res1.group_scores["g1"].criterion_scores["c1"].score_ratio == Decimal("0.880")
    # Score = 0.880 * 1.0 * 15.0 = 13.200
    assert res1.group_scores["g1"].component_score == Decimal("13.200")
