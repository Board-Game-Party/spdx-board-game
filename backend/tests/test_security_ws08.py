import json
from pathlib import Path
from backend.app.shared.models import Assignment, Criterion, PairAssignment, Comparison


FRONTEND_DIR = Path(__file__).resolve().parents[2] / "frontend"


def _parse_version(ver_str: str) -> tuple[int, ...]:
    clean = ver_str.lstrip("^~>=")
    return tuple(int(part) for part in clean.split(".")[:3])


def test_vitest_and_mocker_patched_versions():
    """Protect against regression of Dependabot Alerts #1, #2, #3 (vitest & @vitest/mocker Arbitrary File Read / Path Traversal)."""
    pkg_json = json.loads((FRONTEND_DIR / "package.json").read_text(encoding="utf-8"))
    lock_json = json.loads((FRONTEND_DIR / "package-lock.json").read_text(encoding="utf-8"))

    vitest_spec = pkg_json["devDependencies"]["vitest"]
    assert _parse_version(vitest_spec) >= (4, 1, 11), f"Expected vitest >= 4.1.11 in package.json, got {vitest_spec}"

    packages = lock_json.get("packages", {})
    vitest_locked = packages.get("node_modules/vitest", {}).get("version", "0.0.0")
    mocker_locked = packages.get("node_modules/@vitest/mocker", {}).get("version", "0.0.0")

    assert _parse_version(vitest_locked) >= (4, 1, 11), f"Vulnerable vitest version in package-lock.json: {vitest_locked}"
    assert _parse_version(mocker_locked) >= (4, 1, 11), f"Vulnerable @vitest/mocker version in package-lock.json: {mocker_locked}"


def test_tinypool_vulnerable_package_removed():
    """Protect against regression of Dependabot Alerts #5, #6 (tinypool Prototype Pollution to RCE)."""
    lock_json = json.loads((FRONTEND_DIR / "package-lock.json").read_text(encoding="utf-8"))
    packages = lock_json.get("packages", {})

    tinypool_entry = packages.get("node_modules/tinypool")
    if tinypool_entry is not None:
        version = tinypool_entry.get("version", "0.0.0")
        assert _parse_version(version) > (1, 1, 1), f"Vulnerable tinypool ({version}) present in package-lock.json"


def test_exclude_comparison_enforces_assignment_ownership(client, db_session):
    """Protect against Cross-Assignment IDOR when excluding a peer comparison (Security Checklist: Ownership verification)."""
    # Instructor A sets up Classroom A and Assignment A
    res_a = client.post("/api/auth/google", json={"email": "inst_a@uni.ac.th", "display_name": "Instructor A"})
    headers_a = {"Authorization": f"Bearer {res_a.json()['access_token']}"}
    cls_a = client.post("/api/classrooms", headers=headers_a, json={
        "name": "Classroom A", "slug": "sec-class-a", "timezone": "Asia/Bangkok"
    }).json()
    assign_a = client.post(f"/api/classrooms/{cls_a['id']}/assignments", headers=headers_a, json={
        "name": "Assignment A", "slug": "assign-a",
        "criteria": [{"side": "GROUP", "name": "C1", "description": "", "weight_pct": 100.0, "display_order": 1}]
    }).json()

    # Instructor B sets up Classroom B and Assignment B
    res_b = client.post("/api/auth/google", json={"email": "inst_b@uni.ac.th", "display_name": "Instructor B"})
    headers_b = {"Authorization": f"Bearer {res_b.json()['access_token']}"}
    band_b_user_id = res_b.json()["user"]["id"]
    cls_b = client.post("/api/classrooms", headers=headers_b, json={
        "name": "Classroom B", "slug": "sec-class-b", "timezone": "Asia/Bangkok"
    }).json()
    assign_b = client.post(f"/api/classrooms/{cls_b['id']}/assignments", headers=headers_b, json={
        "name": "Assignment B", "slug": "assign-b",
        "criteria": [{"side": "GROUP", "name": "C1", "description": "", "weight_pct": 100.0, "display_order": 1}]
    }).json()

    # Create a PairAssignment and Comparison belonging to Assignment B
    crit_b = db_session.query(Criterion).filter(Criterion.assignment_id == assign_b["id"]).first()
    pair_b = PairAssignment(
        assignment_id=assign_b["id"],
        criterion_id=crit_b.id,
        side="GROUP",
        item_a_id="group-1",
        item_b_id="group-2",
        evaluator_user_id=band_b_user_id,
        display_left_item_id="group-1",
        generation=1,
        source="AUTO",
    )
    db_session.add(pair_b)
    db_session.flush()

    comp_b = Comparison(
        pair_assignment_id=pair_b.id,
        evaluator_user_id=band_b_user_id,
        choice=4,
        status="SUBMITTED",
    )
    db_session.add(comp_b)
    db_session.commit()

    # Instructor A tries to exclude Assignment B's comparison via Assignment A's endpoint
    attack_res = client.post(
        f"/api/assignments/{assign_a['id']}/comparisons:exclude",
        headers=headers_a,
        json={"comparison_id": comp_b.id, "reason": "Cross-assignment IDOR attempt"},
    )
    assert attack_res.status_code == 404

    db_session.refresh(comp_b)
    assert comp_b.status == "SUBMITTED"
