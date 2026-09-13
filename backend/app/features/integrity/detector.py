import itertools
from typing import List, Dict, Tuple, Set
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from backend.app.shared.models import (
    Assignment, Criterion, ClassroomMember, User, GroupEntity,
    PairAssignment, Comparison, AuditEvent
)
from backend.app.features.integrity.schemas import QualitySignalItem, QualityReportResponse, ExcludeComparisonRequest

def detect_quality_signals(db: Session, assignment: Assignment) -> QualityReportResponse:
    """
    US-INTEG-01 / QS-01..07 / FR-QS-01..03 / PRD §10:
    Detect evaluation anomalies and quality signals.
    """
    signals: List[QualitySignalItem] = []

    pairs = db.query(PairAssignment).filter(PairAssignment.assignment_id == assignment.id).all()
    comps = db.query(Comparison).join(
        PairAssignment, Comparison.pair_assignment_id == PairAssignment.id
    ).filter(PairAssignment.assignment_id == assignment.id).all()

    submitted_comps = [c for c in comps if c.status == "SUBMITTED" and c.choice is not None]
    total_comps = len(pairs)

    # 1. Group comparisons by evaluator
    evaluator_comps: Dict[str, List[Comparison]] = {}
    for c in submitted_comps:
        evaluator_comps.setdefault(c.evaluator_user_id, []).append(c)

    # Evaluator names map
    users = db.query(User).all()
    user_name_map = {u.id: (u.display_name or u.email_raw) for u in users}

    # Group names map
    groups = db.query(GroupEntity).filter(GroupEntity.classroom_id == assignment.classroom_id).all()
    group_name_map = {g.id: g.name for g in groups}

    # Detect per-evaluator signals
    for eval_uid, u_comps in evaluator_comps.items():
        eval_name = user_name_map.get(eval_uid, eval_uid)
        n = len(u_comps)
        if n < 3:
            continue

        # QS-02: Straight-lining (> 80% same choice)
        choice_counts = {}
        for c in u_comps:
            choice_counts[c.choice] = choice_counts.get(c.choice, 0) + 1
        max_same = max(choice_counts.values())
        same_pct = (max_same / n) * 100.0
        if same_pct > 80.0:
            signals.append(QualitySignalItem(
                signal_id="QS-02",
                signal_name="Straight-lining",
                severity="WARNING",
                affected_entity_type="EVALUATOR",
                affected_entity_id=eval_uid,
                affected_entity_name=eval_name,
                metric_value=round(same_pct, 1),
                threshold_value=80.0,
                details=f"ผู้ประเมินเลือกตัวเลือกเดิมซ้ำกัน {round(same_pct, 1)}% ({max_same}/{n} ข้อ)",
                recommended_action="ทบทวนผลการประเมินด้วยตา (Manual Review)"
            ))

        # QS-03: Position bias (> 80% left or right side)
        # choices 1..3 indicate Left preference, 4..6 indicate Right preference
        left_count = sum(1 for c in u_comps if c.choice in [1, 2, 3])
        right_count = sum(1 for c in u_comps if c.choice in [4, 5, 6])
        left_pct = (left_count / n) * 100.0
        right_pct = (right_count / n) * 100.0
        max_side_pct = max(left_pct, right_pct)
        if max_side_pct > 80.0:
            side_str = "ฝั่งซ้าย" if left_pct > right_pct else "ฝั่งขวา"
            signals.append(QualitySignalItem(
                signal_id="QS-03",
                signal_name="Position Bias",
                severity="WARNING",
                affected_entity_type="EVALUATOR",
                affected_entity_id=eval_uid,
                affected_entity_name=eval_name,
                metric_value=round(max_side_pct, 1),
                threshold_value=80.0,
                details=f"ผู้ประเมินเลือกเอนเอียงไปทาง{side_str}มากถึง {round(max_side_pct, 1)}%",
                recommended_action="ทบทวนผลการประเมินด้วยตา (Manual Review)"
            ))

        # QS-05: Speed running (< 3,000 ms average)
        times = [c.time_on_task_ms for c in u_comps if c.time_on_task_ms > 0]
        if times:
            avg_time_ms = sum(times) / len(times)
            if avg_time_ms < 3000:
                signals.append(QualitySignalItem(
                    signal_id="QS-05",
                    signal_name="Speed Running",
                    severity="WARNING",
                    affected_entity_type="EVALUATOR",
                    affected_entity_id=eval_uid,
                    affected_entity_name=eval_name,
                    metric_value=round(avg_time_ms, 0),
                    threshold_value=3000.0,
                    details=f"เวลาเฉลี่ยต่อข้อต่ำผิดปกติ ({round(avg_time_ms/1000, 1)} วินาที/ข้อ)",
                    recommended_action="ทบทวนว่าผู้ประเมินได้เปิดดูผลงานของเพื่อนจริงหรือไม่"
                ))

        # QS-04: Intransitivity 3-cycles (A > B, B > C, C > A in > 20% triples)
        # Build preference graph: X -> Y if evaluator preferred X over Y
        # Group evaluations by criterion
        eval_crit_comps: Dict[str, List[Comparison]] = {}
        for c in u_comps:
            eval_crit_comps.setdefault(c.pair_assignment.criterion_id, []).append(c)

        for cr_id, c_list in eval_crit_comps.items():
            preferred: Dict[Tuple[str, str], bool] = {}
            nodes = set()
            for c in c_list:
                p = c.pair_assignment
                left_id = p.display_left_item_id
                right_id = p.item_b_id if p.item_a_id == left_id else p.item_a_id
                nodes.add(left_id)
                nodes.add(right_id)
                if c.choice in [1, 2, 3]:  # Left preferred
                    preferred[(left_id, right_id)] = True
                elif c.choice in [4, 5, 6]:  # Right preferred
                    preferred[(right_id, left_id)] = True

            node_list = list(nodes)
            if len(node_list) >= 3:
                triples_checked = 0
                cycles_found = 0
                for a, b, c_node in itertools.combinations(node_list, 3):
                    # Check if all 3 pairwise comparisons exist
                    has_ab = (a, b) in preferred or (b, a) in preferred
                    has_bc = (b, c_node) in preferred or (c_node, b) in preferred
                    has_ca = (c_node, a) in preferred or (a, c_node) in preferred
                    if has_ab and has_bc and has_ca:
                        triples_checked += 1
                        # Cycle 1: a > b, b > c, c > a
                        if preferred.get((a, b)) and preferred.get((b, c_node)) and preferred.get((c_node, a)):
                            cycles_found += 1
                        # Cycle 2: a > c, c > b, b > a
                        elif preferred.get((a, c_node)) and preferred.get((c_node, b)) and preferred.get((b, a)):
                            cycles_found += 1

                if triples_checked > 0:
                    cycle_pct = (cycles_found / triples_checked) * 100.0
                    if cycle_pct > 20.0:
                        signals.append(QualitySignalItem(
                            signal_id="QS-04",
                            signal_name="Intransitivity Cycle",
                            severity="ALERT",
                            affected_entity_type="EVALUATOR",
                            affected_entity_id=eval_uid,
                            affected_entity_name=eval_name,
                            metric_value=round(cycle_pct, 1),
                            threshold_value=20.0,
                            details=f"พบวงคำตอบขัดแย้งเชิงตรรกะ (A>B, B>C, C>A) {round(cycle_pct, 1)}% ({cycles_found}/{triples_checked} triples)",
                            recommended_action="ทบทวนความตั้งใจของผู้ประเมิน หรือพิจารณา Exclude คำตอบ"
                        ))

    # 2. Detect QS-01: Low Coverage per item
    item_comp_counts: Dict[str, int] = {}
    for c in submitted_comps:
        p = c.pair_assignment
        item_comp_counts[p.item_a_id] = item_comp_counts.get(p.item_a_id, 0) + 1
        item_comp_counts[p.item_b_id] = item_comp_counts.get(p.item_b_id, 0) + 1

    all_items = set()
    for p in pairs:
        all_items.add(p.item_a_id)
        all_items.add(p.item_b_id)

    for itm in all_items:
        cnt = item_comp_counts.get(itm, 0)
        if cnt < assignment.min_comparisons:
            itm_name = group_name_map.get(itm, user_name_map.get(itm, itm))
            signals.append(QualitySignalItem(
                signal_id="QS-01",
                signal_name="Low Coverage",
                severity="INFO",
                affected_entity_type="ITEM",
                affected_entity_id=itm,
                affected_entity_name=itm_name,
                metric_value=float(cnt),
                threshold_value=float(assignment.min_comparisons),
                details=f"ได้รับผลการเปรียบเทียบเพียง {cnt} ครั้ง (เกณฑ์ขั้นต่ำ {assignment.min_comparisons} ครั้ง)",
                recommended_action="ใช้นโยบาย 'ส่งประเมินเพิ่ม' หรืออาจารย์ประเมินด้วยตนเอง"
            ))

    has_anomalies = any(s.severity in ["WARNING", "ALERT"] for s in signals)
    summary = f"ตรวจพบสัญญาณคุณภาพ {len(signals)} รายการ (Anomalies: {sum(1 for s in signals if s.severity != 'INFO')})"

    return QualityReportResponse(
        assignment_id=assignment.id,
        total_comparisons=total_comps,
        submitted_comparisons=len(submitted_comps),
        signals=signals,
        has_anomalies=has_anomalies,
        summary=summary
    )

def exclude_comparison(db: Session, assignment: Assignment, req: ExcludeComparisonRequest, current_user: User):
    """FR-QS-02: Instructor marks comparison as EXCLUDED with reason"""
    comp = db.query(Comparison).filter(Comparison.id == req.comparison_id).first()
    if not comp:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Comparison not found")

    comp.status = "EXCLUDED"
    comp.excluded_reason = req.reason
    comp.excluded_by = current_user.id

    # Log audit event
    audit = AuditEvent(
        classroom_id=assignment.classroom_id,
        assignment_id=assignment.id,
        actor_user_id=current_user.id,
        action="EXCLUDE_COMPARISON",
        resource_type="COMPARISON",
        resource_id=comp.id,
        reason=req.reason
    )
    db.add(audit)
    db.commit()
    return {"success": True, "message": "Comparison excluded and audit logged"}
