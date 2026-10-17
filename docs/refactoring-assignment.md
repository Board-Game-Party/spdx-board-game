# Refactoring Report: `assignment` Module (`update_assignment`)

## Function: `update_assignment` (`backend/app/features/assignment/services.py:89-162`)

### Before
```python
def update_assignment(db: Session, assignment: Assignment, req: UpdateAssignmentRequest, current_user: User) -> AssignmentDetail:
    # If not in DRAFT, check what is allowed to be modified (US-ASSIGN-03)
    if assignment.status != "DRAFT":
        if req.criteria is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Cannot modify criteria when assignment is not in DRAFT status. Please Unpublish first."
            )
        if req.group_max_score is not None or req.individual_max_score is not None or req.target_coverage is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Cannot modify core scoring/pairing configuration when assignment is active."
            )

    if req.name is not None:
        assignment.name = req.name
    if req.slug is not None and req.slug != assignment.slug:
        existing = db.query(Assignment).filter(
            Assignment.classroom_id == assignment.classroom_id,
            Assignment.slug == req.slug
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Assignment slug '{req.slug}' already exists in this classroom"
            )
        assignment.slug = req.slug
    if req.description is not None:
        assignment.description = req.description
    if req.artifact_url is not None:
        assignment.artifact_url = req.artifact_url
    if req.group_max_score is not None:
        assignment.group_max_score = req.group_max_score
    if req.individual_max_score is not None:
        assignment.individual_max_score = req.individual_max_score
    if req.group_deadline_utc is not None:
        assignment.group_deadline_utc = req.group_deadline_utc
    if req.individual_deadline_utc is not None:
        assignment.individual_deadline_utc = req.individual_deadline_utc
    if req.instructor_weight is not None:
        assignment.instructor_weight = req.instructor_weight
    if req.target_coverage is not None:
        assignment.target_coverage = req.target_coverage
    if req.max_workload is not None:
        assignment.max_workload = req.max_workload
    if req.min_comparisons is not None:
        assignment.min_comparisons = req.min_comparisons
    if req.score_floor is not None:
        assignment.score_floor = req.score_floor
    if req.score_ceiling is not None:
        assignment.score_ceiling = req.score_ceiling
    if req.completion_threshold is not None:
        assignment.completion_threshold = req.completion_threshold
    if req.pairing_seed is not None:
        assignment.pairing_seed = req.pairing_seed

    if req.criteria is not None and assignment.status == "DRAFT":
        validate_criteria_weights(req.criteria, assignment.individual_max_score)
        # Replace criteria
        db.query(Criterion).filter(Criterion.assignment_id == assignment.id).delete()
        for idx, c in enumerate(req.criteria):
            crit = Criterion(
                assignment_id=assignment.id,
                side=c.side,
                name=c.name,
                description=c.description,
                weight_pct=c.weight_pct,
                display_order=c.display_order if c.display_order else idx
            )
            db.add(crit)

    db.commit()
    db.refresh(assignment)
    return get_assignment_detail(db, assignment)
```

### Issues Found
- **Long Method & Mixed Responsibilities**: ฟังก์ชันเดียวยาว 74 บรรทัด ทำตั้งแต่ 1) ตรวจสถานะ `DRAFT`, 2) เช็ค `slug` ซ้ำใน DB, 3) อัปเดตฟิลด์ทีละตัว 17 บล็อก, 4) ตรวจน้ำหนักและลบ/สร้าง `Criterion` ใหม่, และ 5) commit/refresh ข้อมูล
- **Repetitive Conditional Chains (`if req.field is not None:`)**: มี `if req.<field> is not None:` เรียงต่อกันถึง 16 ฟิลด์ ทำให้เกิดโค้ดซ้ำซ้อน (Boilerplate) และเพิ่มความซับซ้อนในการอ่าน
- **Incomplete State Lock when Active**: เมื่อ `assignment.status != "DRAFT"` ล็อกแค่ 3 ฟิลด์ (`group_max_score`, `individual_max_score`, `target_coverage`) แต่ปล่อยให้แก้ฟิลด์คำนวณคะแนน/จับคู่อื่น ๆ (`instructor_weight`, `max_workload`, `min_comparisons`, `score_floor`, `score_ceiling`, `completion_threshold`, `pairing_seed`) ได้
- **Mutation Before Validation**: อัปเดตค่าลง ORM object `assignment` ก่อนที่จะรัน `validate_criteria_weights` หาก validation ไม่ผ่านจะทำให้ `assignment` ใน session ค้างสถานะ dirty
- **Truthiness Bug on `display_order`**: ใช้ `c.display_order if c.display_order else idx` ซึ่งหากส่ง `display_order=0` มาจะถูกมองเป็น `False` และโดนทับด้วย `idx` รวมถึงมีเงื่อนไข `and assignment.status == "DRAFT"` ที่บรรทัด 145 ซ้ำซ้อนกับ guard ด้านบน
- **Cryptic Variable Names**: ตั้งชื่อตัวแปร `c` และ `crit` สำหรับข้อมูลคนละชนิด (input schema vs ORM model) ในลูปเดียวกัน

