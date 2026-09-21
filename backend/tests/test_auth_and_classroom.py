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


def test_csv_import_replace_mode(client):
    """
    US-CLASS-02 / US-CLASS-03:
    Import CSV in REPLACE mode removes students not in the new CSV.
    """
    # 1. Create classroom with instructor
    res = client.post("/api/auth/google", json={"email": "prof.replace@uni.ac.th", "display_name": "Dr. Replace"})
    assert res.status_code == 200
    inst_headers = {"Authorization": f"Bearer {res.json()['access_token']}"}

    res = client.post("/api/classrooms", headers=inst_headers, json={
        "name": "Replace Mode Classroom",
        "slug": "replace-mode-cls",
        "timezone": "Asia/Bangkok",
        "allowed_email_domains": ["uni.ac.th"]
    })
    assert res.status_code == 201
    classroom_id = res.json()["id"]

    # 2. Initial import with 3 students across 1 group
    initial_csv = (
        "email,group_name,student_id,display_name\n"
        "s1@uni.ac.th,Alpha,6701,Student 1\n"
        "s2@uni.ac.th,Alpha,6702,Student 2\n"
        "s3@uni.ac.th,Alpha,6703,Student 3\n"
    )
    res = client.post(
        f"/api/classrooms/{classroom_id}/roster:import",
        headers=inst_headers,
        files={"file": ("roster.csv", initial_csv.encode("utf-8"), "text/csv")},
        data={"mode": "UPSERT", "dry_run": "false"}
    )
    assert res.status_code == 200
    assert res.json()["imported_students"] == 3

    # 3. Second import with 1 student removed (s3 removed), mode="REPLACE", dry_run="true"
    second_csv = (
        "email,group_name,student_id,display_name\n"
        "s1@uni.ac.th,Alpha,6701,Student 1\n"
        "s2@uni.ac.th,Alpha,6702,Student 2\n"
    )
    res = client.post(
        f"/api/classrooms/{classroom_id}/roster:import",
        headers=inst_headers,
        files={"file": ("roster.csv", second_csv.encode("utf-8"), "text/csv")},
        data={"mode": "REPLACE", "dry_run": "true"}
    )
    assert res.status_code == 200
    dry_data = res.json()
    assert dry_data["dry_run"] is True
    removed_diffs = [d for d in dry_data["diffs"] if d["action"] == "REMOVED"]
    assert len(removed_diffs) == 1
    assert removed_diffs[0]["email"] == "s3@uni.ac.th"

    # 4. Actual execution with mode="REPLACE", dry_run="false"
    res = client.post(
        f"/api/classrooms/{classroom_id}/roster:import",
        headers=inst_headers,
        files={"file": ("roster.csv", second_csv.encode("utf-8"), "text/csv")},
        data={"mode": "REPLACE", "dry_run": "false"}
    )
    assert res.status_code == 200
    assert res.json()["imported_students"] == 2

    # Check member list: s3 should no longer be enrolled
    res = client.get(f"/api/classrooms/{classroom_id}", headers=inst_headers)
    assert res.status_code == 200
    members = res.json()["members"]
    student_emails = [m["email_raw"] for m in members if m["role"] == "STUDENT"]
    assert "s1@uni.ac.th" in student_emails
    assert "s2@uni.ac.th" in student_emails
    assert "s3@uni.ac.th" not in student_emails


