import pytest

def test_delete_draft_assignment(client):
    # 1. Login
    res = client.post("/api/auth/google", json={"email": "prof@uni.ac.th", "display_name": "Prof. Smith"})
    inst_token = res.json()["access_token"]
    inst_headers = {"Authorization": f"Bearer {inst_token}"}

    # 2. Create classroom
    res = client.post("/api/classrooms", headers=inst_headers, json={
        "name": "Delete Test Class",
        "slug": "delete-test",
        "timezone": "Asia/Bangkok"
    })
    classroom_id = res.json()["id"]

    # 3. Create Assignment (DRAFT)
    res = client.post(f"/api/classrooms/{classroom_id}/assignments", headers=inst_headers, json={
        "name": "Draft Assignment",
        "slug": "draft-assignment",
        "criteria": [
            {"side": "GROUP", "name": "C1", "description": "", "weight_pct": 100.0, "display_order": 1}
        ]
    })
    assert res.status_code == 201
    assignment_id = res.json()["id"]

    # 4. Attempt to delete as student (should fail)
    res = client.post("/api/auth/google", json={"email": "student@uni.ac.th", "display_name": "Student A"})
    student_token = res.json()["access_token"]
    student_headers = {"Authorization": f"Bearer {student_token}"}
    
    # Try deleting
    res = client.delete(f"/api/assignments/{assignment_id}", headers=student_headers)
    assert res.status_code in [403, 404]

    # 5. Delete as instructor (should succeed)
    res = client.delete(f"/api/assignments/{assignment_id}", headers=inst_headers)
    assert res.status_code == 204

    # 6. Verify assignment is gone
    res = client.get(f"/api/assignments/{assignment_id}", headers=inst_headers)
    assert res.status_code == 404

def test_delete_published_assignment_fails(client, db_session):
    res = client.post("/api/auth/google", json={"email": "prof2@uni.ac.th", "display_name": "Prof. Two"})
    inst_token = res.json()["access_token"]
    inst_headers = {"Authorization": f"Bearer {inst_token}"}

    res = client.post("/api/classrooms", headers=inst_headers, json={
        "name": "Class 2",
        "slug": "class-2",
        "timezone": "Asia/Bangkok"
    })
    classroom_id = res.json()["id"]

    # Create Assignment (DRAFT)
    res = client.post(f"/api/classrooms/{classroom_id}/assignments", headers=inst_headers, json={
        "name": "A1",
        "slug": "a1",
        "criteria": [{"side": "GROUP", "name": "C1", "description": "", "weight_pct": 100.0, "display_order": 1}]
    })
    assignment_id = res.json()["id"]

    # Force state to PUBLISHED via DB directly since publish requires complex pair generation
    from backend.app.shared.models import Assignment
    a = db_session.query(Assignment).filter(Assignment.id == assignment_id).first()
    a.status = "PUBLISHED"
    db_session.commit()

    # Attempt delete
    res = client.delete(f"/api/assignments/{assignment_id}", headers=inst_headers)
    assert res.status_code == 409
    assert "DRAFT" in res.json()["detail"]
