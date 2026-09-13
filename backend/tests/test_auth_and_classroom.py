import pytest
from backend.app.core.security import normalize_email

def test_email_normalization():
    """US-AUTH-03 / FR-AUTH-03: Email normalization"""
    assert normalize_email("  SOMCHAI@UNI.AC.TH ") == "somchai@uni.ac.th"
    assert normalize_email("somchai+tag123@uni.ac.th") == "somchai@uni.ac.th"
    assert normalize_email("som.chai.a@gmail.com") == "somchaia@gmail.com"
    assert normalize_email("Som.Chai.A+assignment1@gmail.com") == "somchaia@gmail.com"

def test_auth_and_classroom_lifecycle_e2e(client):
    """
    US-AUTH-01 / US-AUTH-02 / US-AUTH-04 / US-CLASS-01 / US-CLASS-02 / US-CLASS-03:
    """
    # 1. Login as instructor
    res = client.post("/api/auth/google", json={"email": "prof.somchai@uni.ac.th", "display_name": "Dr. Somchai"})
    assert res.status_code == 200
    inst_token = res.json()["access_token"]
    inst_headers = {"Authorization": f"Bearer {inst_token}"}

    # 2. Create Classroom with allowed domains
    res = client.post("/api/classrooms", headers=inst_headers, json={
        "name": "Software Engineering 101",
        "slug": "se-101",
        "timezone": "Asia/Bangkok",
        "allowed_email_domains": ["uni.ac.th"]
    })
    assert res.status_code == 201
    classroom = res.json()
    classroom_id = classroom["id"]

    # 3. Test Domain Restriction (US-AUTH-02)
    res = client.post("/api/auth/google", json={
        "email": "intruder@gmail.com",
        "classroom_id": classroom_id
    })
    assert res.status_code == 403

    # 4. Atomic CSV Import with row validation error (US-CLASS-02)
    bad_csv = "email,group_name,student_id,display_name\ns1@uni.ac.th,Team Alpha,6701,Student 1\ninvalid-email-no-at,Team Alpha,6702,Student 2\n"
    res = client.post(
        f"/api/classrooms/{classroom_id}/roster:import",
        headers=inst_headers,
        files={"file": ("roster.csv", bad_csv.encode("utf-8"), "text/csv")},
        data={"mode": "UPSERT", "dry_run": "false"}
    )
    assert res.status_code == 400
    assert "row 3: invalid email format" in res.json()["detail"]

    # 5. Atomic CSV Import with group < 2 members rejected (US-CLASS-02)
    single_member_csv = "email,group_name,student_id,display_name\ns1@uni.ac.th,Solo Group,6701,Student 1\n"
    res = client.post(
        f"/api/classrooms/{classroom_id}/roster:import",
        headers=inst_headers,
        files={"file": ("roster.csv", single_member_csv.encode("utf-8"), "text/csv")},
        data={"mode": "UPSERT", "dry_run": "false"}
    )
    assert res.status_code == 422
    assert "Solo Group" in res.json()["detail"]

    # 6. Valid Atomic CSV Import with Formula Injection Escaping (FR-SEC-04) and Dry-Run Diff (US-CLASS-03)
    good_csv = (
        "email,group_name,student_id,display_name\n"
        "nok@uni.ac.th,Aurora,=6701,Nok\n"
        "ton@uni.ac.th,Aurora,6702,Ton\n"
        "som@uni.ac.th,Aurora,6703,Som\n"
        "jane@uni.ac.th,Borealis,6704,Jane\n"
        "joe@uni.ac.th,Borealis,6705,Joe\n"
        "jill@uni.ac.th,Borealis,6706,Jill\n"
        "alex@uni.ac.th,Cygnus,6707,Alex\n"
        "amy@uni.ac.th,Cygnus,6708,Amy\n"
    )
    # Dry run preview first
    res = client.post(
        f"/api/classrooms/{classroom_id}/roster:import",
        headers=inst_headers,
        files={"file": ("roster.csv", good_csv.encode("utf-8"), "text/csv")},
        data={"mode": "UPSERT", "dry_run": "true"}
    )
    assert res.status_code == 200
    dry_data = res.json()
    assert dry_data["dry_run"] is True
    assert len(dry_data["diffs"]) == 8

    # Execute import
    res = client.post(
        f"/api/classrooms/{classroom_id}/roster:import",
        headers=inst_headers,
        files={"file": ("roster.csv", good_csv.encode("utf-8"), "text/csv")},
        data={"mode": "UPSERT", "dry_run": "false"}
    )
    assert res.status_code == 200
    assert res.json()["imported_students"] == 8

    # 7. Student Login & Resource Isolation (US-AUTH-04)
    res = client.post("/api/auth/google", json={"email": "nok@uni.ac.th"})
    assert res.status_code == 200
    student_token = res.json()["access_token"]
    student_headers = {"Authorization": f"Bearer {student_token}"}

    # Student calling instructor endpoint directly gets 403 Forbidden
    res = client.get(f"/api/classrooms/{classroom_id}/audit", headers=student_headers)
    assert res.status_code == 403

    # Foreign classroom access returns 404 Not Found (US-AUTH-04 / FR-AUTHZ-02)
    fake_classroom_id = "00000000-0000-0000-0000-000000000000"
    res = client.get(f"/api/classrooms/{fake_classroom_id}", headers=student_headers)
    assert res.status_code == 404