def test_csv_import_duplicate_email_rejected(client):
    """
    US-CLASS-02 / FR-CLASS-02:
    Duplicate emails within CSV must be rejected with 400 Bad Request.
    """
    res = client.post("/api/auth/google", json={"email": "prof.dup@uni.ac.th", "display_name": "Dr. Dup"})
    inst_headers = {"Authorization": f"Bearer {res.json()['access_token']}"}

    res = client.post("/api/classrooms", headers=inst_headers, json={
        "name": "Duplicate Check Classroom",
        "slug": "dup-cls",
        "timezone": "Asia/Bangkok",
        "allowed_email_domains": ["uni.ac.th"]
    })
    classroom_id = res.json()["id"]

    # Identical raw email
    dup_csv = (
        "email,group_name,student_id,display_name\n"
        "s1@uni.ac.th,Alpha,6701,Student 1\n"
        "s1@uni.ac.th,Alpha,6702,Student 1 Duplicate\n"
    )
    res = client.post(
        f"/api/classrooms/{classroom_id}/roster:import",
        headers=inst_headers,
        files={"file": ("roster.csv", dup_csv.encode("utf-8"), "text/csv")},
        data={"mode": "UPSERT", "dry_run": "false"}
    )
    assert res.status_code == 400
    assert "duplicate email" in res.json()["detail"].lower()

    # Normalized duplicate email (e.g. plus tagging)
    dup_tag_csv = (
        "email,group_name,student_id,display_name\n"
        "s2@uni.ac.th,Alpha,6703,Student 2\n"
        "s2+tag@uni.ac.th,Alpha,6704,Student 2 Tagged\n"
    )
    res = client.post(
        f"/api/classrooms/{classroom_id}/roster:import",
        headers=inst_headers,
        files={"file": ("roster.csv", dup_tag_csv.encode("utf-8"), "text/csv")},
        data={"mode": "UPSERT", "dry_run": "false"}
    )
    assert res.status_code == 400
    assert "duplicate email" in res.json()["detail"].lower()


def test_csv_import_missing_headers_rejected(client):
    """
    US-CLASS-02 / FR-CLASS-01:
    Import CSV missing required headers ('email' or 'group_name') returns 400 Bad Request.
    """
    res = client.post("/api/auth/google", json={"email": "prof.hdr@uni.ac.th", "display_name": "Dr. Header"})
    inst_headers = {"Authorization": f"Bearer {res.json()['access_token']}"}

    res = client.post("/api/classrooms", headers=inst_headers, json={
        "name": "Header Check Classroom",
        "slug": "hdr-cls",
        "timezone": "Asia/Bangkok",
        "allowed_email_domains": ["uni.ac.th"]
    })
    classroom_id = res.json()["id"]

    # Missing email header
    missing_email_csv = "display_name,group_name\nStudent A,Alpha\nStudent B,Alpha\n"
    res = client.post(
        f"/api/classrooms/{classroom_id}/roster:import",
        headers=inst_headers,
        files={"file": ("roster.csv", missing_email_csv.encode("utf-8"), "text/csv")},
        data={"mode": "UPSERT", "dry_run": "false"}
    )
    assert res.status_code == 400
    assert "CSV header must contain at least 'email' and 'group_name'" in res.json()["detail"]

    # Missing group_name header
    missing_group_csv = "email,student_id,display_name\ns1@uni.ac.th,6701,Student A\ns2@uni.ac.th,6702,Student B\n"
    res = client.post(
        f"/api/classrooms/{classroom_id}/roster:import",
        headers=inst_headers,
        files={"file": ("roster.csv", missing_group_csv.encode("utf-8"), "text/csv")},
        data={"mode": "UPSERT", "dry_run": "false"}
    )
    assert res.status_code == 400
    assert "CSV header must contain at least 'email' and 'group_name'" in res.json()["detail"]


