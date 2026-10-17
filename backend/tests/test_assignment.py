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

def test_edit_draft_assignment(client):
    res = client.post("/api/auth/google", json={"email": "prof3@uni.ac.th", "display_name": "Prof. Three"})
    inst_headers = {"Authorization": f"Bearer {res.json()['access_token']}"}

    res = client.post("/api/classrooms", headers=inst_headers, json={
        "name": "Edit Test Class",
        "slug": "edit-test",
        "timezone": "Asia/Bangkok"
    })
    classroom_id = res.json()["id"]

    res = client.post(f"/api/classrooms/{classroom_id}/assignments", headers=inst_headers, json={
        "name": "Draft Assignment",
        "slug": "draft-1",
        "criteria": [{"side": "GROUP", "name": "C1", "description": "", "weight_pct": 100.0, "display_order": 1}]
    })
    assignment_id = res.json()["id"]

    # Add another assignment to test unique slug validation
    client.post(f"/api/classrooms/{classroom_id}/assignments", headers=inst_headers, json={
        "name": "Another Assignment",
        "slug": "draft-2",
        "criteria": [{"side": "GROUP", "name": "C1", "description": "", "weight_pct": 100.0, "display_order": 1}]
    })

    # Test editing details and criteria
    patch_payload = {
        "name": "Edited Assignment",
        "slug": "edited-slug",
        "description": "New description",
        "group_max_score": 20.0,
        "criteria": [
            {"side": "GROUP", "name": "C1 Edited", "description": "Edited", "weight_pct": 40.0, "display_order": 1},
            {"side": "GROUP", "name": "C2 New", "description": "New", "weight_pct": 60.0, "display_order": 2}
        ]
    }
    res = client.patch(f"/api/assignments/{assignment_id}", headers=inst_headers, json=patch_payload)
    assert res.status_code == 200
    data = res.json()
    assert data["name"] == "Edited Assignment"
    assert data["slug"] == "edited-slug"
    assert data["description"] == "New description"
    assert data["group_max_score"] == 20.0
    assert len(data["criteria"]) == 2
    assert data["criteria"][0]["weight_pct"] == 40.0

    # Test validation failure for criteria weight sum != 100%
    res = client.patch(f"/api/assignments/{assignment_id}", headers=inst_headers, json={
        "criteria": [
            {"side": "GROUP", "name": "C1", "description": "", "weight_pct": 50.0, "display_order": 1}
        ]
    })
    assert res.status_code == 422
    assert "100.00%" in res.json()["detail"]

    # Test uniqueness failure for slug
    res = client.patch(f"/api/assignments/{assignment_id}", headers=inst_headers, json={"slug": "draft-2"})
    assert res.status_code == 409
    assert "slug" in res.json()["detail"].lower()

def test_hide_draft_assignments_from_students(client, db_session):
    # 1. Login Instructor
    res = client.post("/api/auth/google", json={"email": "prof4@uni.ac.th", "display_name": "Prof. Four"})
    inst_headers = {"Authorization": f"Bearer {res.json()['access_token']}"}

    # 2. Create classroom
    res = client.post("/api/classrooms", headers=inst_headers, json={
        "name": "Hide Draft Class",
        "slug": "hide-draft",
        "timezone": "Asia/Bangkok"
    })
    classroom_id = res.json()["id"]

    # 3. Create Draft Assignment
    res = client.post(f"/api/classrooms/{classroom_id}/assignments", headers=inst_headers, json={
        "name": "Draft Assignment",
        "slug": "hide-draft-1",
        "criteria": [{"side": "GROUP", "name": "C1", "description": "", "weight_pct": 100.0, "display_order": 1}]
    })
    draft_id = res.json()["id"]

    # 4. Create Published Assignment
    res = client.post(f"/api/classrooms/{classroom_id}/assignments", headers=inst_headers, json={
        "name": "Published Assignment",
        "slug": "hide-draft-2",
        "criteria": [{"side": "GROUP", "name": "C1", "description": "", "weight_pct": 100.0, "display_order": 1}]
    })
    published_id = res.json()["id"]

    # Force the second assignment to PUBLISHED
    from backend.app.shared.models import Assignment
    a = db_session.query(Assignment).filter(Assignment.id == published_id).first()
    a.status = "PUBLISHED"
    db_session.commit()

    # 5. Login Student
    res = client.post("/api/auth/google", json={"email": "student2@uni.ac.th", "display_name": "Student Two"})
    student_headers = {"Authorization": f"Bearer {res.json()['access_token']}"}
    
    # Enroll student via DB directly
    from backend.app.shared.models import User, ClassroomMember
    student = db_session.query(User).filter(User.email_raw == "student2@uni.ac.th").first()
    db_session.add(ClassroomMember(classroom_id=classroom_id, user_id=student.id, role="STUDENT"))
    db_session.commit()

    # 6. List Assignments as Instructor (should see both)
    res = client.get(f"/api/classrooms/{classroom_id}/assignments", headers=inst_headers)
    assert len(res.json()) == 2

    # 7. List Assignments as Student (should see only 1)
    res = client.get(f"/api/classrooms/{classroom_id}/assignments", headers=student_headers)
    data = res.json()
    assert len(data) == 1
    assert data[0]["id"] == published_id

    # 8. Try to GET Draft Assignment as Student (should fail with 403 or 404)
    res = client.get(f"/api/assignments/{draft_id}", headers=student_headers)
    assert res.status_code in [403, 404]

    # 9. Try to GET Published Assignment as Student (should succeed)
    res = client.get(f"/api/assignments/{published_id}", headers=student_headers)
    assert res.status_code == 200