---

### Step 1 — Baseline Test Evidence (ก่อนเริ่ม Refactor)

#### 1) ผลรันเฉพาะโมดูล `backend/tests/test_assignment.py`
คำสั่งที่ใช้รัน:
```bash
docker compose -f compose.test.yaml run --rm \
  -v "$(pwd)/backend/app/features:/app/backend/app/features" \
  -v "$(pwd)/backend/tests:/app/backend/tests" \
  unit python3 -m pytest backend/tests/test_assignment.py -v
```

ผลลัพธ์:
```text
============================= test session starts ==============================
platform linux -- Python 3.12.14, pytest-9.1.1, pluggy-1.6.0 -- /usr/local/bin/python3
cachedir: .pytest_cache
rootdir: /app
configfile: pytest.ini
plugins: anyio-4.15.1, asyncio-1.4.0
collecting ... collected 4 items

backend/tests/test_assignment.py::test_delete_draft_assignment PASSED    [ 25%]
backend/tests/test_assignment.py::test_delete_published_assignment_fails PASSED [ 50%]
backend/tests/test_assignment.py::test_edit_draft_assignment PASSED      [ 75%]
backend/tests/test_assignment.py::test_hide_draft_assignments_from_students PASSED [100%]

======================== 4 passed, 3 warnings in 0.74s =========================
```

#### 2) ผลรันชุดทดสอบทั้งระบบ (Full Unit Test Suite)
คำสั่งที่ใช้รัน:
```bash
docker compose -f compose.test.yaml run --rm \
  -v "$(pwd)/backend/app/features:/app/backend/app/features" \
  -v "$(pwd)/backend/tests:/app/backend/tests" \
  unit python3 -m pytest -v
```

ผลลัพธ์:
```text
backend/tests/test_assignment.py::test_delete_draft_assignment PASSED    [  3%]
backend/tests/test_assignment.py::test_delete_published_assignment_fails PASSED [  7%]
backend/tests/test_assignment.py::test_edit_draft_assignment PASSED      [ 11%]
backend/tests/test_assignment.py::test_hide_draft_assignments_from_students PASSED [ 15%]
backend/tests/test_auth_and_classroom.py::test_email_normalization PASSED [ 19%]
backend/tests/test_auth_and_classroom.py::test_auth_and_classroom_lifecycle_e2e PASSED [ 23%]
backend/tests/test_auth_and_classroom.py::test_csv_import_replace_mode PASSED [ 26%]
backend/tests/test_auth_and_classroom.py::test_csv_import_duplicate_email_rejected PASSED [ 30%]
backend/tests/test_auth_and_classroom.py::test_csv_import_missing_headers_rejected PASSED [ 34%]
backend/tests/test_auth_and_classroom.py::test_formula_injection_escaping_persisted PASSED [ 38%]
backend/tests/test_auth_and_classroom.py::test_classroom_member_manual_add_and_duplicate_guard PASSED [ 42%]
backend/tests/test_auth_and_classroom.py::test_classroom_last_owner_deletion_protection PASSED [ 46%]
backend/tests/test_auth_and_classroom.py::test_roster_import_role_authorization PASSED [ 50%]
backend/tests/test_auth_and_classroom.py::test_update_classroom_member_and_hierarchy_restrictions PASSED [ 53%]
backend/tests/test_auth_and_classroom.py::test_classroom_archive_and_unarchive_lifecycle PASSED [ 57%]
backend/tests/test_auth_and_classroom.py::test_delete_classroom_owner_only_and_role_authorization PASSED [ 61%]
backend/tests/test_auth_and_classroom.py::test_create_classroom_role_authorization PASSED [ 65%]
backend/tests/test_e2e_evaluation_and_lifecycle.py::test_full_evaluation_lifecycle_e2e PASSED [ 69%]
backend/tests/test_pairing_properties.py::test_feasibility_auto_reduction_small_class PASSED [ 73%]
backend/tests/test_pairing_properties.py::test_feasibility_large_class PASSED [ 76%]
backend/tests/test_pairing_properties.py::test_pairing_invariants_inv1_to_inv5 PASSED [ 80%]
backend/tests/test_pairing_properties.py::test_individual_pairing_small_group_handling PASSED [ 84%]
backend/tests/test_scoring_bug.py::test_override_individual_score PASSED [ 88%]
backend/tests/test_scoring_golden.py::test_scoring_worked_example_section_9_5 PASSED [ 92%]
backend/tests/test_scoring_golden.py::test_pure_scoring_engine_reproducibility PASSED [ 96%]
backend/tests/test_student_override_permission.py::test_student_cannot_override_score PASSED [100%]

======================== 26 passed, 4 warnings in 4.51s ========================
```

---