def test_formula_injection_escaping_persisted(client):
    """
    FR-SEC-04:
    Import student with student_id starting with =, +, -, @ must persist escaped with a leading single quote.
    """
    res = client.post("/api/auth/google", json={"email": "prof.inj@uni.ac.th", "display_name": "Dr. Inject"})
    inst_headers = {"Authorization": f"Bearer {res.json()['access_token']}"}

    res = client.post("/api/classrooms", headers=inst_headers, json={
        "name": "Formula Injection Test",
        "slug": "formula-cls",
        "timezone": "Asia/Bangkok",
        "allowed_email_domains": ["uni.ac.th"]
    })
    classroom_id = res.json()["id"]

    csv_data = (
        "email,group_name,student_id,display_name\n"
        "s_eq@uni.ac.th,SecurityTeam,=6709,Eq Student\n"
        "s_plus@uni.ac.th,SecurityTeam,+6710,Plus Student\n"
        "s_minus@uni.ac.th,SecurityTeam,-6711,Minus Student\n"
        "s_at@uni.ac.th,SecurityTeam,@6712,At Student\n"
    )
    res = client.post(
        f"/api/classrooms/{classroom_id}/roster:import",
        headers=inst_headers,
        files={"file": ("roster.csv", csv_data.encode("utf-8"), "text/csv")},
        data={"mode": "UPSERT", "dry_run": "false"}
    )
    assert res.status_code == 200

    # Retrieve classroom members and assert persisted student_id starts with a single quote
    res = client.get(f"/api/classrooms/{classroom_id}", headers=inst_headers)
    assert res.status_code == 200
    members_by_email = {m["email_raw"]: m for m in res.json()["members"]}

    assert members_by_email["s_eq@uni.ac.th"]["student_id"] == "'=6709"
    assert members_by_email["s_eq@uni.ac.th"]["student_id"].startswith("'")

    assert members_by_email["s_plus@uni.ac.th"]["student_id"] == "'+6710"
    assert members_by_email["s_plus@uni.ac.th"]["student_id"].startswith("'")

    assert members_by_email["s_minus@uni.ac.th"]["student_id"] == "'-6711"
    assert members_by_email["s_minus@uni.ac.th"]["student_id"].startswith("'")

    assert members_by_email["s_at@uni.ac.th"]["student_id"] == "'@6712"
    assert members_by_email["s_at@uni.ac.th"]["student_id"].startswith("'")


def test_classroom_member_manual_add_and_duplicate_guard(client):
    """
    US-CLASS-01 / FR-CLASS-06:
    Manual member addition for TA and STUDENT, and duplicate enrollment guard.
    """
    res = client.post("/api/auth/google", json={"email": "prof.manual@uni.ac.th", "display_name": "Dr. Manual"})
    inst_headers = {"Authorization": f"Bearer {res.json()['access_token']}"}

    res = client.post("/api/classrooms", headers=inst_headers, json={
        "name": "Manual Member Classroom",
        "slug": "manual-mbr-cls",
        "timezone": "Asia/Bangkok",
        "allowed_email_domains": ["uni.ac.th"]
    })
    classroom_id = res.json()["id"]

    # 1. Add TA via POST /api/classrooms/{id}/members
    res_ta = client.post(
        f"/api/classrooms/{classroom_id}/members",
        headers=inst_headers,
        json={"email": "ta.john@uni.ac.th", "role": "TA", "display_name": "TA John"}
    )
    assert res_ta.status_code == 201
    assert res_ta.json()["role"] == "TA"
    assert res_ta.json()["email_normalized"] == "ta.john@uni.ac.th"

    # 2. Add STUDENT via POST /api/classrooms/{id}/members
    res_st = client.post(
        f"/api/classrooms/{classroom_id}/members",
        headers=inst_headers,
        json={"email": "student.mary@uni.ac.th", "role": "STUDENT", "display_name": "Mary"}
    )
    assert res_st.status_code == 201
    assert res_st.json()["role"] == "STUDENT"
    assert res_st.json()["email_normalized"] == "student.mary@uni.ac.th"

    # 3. Attempt to add the same user again to the same classroom -> 409 Conflict
    res_dup = client.post(
        f"/api/classrooms/{classroom_id}/members",
        headers=inst_headers,
        json={"email": "ta.john@uni.ac.th", "role": "TA"}
    )
    assert res_dup.status_code == 409
    assert "User is already enrolled in this classroom" in res_dup.json()["detail"]


