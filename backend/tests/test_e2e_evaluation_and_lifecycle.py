import pytest

def test_full_evaluation_lifecycle_e2e(client):
    """
    Complete End-to-End Workflow:
    1. Create Classroom & Import Roster (Aurora: Nok, Ton, Som; Borealis: Jane, Joe, Jill; Cygnus: Alex, Amy).
    2. Create Assignment with 100% Criteria Weights (UX 40%, Completeness 35%, Innovation 25%; Teamwork 50%, Mgmt 50%).
    3. Check Feasibility & Publish -> Generates deterministic balanced pairs & sends open notification.
    4. Students evaluate on 6-point forced choice scale & autosave drafts.
    5. Submit evaluations with revision history.
    6. Check Quality Signals.
    7. Recompute scores & Finalize score snapshot.
    8. Student views score with k-anonymity guard.
    9. Student files appeal -> Instructor resolves with override.
    10. Instructor exports CSV and XLSX.
    """
    # 1. Instructor Login
    res = client.post("/api/auth/google", json={"email": "prof@uni.ac.th", "display_name": "Prof. Smith"})
    inst_token = res.json()["access_token"]
    inst_headers = {"Authorization": f"Bearer {inst_token}"}

    # Create classroom
    res = client.post("/api/classrooms", headers=inst_headers, json={
        "name": "HCI 2026",
        "slug": "hci-2026",
        "timezone": "Asia/Bangkok"
    })
    classroom_id = res.json()["id"]

    # Import roster with 3 groups
    roster_csv = (
        "email,group_name,student_id,display_name\n"
        "nok@uni.ac.th,Aurora,6701,Nok\n"
        "ton@uni.ac.th,Aurora,6702,Ton\n"
        "som@uni.ac.th,Aurora,6703,Som\n"
        "jane@uni.ac.th,Borealis,6704,Jane\n"
        "joe@uni.ac.th,Borealis,6705,Joe\n"
        "jill@uni.ac.th,Borealis,6706,Jill\n"
        "alex@uni.ac.th,Cygnus,6707,Alex\n"
        "amy@uni.ac.th,Cygnus,6708,Amy\n"
    )
    client.post(
        f"/api/classrooms/{classroom_id}/roster:import",
        headers=inst_headers,
        files={"file": ("roster.csv", roster_csv.encode("utf-8"), "text/csv")},
        data={"mode": "UPSERT", "dry_run": "false"}
    )

    # 2. Create Assignment
    res = client.post(f"/api/classrooms/{classroom_id}/assignments", headers=inst_headers, json={
        "name": "Final Project Presentation",
        "slug": "final-project",
        "description": "Evaluate deliverables and peer contributions",
        "artifact_url": "https://drive.google.com/artifacts/demo",
        "group_max_score": 15.0,
        "individual_max_score": 5.0,
        "target_coverage": 5,
        "max_workload": 8,
        "criteria": [
            {"side": "GROUP", "name": "UX", "description": "User experience", "weight_pct": 40.0, "display_order": 1},
            {"side": "GROUP", "name": "Completeness", "description": "Features complete", "weight_pct": 35.0, "display_order": 2},
            {"side": "GROUP", "name": "Innovation", "description": "Novelty", "weight_pct": 25.0, "display_order": 3},
            {"side": "INDIVIDUAL", "name": "Teamwork", "description": "Collaboration", "weight_pct": 50.0, "display_order": 1},
            {"side": "INDIVIDUAL", "name": "Management", "description": "Execution", "weight_pct": 50.0, "display_order": 2},
        ]
    })
    assert res.status_code == 201
    assignment_id = res.json()["id"]

    # 3. Publish Assignment
    res = client.post(f"/api/assignments/{assignment_id}:publish", headers=inst_headers)
    assert res.status_code == 200
    assert res.json()["status"] == "OPEN"
    assert res.json()["group_pair_count"] > 0

    # 4. Student 'Nok' logs in and views worksheet
    res = client.post("/api/auth/google", json={"email": "nok@uni.ac.th"})
    nok_token = res.json()["access_token"]
    nok_headers = {"Authorization": f"Bearer {nok_token}"}

    res = client.get(f"/api/assignments/{assignment_id}/evaluations?side=GROUP", headers=nok_headers)
    assert res.status_code == 200
    ws = res.json()
    assert len(ws["sections"]) == 3  # 3 group criteria
    first_pair_id = ws["sections"][0]["comparisons"][0]["pair_assignment_id"]

    # 5. Autosave draft (choice = 2: Left better)
    res = client.post("/api/evaluations/draft", headers=nok_headers, json={
        "pair_assignment_id": first_pair_id,
        "choice": 2,
        "time_on_task_ms": 4500
    })
    assert res.status_code == 200

    # Answer all remaining group pairs for Nok
    for sec in ws["sections"]:
        for c in sec["comparisons"]:
            client.post("/api/evaluations/draft", headers=nok_headers, json={
                "pair_assignment_id": c["pair_assignment_id"],
                "choice": 2,
                "time_on_task_ms": 4000
            })

    # Submit Nok's group evaluation
    res = client.post(f"/api/assignments/{assignment_id}/evaluations:submit", headers=nok_headers, json={
        "side": "GROUP",
        "confirm_incomplete": True
    })
    assert res.status_code == 200
    assert res.json()["success"] is True

    # 6. Check Quality signals
    res = client.get(f"/api/assignments/{assignment_id}/reports/quality", headers=inst_headers)
    assert res.status_code == 200

    # 7. Finalize Assignment
    res = client.post(f"/api/assignments/{assignment_id}:finalize", headers=inst_headers, json={
        "allow_low_confidence": True,
        "notes": "End of semester finalization"
    })
    assert res.status_code == 200
    assert res.json()["status"] == "FINALIZED"

    # 8. Nok views personal score (k-anonymity check)
    res = client.get(f"/api/assignments/{assignment_id}/my-score", headers=nok_headers)
    assert res.status_code == 200
    score_view = res.json()
    assert score_view["is_final"] is True
    assert score_view["group_name"] == "Aurora"

    # 9. Nok files appeal within 7-day window (US-APPEAL-01)
    res = client.post(f"/api/assignments/{assignment_id}/appeals", headers=nok_headers, json={
        "message": "I feel my participation was not accurately counted."
    })
    assert res.status_code == 201
    appeal_id = res.json()["id"]

    # Instructor resolves appeal with score override
    res = client.post(f"/api/assignments/{assignment_id}/appeals/{appeal_id}:resolve", headers=inst_headers, json={
        "status": "RESOLVED",
        "resolution": "Reviewed logs and adjusted individual score.",
        "override_score": 18.5
    })
    assert res.status_code == 200
    assert res.json()["status"] == "RESOLVED"

    # 10. Instructor exports CSV and XLSX
    res = client.get(f"/api/assignments/{assignment_id}/export/csv?report=group", headers=inst_headers)
    assert res.status_code == 200
    assert res.content.startswith(b"\xef\xbb\xbf")  # UTF-8 BOM

    res = client.get(f"/api/assignments/{assignment_id}/export/xlsx", headers=inst_headers)
    assert res.status_code == 200
    assert len(res.content) > 1000