### After
```python
_DRAFT_LOCKED_FIELDS = (
    "group_max_score",
    "individual_max_score",
    "target_coverage",
    "instructor_weight",
    "max_workload",
    "min_comparisons",
    "score_floor",
    "score_ceiling",
    "completion_threshold",
    "pairing_seed",
)

def _validate_assignment_update(db: Session, assignment: Assignment, req: UpdateAssignmentRequest) -> None:
    if assignment.status != "DRAFT":
        if req.criteria is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Cannot modify criteria when assignment is not in DRAFT status. Please Unpublish first."
            )
        if any(getattr(req, field) is not None for field in _DRAFT_LOCKED_FIELDS):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Cannot modify core scoring/pairing configuration when assignment is active."
            )

    if req.slug is not None and req.slug != assignment.slug:
        existing = db.query(Assignment).filter(
            Assignment.classroom_id == assignment.classroom_id,
            Assignment.slug == req.slug
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Assignment slug '{req.slug}' already exists in this classroom"
            )

    if req.criteria is not None:
        effective_individual_max_score = (
            req.individual_max_score
            if req.individual_max_score is not None
            else assignment.individual_max_score
        )
        validate_criteria_weights(req.criteria, effective_individual_max_score)

_UPDATABLE_SCALAR_FIELDS = (
    "name",
    "slug",
    "description",
    "artifact_url",
    "group_deadline_utc",
    "individual_deadline_utc",
    *_DRAFT_LOCKED_FIELDS,
)

def _apply_scalar_updates(assignment: Assignment, req: UpdateAssignmentRequest) -> None:
    for field in _UPDATABLE_SCALAR_FIELDS:
        value = getattr(req, field)
        if value is not None:
            setattr(assignment, field, value)

def _replace_assignment_criteria(db: Session, assignment_id: str, criteria_inputs: List) -> None:
    db.query(Criterion).filter(Criterion.assignment_id == assignment_id).delete()
    for idx, criterion_input in enumerate(criteria_inputs):
        new_criterion = Criterion(
            assignment_id=assignment_id,
            side=criterion_input.side,
            name=criterion_input.name,
            description=criterion_input.description,
            weight_pct=criterion_input.weight_pct,
            display_order=criterion_input.display_order if criterion_input.display_order is not None else idx
        )
        db.add(new_criterion)

def update_assignment(db: Session, assignment: Assignment, req: UpdateAssignmentRequest, current_user: User) -> AssignmentDetail:
    _validate_assignment_update(db, assignment, req)
    _apply_scalar_updates(assignment, req)

    if req.criteria is not None:
        _replace_assignment_criteria(db, assignment.id, req.criteria)

    db.commit()
    db.refresh(assignment)
    return get_assignment_detail(db, assignment)
```

### What AI Suggested
- **แยก Validation ออกมาทำก่อน Mutate ORM Object (`_validate_assignment_update`) + ล็อกฟิลด์คะแนน/การจับคู่ทั้งหมดเมื่อสถานะไม่ใช่ `DRAFT` (`_DRAFT_LOCKED_FIELDS`)** → **รับและทำ** เพราะช่วยป้องกัน dirty state ใน SQLAlchemy session เมื่อ validation ไม่ผ่าน และอุดช่องโหว่การแก้พารามิเตอร์กลางคัน
- **ยุบบล็อก `if req.<field> is not None:` 16 บล็อก** → **รับแบบปรับแนวทาง (`_apply_scalar_updates`)** โดย AI เสนอให้ใช้ `req.model_dump(exclude_unset=True)` แต่เราเลือกวนลูปผ่าน `_UPDATABLE_SCALAR_FIELDS` และเช็ค `value is not None` แทน เพื่อรักษา Observable Behavior เดิม 100% ไม่ให้กระทบกรณี Frontend ส่งค่า `null`
- **แยกการแทนที่ Criteria (`_replace_assignment_criteria`), แก้บั๊ก `display_order is not None`, และปรับชื่อตัวแปร `c`/`crit`** → **รับและทำ** เพราะทำให้ฟังก์ชัน `update_assignment` เหลือเพียง 11 บรรทัด อ่านง่าย และแก้บั๊กกรณี `display_order=0`
- **เปลี่ยนจากการ Raise `HTTPException` เป็น Custom Domain Exception** → **ไม่รับ (Skip)** เพราะ Router ทั้งโปรเจกต์เรียกใช้ Service โดยตรงและคาดหวัง `HTTPException` การเปลี่ยนจะกระทบ Contract ของชั้นอื่นเกินจำเป็น
- **เปลี่ยนชื่อฟิลด์ใน Schema เพื่อเติมหน่วย (`instructor_weight_ratio`, `completion_threshold_ratio`)** → **ไม่รับ (Skip)** เพราะเป็น Breaking Change ของ Public API Contract ที่กระทบทั้ง Frontend และ OpenAPI Spec

### Tests Result
- **Before**: 4 tests pass in `test_assignment.py` (26/26 tests pass across full suite)
- **After**: 4 tests pass in `test_assignment.py` (26/26 tests pass across full suite, ไม่มีการแก้ไขไฟล์ใน `backend/tests/`)
- **จำนวนครั้งที่ต้อง revert เพราะ test แดง**: 0 ครั้ง