def test_classroom_last_owner_deletion_protection(client):
    """
    FR-CLASS-06:
    Prevent deleting the last remaining Owner, allow deleting non-last owner.
    """
    res = client.post("/api/auth/google", json={"email": "prof.owner@uni.ac.th", "display_name": "Dr. Owner"})
    inst_headers = {"Authorization": f"Bearer {res.json()['access_token']}"}

    res = client.post("/api/classrooms", headers=inst_headers, json={
        "name": "Owner Protection Classroom",
        "slug": "owner-protect-cls",
        "timezone": "Asia/Bangkok",
        "allowed_email_domains": ["uni.ac.th"]
    })
    classroom_id = res.json()["id"]

    # Find the sole owner
    detail = client.get(f"/api/classrooms/{classroom_id}", headers=inst_headers).json()
    owner_member = next(m for m in detail["members"] if m["role"] == "OWNER")
    owner_member_id = owner_member["id"]

    # Attempt to delete the single classroom OWNER -> 409 Conflict
    res_del = client.delete(f"/api/classrooms/{classroom_id}/members/{owner_member_id}", headers=inst_headers)
    assert res_del.status_code == 409
    assert "Cannot remove the last remaining Owner from the classroom" in res_del.json()["detail"]

    # Add a second OWNER (add as CO_TEACHER then promote to OWNER)
    res_owner2 = client.post(
        f"/api/classrooms/{classroom_id}/members",
        headers=inst_headers,
        json={"email": "prof.owner2@uni.ac.th", "role": "CO_TEACHER", "display_name": "Dr. Owner 2"}
    )
    assert res_owner2.status_code == 201
    owner2_member_id = res_owner2.json()["id"]

    res_promote2 = client.patch(
        f"/api/classrooms/{classroom_id}/members/{owner2_member_id}",
        headers=inst_headers,
        json={"role": "OWNER"}
    )
    assert res_promote2.status_code == 200

    # Deleting a non-last owner succeeds with 204 No Content
    res_del_owner2 = client.delete(f"/api/classrooms/{classroom_id}/members/{owner2_member_id}", headers=inst_headers)
    assert res_del_owner2.status_code == 204

    # Add a CO_TEACHER and verify deleting a CO_TEACHER also succeeds with 204 No Content
    res_co = client.post(
        f"/api/classrooms/{classroom_id}/members",
        headers=inst_headers,
        json={"email": "coteacher@uni.ac.th", "role": "CO_TEACHER", "display_name": "Dr. CoTeacher"}
    )
    assert res_co.status_code == 201
    coteacher_member_id = res_co.json()["id"]

    res_del_co = client.delete(f"/api/classrooms/{classroom_id}/members/{coteacher_member_id}", headers=inst_headers)
    assert res_del_co.status_code == 204


def test_roster_import_role_authorization(client):
    """
    FR-AUTHZ-01 / US-CLASS-02:
    Role authorization for roster import: TA is permitted, STUDENT is forbidden (403).
    """
    res = client.post("/api/auth/google", json={"email": "prof.authz@uni.ac.th", "display_name": "Dr. Authz"})
    inst_headers = {"Authorization": f"Bearer {res.json()['access_token']}"}

    res = client.post("/api/classrooms", headers=inst_headers, json={
        "name": "Authz Classroom",
        "slug": "authz-cls",
        "timezone": "Asia/Bangkok",
        "allowed_email_domains": ["uni.ac.th"]
    })
    classroom_id = res.json()["id"]

    # Add TA to classroom
    res = client.post(
        f"/api/classrooms/{classroom_id}/members",
        headers=inst_headers,
        json={"email": "ta.authz@uni.ac.th", "role": "TA", "display_name": "TA Bob"}
    )
    assert res.status_code == 201

    # Add Student to classroom
    res = client.post(
        f"/api/classrooms/{classroom_id}/members",
        headers=inst_headers,
        json={"email": "student.authz@uni.ac.th", "role": "STUDENT", "display_name": "Student Alice"}
    )
    assert res.status_code == 201

    # Login as TA
    res_ta_login = client.post("/api/auth/google", json={"email": "ta.authz@uni.ac.th"})
    assert res_ta_login.status_code == 200
    ta_headers = {"Authorization": f"Bearer {res_ta_login.json()['access_token']}"}

    # Login as Student
    res_st_login = client.post("/api/auth/google", json={"email": "student.authz@uni.ac.th"})
    assert res_st_login.status_code == 200
    student_headers = {"Authorization": f"Bearer {res_st_login.json()['access_token']}"}

    roster_csv = (
        "email,group_name,student_id,display_name\n"
        "s20@uni.ac.th,Team Gamma,6730,Student 20\n"
        "s21@uni.ac.th,Team Gamma,6731,Student 21\n"
    )

    # TA can successfully import a roster CSV
    res_ta_import = client.post(
        f"/api/classrooms/{classroom_id}/roster:import",
        headers=ta_headers,
        files={"file": ("roster.csv", roster_csv.encode("utf-8"), "text/csv")},
        data={"mode": "UPSERT", "dry_run": "false"}
    )
    assert res_ta_import.status_code == 200
    assert res_ta_import.json()["success"] is True
    assert res_ta_import.json()["imported_students"] == 2

    # Student receives 403 Forbidden
    res_st_import = client.post(
        f"/api/classrooms/{classroom_id}/roster:import",
        headers=student_headers,
        files={"file": ("roster.csv", roster_csv.encode("utf-8"), "text/csv")},
        data={"mode": "UPSERT", "dry_run": "false"}
    )
    assert res_st_import.status_code == 403
    assert "Access denied" in res_st_import.json()["detail"]


def test_update_classroom_member_and_hierarchy_restrictions(client):
    """
    US-CLASS-01 / FR-CLASS-06:
    PATCH /api/classrooms/{classroomId}/members/{memberId}:
    Role change, group update, sole owner demotion protection (409),
    and CO_TEACHER hierarchy restrictions (403).
    """
    # 1. Login as instructor & create classroom
    res = client.post("/api/auth/google", json={"email": "prof.patch@uni.ac.th", "display_name": "Dr. Patch"})
    assert res.status_code == 200
    inst_headers = {"Authorization": f"Bearer {res.json()['access_token']}"}

    res = client.post("/api/classrooms", headers=inst_headers, json={
        "name": "Member Patch Classroom",
        "slug": "mbr-patch-cls",
        "timezone": "Asia/Bangkok",
        "allowed_email_domains": ["uni.ac.th"]
    })
    assert res.status_code == 201
    classroom_id = res.json()["id"]

    # Sole owner id
    detail = client.get(f"/api/classrooms/{classroom_id}", headers=inst_headers).json()
    owner_member = next(m for m in detail["members"] if m["role"] == "OWNER")
    owner_member_id = owner_member["id"]

    # 2. Demoting sole OWNER raises 409 Conflict
    res_demote = client.patch(
        f"/api/classrooms/{classroom_id}/members/{owner_member_id}",
        headers=inst_headers,
        json={"role": "STUDENT"}
    )
    assert res_demote.status_code == 409
    assert "Cannot demote the last remaining Owner from the classroom" in res_demote.json()["detail"]

    # 3. Add a STUDENT to classroom
    res_st = client.post(
        f"/api/classrooms/{classroom_id}/members",
        headers=inst_headers,
        json={"email": "student.edit@uni.ac.th", "role": "STUDENT", "display_name": "Student Edit"}
    )
    assert res_st.status_code == 201
    student_member_id = res_st.json()["id"]

    # 4. Update student: change role to TA, set group_name and student_id (formula escaped)
    res_patch = client.patch(
        f"/api/classrooms/{classroom_id}/members/{student_member_id}",
        headers=inst_headers,
        json={"role": "TA", "group_name": "Team Nova", "student_id": "=6801"}
    )
    assert res_patch.status_code == 200
    updated_st = res_patch.json()
    assert updated_st["role"] == "TA"
    assert updated_st["group_name"] == "Team Nova"
    assert updated_st["student_id"] == "'=6801"

    # 5. Clear group (empty string -> None)
    res_clear_grp = client.patch(
        f"/api/classrooms/{classroom_id}/members/{student_member_id}",
        headers=inst_headers,
        json={"group_name": ""}
    )
    assert res_clear_grp.status_code == 200
    assert res_clear_grp.json()["group_name"] is None
    assert res_clear_grp.json()["group_id"] is None

    # 6. Add a CO_TEACHER to test hierarchy restrictions
    res_co = client.post(
        f"/api/classrooms/{classroom_id}/members",
        headers=inst_headers,
        json={"email": "coteacher.patch@uni.ac.th", "role": "CO_TEACHER", "display_name": "Dr. CoPatch"}
    )
    assert res_co.status_code == 201
    co_member_id = res_co.json()["id"]

    # Login as CO_TEACHER
    res_co_login = client.post("/api/auth/google", json={"email": "coteacher.patch@uni.ac.th"})
    assert res_co_login.status_code == 200
    co_headers = {"Authorization": f"Bearer {res_co_login.json()['access_token']}"}

    # CO_TEACHER cannot modify an OWNER -> 403 Forbidden
    res_co_mod_owner = client.patch(
        f"/api/classrooms/{classroom_id}/members/{owner_member_id}",
        headers=co_headers,
        json={"role": "STUDENT"}
    )
    assert res_co_mod_owner.status_code == 403
    assert "CO_TEACHER cannot modify an OWNER" in res_co_mod_owner.json()["detail"]

    # CO_TEACHER cannot delete an OWNER -> 403 Forbidden
    res_co_del_owner = client.delete(
        f"/api/classrooms/{classroom_id}/members/{owner_member_id}",
        headers=co_headers
    )
    assert res_co_del_owner.status_code == 403
    assert "CO_TEACHER cannot delete an OWNER" in res_co_del_owner.json()["detail"]

    # CO_TEACHER attempting to update a student's role to "OWNER" gets 403 Forbidden
    res_co_grant_owner = client.patch(
        f"/api/classrooms/{classroom_id}/members/{student_member_id}",
        headers=co_headers,
        json={"role": "OWNER"}
    )
    assert res_co_grant_owner.status_code == 403
    assert "Only Owners can grant the OWNER role" in res_co_grant_owner.json()["detail"]

    # CO_TEACHER CAN modify a non-owner (e.g. TA)
    res_co_mod_ta = client.patch(
        f"/api/classrooms/{classroom_id}/members/{student_member_id}",
        headers=co_headers,
        json={"student_id": "6802"}
    )
    assert res_co_mod_ta.status_code == 200
    assert res_co_mod_ta.json()["student_id"] == "6802"

    # 7. Owner promotes CO_TEACHER to OWNER -> demoting first owner now succeeds
    res_promote = client.patch(
        f"/api/classrooms/{classroom_id}/members/{co_member_id}",
        headers=inst_headers,
        json={"role": "OWNER"}
    )
    assert res_promote.status_code == 200
    assert res_promote.json()["role"] == "OWNER"

    res_demote_ok = client.patch(
        f"/api/classrooms/{classroom_id}/members/{owner_member_id}",
        headers=inst_headers,
        json={"role": "CO_TEACHER"}
    )
    assert res_demote_ok.status_code == 200
    assert res_demote_ok.json()["role"] == "CO_TEACHER"


def test_classroom_archive_and_unarchive_lifecycle(client):
    """
    US-CLASS-01 / Classroom Archiving & Unarchiving Lifecycle:
    - Instructor archives classroom (PATCH /api/classrooms/{id} with {"status": "ARCHIVED"})
    - Verify status changes to "ARCHIVED" and default list_classrooms (status=ACTIVE) hides it
    - Verify list_classrooms?status=ARCHIVED includes it
    - Unarchive classroom (PATCH /api/classrooms/{id} with {"status": "ACTIVE"})
    - Verify status changes back to "ACTIVE" and appears in default list_classrooms
    - Student attempt to archive raises HTTP 403 Forbidden
    - Invalid status value validation raises HTTP 422 Unprocessable Entity
    """
    # 1. Login as instructor & create classroom
    res = client.post("/api/auth/google", json={"email": "prof.archive@uni.ac.th", "display_name": "Dr. Archive"})
    assert res.status_code == 200
    inst_headers = {"Authorization": f"Bearer {res.json()['access_token']}"}

    res = client.post("/api/classrooms", headers=inst_headers, json={
        "name": "Archive Lifecycle Classroom",
        "slug": "archive-lifecycle-cls",
        "timezone": "Asia/Bangkok",
        "allowed_email_domains": ["uni.ac.th"]
    })
    assert res.status_code == 201
    classroom_id = res.json()["id"]
    assert res.json()["status"] == "ACTIVE"

    # 2. Add student to classroom & login as student
    res_st_add = client.post(
        f"/api/classrooms/{classroom_id}/members",
        headers=inst_headers,
        json={"email": "student.archive@uni.ac.th", "role": "STUDENT", "display_name": "Student Arc"}
    )
    assert res_st_add.status_code == 201

    res_st_login = client.post("/api/auth/google", json={"email": "student.archive@uni.ac.th"})
    assert res_st_login.status_code == 200
    student_headers = {"Authorization": f"Bearer {res_st_login.json()['access_token']}"}

    # 3. Student attempt to archive raises HTTP 403 Forbidden
    res_st_patch = client.patch(
        f"/api/classrooms/{classroom_id}",
        headers=student_headers,
        json={"status": "ARCHIVED"}
    )
    assert res_st_patch.status_code == 403

    # 4. Instructor archives classroom
    res_archive = client.patch(
        f"/api/classrooms/{classroom_id}",
        headers=inst_headers,
        json={"status": "ARCHIVED"}
    )
    assert res_archive.status_code == 200
    assert res_archive.json()["status"] == "ARCHIVED"

    # 5. Default list_classrooms (status=ACTIVE) hides the archived classroom
    res_list_default = client.get("/api/classrooms", headers=inst_headers)
    assert res_list_default.status_code == 200
    active_ids = [c["id"] for c in res_list_default.json()]
    assert classroom_id not in active_ids

    # Query with status=ARCHIVED returns the classroom
    res_list_archived = client.get("/api/classrooms?status=ARCHIVED", headers=inst_headers)
    assert res_list_archived.status_code == 200
    archived_ids = [c["id"] for c in res_list_archived.json()]
    assert classroom_id in archived_ids

    # 6. Unarchive classroom (PATCH /api/classrooms/{id} with status="ACTIVE")
    res_unarchive = client.patch(
        f"/api/classrooms/{classroom_id}",
        headers=inst_headers,
        json={"status": "ACTIVE"}
    )
    assert res_unarchive.status_code == 200
    assert res_unarchive.json()["status"] == "ACTIVE"

    # Verify classroom is visible again in default list_classrooms
    res_list_after = client.get("/api/classrooms", headers=inst_headers)
    assert res_list_after.status_code == 200
    after_ids = [c["id"] for c in res_list_after.json()]
    assert classroom_id in after_ids

    # 7. Invalid status value rejected by schema validation -> 422 Unprocessable Entity
    res_invalid = client.patch(
        f"/api/classrooms/{classroom_id}",
        headers=inst_headers,
        json={"status": "DELETED"}
    )
    assert res_invalid.status_code == 422

