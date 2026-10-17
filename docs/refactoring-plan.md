# Refactoring Plan

This refactoring plan prioritizes concrete code smells, bugs, security issues, and performance bottlenecks discovered across the `backend/` and `frontend/` codebase, respecting all constraints in `AGENTS.md` and `memory-bank/`.

---

## High Priority

1. **`frontend/src/features/reporting/PairCoverageView.tsx:75` & `backend/app/features/pairing/router.py:40` — Broken API Contract (Mismatched Endpoint & Payload)**:
   - **Type of code smell:** Broken Contract / Dead Feature ( Shotgun Surgery risk ).
   - **Why it's a problem (Impact: High):** `PairCoverageView.tsx` calls `POST /assignments/${assignmentId}/pairs:assign-extra` and sends `evaluator_user_id: extraEvaluatorEmail` (a single string that can be an email or user ID). However, the backend router only defines `POST /assignments/{assignmentId}/pairs:add-evaluators` (`router.py:40`), and `add_extra_evaluators_to_pair` (`engine.py:288`) ignores `evaluator_user_ids` completely and randomly picks `req.evaluator_count` students instead. Clicking "เพิ่มผู้ประเมิน" in the UI always fails with `404 Not Found`.
   - **Suggested fix:** Change `PairCoverageView.tsx:75` to call `/assignments/${assignmentId}/pairs:add-evaluators` (or add a route alias in `pairing/router.py:40`), and update `add_extra_evaluators_to_pair` in `backend/app/features/pairing/engine.py:333` to resolve and assign the requested `evaluator_user_id`/email when provided before falling back to random selection.

2. **`backend/app/features/reporting/export.py:157-189` — Missing CSV/Spreadsheet Formula Injection Sanitization in XLSX Export**:
   - **Type of code smell:** Inconsistent Security Enforcement / Duplicated Export Formatting Logic.
   - **Why it's a problem (Impact: High):** `memory-bank/` and `security.py:172` (`FR-SEC-04`) mandate that all user-supplied string fields on both import and export must be sanitized with `sanitize_csv_cell()`. While `export_assignment_csv` (`export.py:47-82`) applies `sanitize_csv_cell()`, `export_assignment_xlsx` (`export.py:157-189`) writes `g.group_name`, `g.override_reason`, `s.student_id`, `s.display_name`, `s.override_reason`, `p.criterion_name`, `p.item_a_name`, and `p.item_b_name` directly to Excel cells without `sanitize_csv_cell()`, allowing formula execution when instructors open the `.xlsx` report.
   - **Suggested fix:** Wrap user-supplied string fields (`group_name`, `override_reason`, `student_id`, `display_name`, `criterion_name`, `item_a_name`, `item_b_name`) with `sanitize_csv_cell(...)` in `export_assignment_xlsx` (`export.py:157-189`).

3. **`backend/app/features/reporting/services.py:47` — Wrong Field Mapped to `weight_pct` in Group Summary Report**:
   - **Type of code smell:** Copy-Paste / Data Mapping Bug.
   - **Why it's a problem (Impact: High):** In `get_group_summary_report`, `CriterionScoreOut.weight_pct` is assigned `float(cr_score.score_ratio)` instead of `float(cr_obj.weight_pct) if cr_obj else 0.0` (compare with `services.py:118` in `get_individual_summary_report`). Any consumer inspecting `weight_pct` on group criterion breakdowns receives the band-mapped score ratio (`0.60–1.00`) instead of the criterion percentage weight (`0–100`).
   - **Suggested fix:** Replace `weight_pct=float(cr_score.score_ratio)` at `backend/app/features/reporting/services.py:47` with `weight_pct=float(cr_obj.weight_pct) if cr_obj else 0.0`.

4. **`backend/app/features/audit/services.py:143-153` — Appeal Score Override Hardcodes `original_value=0.0` and Ignores `ScoreOverride` in Group Score Totals**:
   - **Type of code smell:** Incomplete Domain Logic / Divergent Change.
   - **Why it's a problem (Impact: High):**
     1. When an instructor resolves an appeal with a new score (`audit/services.py:148`), `ScoreOverride` is created with `original_value=0.0` instead of the student's actual computed score, corrupting the audit history.
     2. In `get_individual_summary_report` (`reporting/services.py:94-148`), if a student's **group** score was overridden via `ScoreOverride(side="GROUP")`, `p_score.group_component_score` and `p_score.net_score` still use the un-overridden group score from `run_scoring_engine_for_assignment` (unlike `get_student_score_view` at `scoring/services.py:328-368`, which checks `g_override`). Thus, the instructor's Individual Summary Report and Student's Personal Score View show different net scores for the same student when a group score is overridden.
   - **Suggested fix:**
     1. In `audit/services.py:143`, compute the student's current score (or call `override_score` from `scoring/services.py:257`) instead of hardcoding `original_value=0.0`.
     2. In `reporting/services.py:94-148`, check for group-level `ScoreOverride` (just like `scoring/services.py:328-340`) when computing `group_component_score` and `net_final_score`.

5. **`backend/app/features/assignment/services.py:91-101` — Incomplete State Guard on Active Assignments & Missing Cross-Field Validation**:
   - **Type of code smell:** Shotgun Surgery / Primitive Obsession (status string checks).
   - **Why it's a problem (Impact: High):** In `update_assignment`, when `assignment.status != "DRAFT"`, only `criteria`, `group_max_score`, `individual_max_score`, and `target_coverage` are blocked. Core scoring/pairing parameters (`instructor_weight`, `max_workload`, `min_comparisons`, `score_floor`, `score_ceiling`, `completion_threshold`, `pairing_seed`) remain mutable while an assignment is `OPEN` or `FINALIZED`. Additionally, partial updates do not validate that `score_floor <= score_ceiling` or `min_comparisons <= max_workload`.
   - **Suggested fix:** Add the remaining scoring/pairing fields (`instructor_weight`, `max_workload`, `min_comparisons`, `score_floor`, `score_ceiling`, `completion_threshold`, `pairing_seed`) to the `assignment.status != "DRAFT"` guard at `assignment/services.py:97`, and validate `assignment.score_floor <= assignment.score_ceiling` before `db.commit()`.

6. **`backend/app/main.py:48-54` & `backend/app/core/config.py:9` — Wildcard CORS with Credentials Enabled and Hardcoded Default Secret Key**:
   - **Type of code smell:** Security Misconfiguration / Dead Configuration (`settings.ALLOWED_ORIGINS`).
   - **Why it's a problem (Impact: High):** `config.py:13-24` defines and validates `settings.ALLOWED_ORIGINS`, but `main.py:50` ignores it and hardcodes `allow_origins=["*"]` alongside `allow_credentials=True`. Furthermore, `config.py:9` has a hardcoded fallback `SECRET_KEY` used to sign HMAC tokens (`security.py:50`).
   - **Suggested fix:** In `backend/app/main.py:50`, replace `allow_origins=["*"]` with `allow_origins=settings.ALLOWED_ORIGINS`.

7. **`backend/app/features/integrity/detector.py:203-212` — `exclude_comparison` Does Not Verify Comparison Belongs to `assignment`**:
   - **Type of code smell:** Missing Resource Scoping (IDOR / Cross-Assignment Mutation).
   - **Why it's a problem (Impact: High):** `exclude_comparison` queries `Comparison.id == req.comparison_id` without checking `PairAssignment.assignment_id == assignment.id`. An instructor in Classroom A can pass a `comparison_id` belonging to Classroom B and mark it `EXCLUDED`.
   - **Suggested fix:** Join `PairAssignment` in `detector.py:205`:
     ```python
     comp = db.query(Comparison).join(PairAssignment).filter(
         Comparison.id == req.comparison_id,
         PairAssignment.assignment_id == assignment.id
     ).first()
     ```

---

## Medium Priority

8. **`backend/app/features/evaluation/services.py:106-141` & `224-234` & `266-288` — Severe N+1 Query Loops in Student Evaluation Workflow**:
   - **Type of code smell:** N+1 Queries in Hot Loop.
   - **Why it's a problem (Impact: Medium):**
     - `get_evaluation_worksheet` (`services.py:106-126`): For every assigned pair, executes 1 query for `Comparison` + 2 calls to `get_item_card()` (which queries `GroupEntity` + `ClassroomMember` + `User` per member). For a student with 24 pairs, loading the worksheet triggers >100 SQL queries.
     - `batch_save_drafts` (`services.py:231-233`): Calls `save_comparison_draft()` in a loop, executing `db.commit()` and `db.refresh(comp)` on **every single draft item** instead of committing once at the end of the batch.
     - `submit_evaluation` (`services.py:266-295`): Mutates `Comparison` rows and adds `ComparisonRevision` rows inside a loop *before* checking `if unanswered_count > 0 and not req.confirm_incomplete:` at line 289.
   - **Suggested fix:**
     - Pre-fetch `Comparison` rows by `pair_assignment_id.in_(...)` and pre-build a lookup dict of `GroupEntity`/`User` cards in `get_evaluation_worksheet`.
     - In `save_comparison_draft`, add a `commit: bool = True` parameter so `batch_save_drafts` commits once after the loop.

9. **`backend/app/features/reporting/services.py:164`, `backend/app/features/integrity/detector.py:33`, `backend/app/features/audit/services.py:24,103,175` — Loading Entire `User` Table (`db.query(User).all()`) into Memory**:
   - **Type of code smell:** Unbounded Query / Scalability Bottleneck.
   - **Why it's a problem (Impact: Medium):** Five functions (`get_pair_coverage_report`, `detect_quality_signals`, `list_audit_events`, `list_assignment_appeals`, `resolve_appeal`) execute `db.query(User).all()` across the entire database just to build a `user_id -> display_name` map for a single classroom or assignment.
   - **Suggested fix:** Filter `User` by the relevant IDs (e.g., `db.query(User).filter(User.id.in_(user_ids)).all()`) or join `ClassroomMember` for the specific `classroom_id`.

10. **`backend/app/features/assignment/router.py:44-105`, `pairing/router.py:21-49`, `scoring/router.py:24-67`, `reporting/router.py:23-83`, `integrity/router.py:18-34`, `audit/router.py:37-68`, `evaluation/router.py:25-61` — Duplicated Assignment Lookup & Classroom Role Check (21 Occurrences)**:
    - **Type of code smell:** Duplicated Code (Copy-Paste Boilerplate across 7 routers).
    - **Why it's a problem (Impact: Medium):** The exact 6-line block:
      ```python
      assignment = db.query(Assignment).filter(Assignment.id == assignmentId).first()
      if not assignment:
          raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found")
      _, member = get_classroom_or_404(assignment.classroom_id, current_user, db)
      check_classroom_role(member, [...])
      ```
      is copy-pasted 21 times across 7 router files (and in `assignment/router.py:46,60,75,90,104`, `from fastapi import HTTPException, status` is even imported inline inside each function).
    - **Suggested fix:** Add a helper `get_assignment_or_404(assignment_id: str, current_user: User, db: Session, allowed_roles: Optional[List[str]] = None) -> tuple[Assignment, ClassroomMember]` in `backend/app/core/security.py` (right next to `get_classroom_or_404`) and call it in the routers.

11. **`backend/app/features/classroom/router.py:96-114` & `142-154` vs. `backend/app/features/classroom/services.py:206-278` — Split Authorization & Double DB Queries for Member Update/Delete**:
    - **Type of code smell:** Feature Envy / Split Business Logic between Router and Service.
    - **Why it's a problem (Impact: Medium):** `classroom/router.py` queries `ClassroomMember` (`lines 96-101` and `142-147`) to check `CO_TEACHER` vs `OWNER` permissions, and then immediately calls `update_classroom_member` / `remove_classroom_member` in `services.py`, which queries the exact same `ClassroomMember` again (`lines 212-217` and `258-263`) to check last-owner demotion/removal.
    - **Suggested fix:** Pass the `caller_member: ClassroomMember` (or `target_member`) into `update_classroom_member` and `remove_classroom_member` in `classroom/services.py` so role hierarchy and last-owner checks happen in one place with a single query.

12. **`frontend/src/features/evaluation/EvaluationWorksheetView.tsx:119` — Hardcoded `3000` ms `timeOnTaskMs` on Every Click**:
    - **Type of code smell:** Magic Number / Fake Telemetry Bug.
    - **Why it's a problem (Impact: Medium):** `handleChoiceChange` calls `triggerAutosave(pairId, choiceVal, 3000)`, hardcoding `3000` ms (exact threshold of `QS-05: Speed Running < 3,000 ms` in `detector.py:93`) instead of measuring actual elapsed time since the comparison was viewed. As a result, `QS-05 Speed Running` detection in `detector.py:89-105` can never trigger from normal UI usage!
    - **Suggested fix:** Track a `lastInteractionRef = useRef<number>(Date.now())` in `EvaluationWorksheetView.tsx` and pass `Date.now() - lastInteractionRef.current` (updating the ref on each choice) to `triggerAutosave`.

13. **`frontend/src/features/assignment/AssignmentDetailView.tsx:523-533` — Hardcoded Scoring Parameters in UI (`60.0%`, `100.0%`, `90.0%`)**:
    - **Type of code smell:** Magic Numbers / Stale Display Bug.
    - **Why it's a problem (Impact: Medium):** `AssignmentDetailView.tsx` hardcodes `60.0%` for Band Mapping Floor, `100.0%` for Ceiling, and `90.0%` for Participation Threshold instead of rendering `assignment.score_floor`, `assignment.score_ceiling`, and `assignment.completion_threshold` returned by the API.
    - **Suggested fix:** Add `score_floor`, `score_ceiling`, and `completion_threshold` to the `AssignmentDetail` interface in `AssignmentDetailView.tsx:35` and render `(assignment.score_floor * 100).toFixed(1)%`, `(assignment.score_ceiling * 100).toFixed(1)%`, and `(assignment.completion_threshold * 100).toFixed(1)%`.

14. **`backend/app/features/assignment/services.py:81 & 156` — Truthiness Bug on `c.display_order` (`0` Evaluates to `False`)**:
    - **Type of code smell:** Improper Null Check (`if val` instead of `if val is not None`).
    - **Why it's a problem (Impact: Medium):** `CriterionInput.display_order` defaults to `0` (`schemas.py:11`). Because `0` is falsy in Python, `c.display_order if c.display_order else idx` always evaluates to `idx` whenever `display_order == 0`.
    - **Suggested fix:** Change `c.display_order if c.display_order else idx` to `c.display_order if c.display_order is not None else idx` (and default `CriterionInput.display_order: Optional[int] = None` in `schemas.py:11`).

---

## Low Priority

15. **`backend/app/features/assignment/services.py:103-143` — 17 Repetitive `if req.field is not None:` Statements**:
    - **Type of code smell:** Long Method / Boilerplate Conditional Chains.
    - **Why it's a problem (Impact: Low):** 40 lines of repetitive field-by-field assignment make `update_assignment` noisy and prevent clearing optional fields (like `group_deadline_utc` or `individual_deadline_utc`) back to `None`.
    - **Suggested fix:** Use `update_data = req.model_dump(exclude_unset=True, exclude={"criteria", "slug"})` and loop `for field, value in update_data.items(): setattr(assignment, field, value)`.

16. **`frontend/src/features/assignment/AssignmentDetailView.tsx:222` & `AssignmentSetupView.tsx:148` — Blocking `window.alert()` Calls Mixed with `<Alert>` Component**:
    - **Type of code smell:** Inconsistent UI Pattern.
    - **Why it's a problem (Impact: Low):** Most views use the non-blocking `<Alert type="success">` state banner, but `AssignmentDetailView.tsx:222` and `AssignmentSetupView.tsx:148` call `window.alert(...)`, which blocks the browser main thread and can interfere with automated E2E tests if not explicitly handled.
    - **Suggested fix:** Remove `window.alert(...)` in both files and rely on navigation/banner feedback.

17. **`frontend/src/features/classroom/ClassroomDetailView.tsx:1-885` — 885-Line God Component Managing 3 Tabs and 6 Modals**:
    - **Type of code smell:** Large Component / Mixed Responsibilities.
    - **Why it's a problem (Impact: Low):** `ClassroomDetailView.tsx` holds 23 `useState` hooks covering assignment listing, member table, group cards, add/edit/delete member modals, archive modal, and delete classroom modal in a single 885-line file.
    - **Suggested fix:** Extract the member modals (`AddMemberModal`, `EditMemberModal`, `DeleteMemberModal`) or the `RosterTab` section into a dedicated sub-component under `frontend/src/features/classroom/`.

18. **`backend/app/features/reporting/export.py:38,217` & `backend/app/features/pairing/engine.py:223` — Naive `datetime.now()` Instead of `datetime.now(timezone.utc)`**:
    - **Type of code smell:** Inconsistent Timezone Handling.
    - **Why it's a problem (Impact: Low):** The rest of the backend uses timezone-aware `datetime.now(timezone.utc)`, whereas `export.py:38,217` and `engine.py:223` call naive `datetime.now()`.
    - **Suggested fix:** Replace `datetime.now()` with `datetime.now(timezone.utc)`.

---

## What AI Suggested vs What We'll Do

| AI เสนอ | ตัดสินใจ | เหตุผล |
|---|---|---|
| 1. แก้ API Contract ที่ไม่ตรงกันระหว่าง `PairCoverageView.tsx:75` (`/pairs:assign-extra`) กับ `pairing/router.py:40` (`/pairs:add-evaluators`) และรองรับการระบุ `evaluator_user_id` | รับ | เป็นบั๊กที่ทำให้ฟีเจอร์เพิ่มผู้ประเมินในหน้า UI พัง (`404 Not Found`) และทำงานไม่ตรงตามที่ผู้ใช้กรอก |
| 2. เพิ่ม `sanitize_csv_cell()` ใน `export_assignment_xlsx` (`export.py:157-189`) | รับ | ป้องกัน Formula Injection ตามข้อกำหนดความปลอดภัย `FR-SEC-04` ให้ครอบคลุมทั้ง CSV และ XLSX |
| 3. แก้การแมปค่า `weight_pct` ผิดใน `get_group_summary_report` (`reporting/services.py:47`) | รับ | แก้บั๊กการส่งค่า `score_ratio` แทนน้ำหนักเกณฑ์จริง (`weight_pct`) ใช้การแก้เพียง 1 บรรทัด |
| 4. คำนวณ `original_value` จริงตอนตัดสินอุทธรณ์ (`audit/services.py:148`) และนำ Group `ScoreOverride` มาคิดใน `get_individual_summary_report` (`reporting/services.py:94-148`) | รับ | ทำให้ข้อมูล Audit log ถูกต้องและผลคะแนนสุทธิตรงกันทุกหน้าจอ (Instructor Report vs Student View) |
| 5. ล็อกฟิลด์การคำนวณคะแนนและการจับคู่ทั้งหมดเมื่อ `assignment.status != "DRAFT"` และตรวจ `score_floor <= score_ceiling` (`assignment/services.py:91-101`) | รับ | ป้องกันการแก้พารามิเตอร์สำคัญกลางคันขณะที่งานกำลังเปิดประเมินหรือตัดเกรดไปแล้ว |
| 6. เปลี่ยน `allow_origins=["*"]` ใน `main.py:50` ให้ใช้ `settings.ALLOWED_ORIGINS` | รับ | แก้เพียง 1 บรรทัดเพื่อบังคับใช้ค่า CORS ที่ตั้งไว้ใน `config.py` และลดความเสี่ยงด้านความปลอดภัย |
| 7. ตรวจสอบว่า `Comparison` อยู่ใน `assignment.id` ปัจจุบันก่อนสั่ง Exclude (`integrity/detector.py:205`) | รับ | ป้องกันการ Exclude ข้ามงานมอบหมายหรือข้ามห้องเรียน (IDOR) |
| 8. ลด N+1 Queries ใน `get_evaluation_worksheet` และทำ single commit ใน `batch_save_drafts` (`evaluation/services.py:106-141, 224-234`) | รับ | ลดภาระฐานข้อมูลในจุดที่นักศึกษาใช้งานพร้อมกันจำนวนมาก (Hot path) |
| 9. เปลี่ยน `db.query(User).all()` ให้ดึงเฉพาะ User ที่เกี่ยวข้อง (`reporting/services.py`, `detector.py`, `audit/services.py`) | รับ | ป้องกันปัญหาหน่วยความจำและช้าลงเมื่อจำนวนผู้ใช้ในระบบเพิ่มขึ้น |
| 10. ยุบรวมโค้ดดึง `Assignment` + เช็คสิทธิ์ Classroom ที่ซ้ำกัน 21 จุดใน 7 Routers เป็นฟังก์ชัน `get_assignment_or_404` | เลื่อน | โค้ดปัจจุบันยังทำงานถูกต้อง การแก้กระทบถึง 7 ไฟล์ (เกินขอบเขตการแก้จุดเล็ก ๆ ในรอบแรก) |
| 11. รวมการเช็คสิทธิ์แก้ไข/ลบสมาชิกและลดการ Query `ClassroomMember` ซ้ำระหว่าง `classroom/router.py` กับ `classroom/services.py` | เลื่อน | เป็นเรื่องโครงสร้างโค้ดและลด Query ซ้ำ 1 ครั้งต่อการกดแก้ไขสมาชิก ซึ่งไม่ได้เกิดถี่ |
| 12. วัดเวลาทำข้อสอบจริง (`timeOnTaskMs`) ใน `EvaluationWorksheetView.tsx:119` แทนค่าคงที่ `3000` ms | รับ | เพื่อให้ระบบตรวจจับ `QS-05: Speed Running` (`< 3,000 ms`) ทำงานได้จริงตามที่ออกแบบไว้ใน `memory-bank/` |
| 13. แสดงค่า `score_floor`, `score_ceiling`, `completion_threshold` จริงจาก API ใน `AssignmentDetailView.tsx:523-533` แทนค่าคงที่ | รับ | แก้บั๊กการแสดงผลหน้า UI ให้ตรงกับค่าที่ตั้งไว้ใน Assignment จริง |
| 14. แก้ `c.display_order if c.display_order else idx` เป็น `is not None` (`assignment/services.py:81, 156`) | รับ | แก้บั๊กกรณี `display_order` มีค่าเป็น `0` แล้วถูกมองว่าเป็น `False` |
| 15. เปลี่ยน `if req.field is not None:` 17 บล็อกใน `update_assignment` ให้ใช้ `model_dump(exclude_unset=True)` (`assignment/services.py:103-143`) | เลื่อน | อาจกระทบพฤติกรรมของ Frontend หากส่งค่า `null` มาในฟิลด์ที่ไม่ต้องการล้างค่า ต้องทดสอบคู่กับ Frontend อย่างละเอียดก่อน |
| 16. เปลี่ยน `window.alert()` ใน `AssignmentDetailView.tsx:222` และ `AssignmentSetupView.tsx:148` เป็น `<Alert>` | ไม่รับ | อาจมี E2E test หรือ flow ที่ผูกกับ dialog พฤติกรรมเดิมอยู่ และผลกระทบต่อผู้ใช้ต่ำ |
| 17. แยก Sub-components/Modals ออกจาก `ClassroomDetailView.tsx` (885 บรรทัด) | ไม่รับ | เป็นการ Refactor โครงสร้างไฟล์ขนาดใหญ่ (diff เกิน 200 บรรทัด ขัดกับกฎใน `AGENTS.md`) และยังไม่มีบั๊กจากการรวมไฟล์ |
| 18. เปลี่ยน `datetime.now()` เป็น `datetime.now(timezone.utc)` ใน `export.py:38,217` และ `pairing/engine.py:223` | รับ | แก้ไขง่าย (3 บรรทัด) และทำให้การใช้เวลาเป็น UTC สม่ำเสมอทั้งระบบ |

---

## สิ่งที่ AI มองไม่เห็น (เราเห็นเอง)

1. **นักศึกษาที่ได้รับมอบหมายให้ประเมินเพิ่ม (`source="INSTRUCTOR_EXTRA"`) ถูกคิดน้ำหนักคะแนนเท่ากับอาจารย์ (`instructor_weight`) (`backend/app/features/scoring/services.py:67` & `pairing/engine.py:369`)**:
   - **Business Context:** เมื่อคู่ประเมินใดมีผู้ส่งผลประเมินไม่ถึงเกณฑ์ขั้นต่ำ (`min_comparisons`) อาจารย์จะแจกงานประเมินซ่อมให้นักศึกษาคนอื่นช่วยประเมินเพิ่ม (`source="INSTRUCTOR_EXTRA"`) แต่โค้ดใน `scoring/services.py:67` กำหนด `is_inst = (c.evaluator_user_id in instructor_user_ids) or (p.source in ["INSTRUCTOR_SELF", "INSTRUCTOR_EXTRA"])` ส่งผลให้คะแนนโหวตของนักศึกษาที่ได้งานซ่อมถูกคูณด้วยน้ำหนักของอาจารย์ (`instructor_weight`) แทนที่จะเป็นน้ำหนักของนักศึกษา (`1.0`)

2. **การสุ่มผู้ประเมินเพิ่มในระดับรายบุคคล (`side="INDIVIDUAL"`) ไม่ได้จำกัดเฉพาะเพื่อนร่วมกลุ่มเดียวกัน (`backend/app/features/pairing/engine.py:339-345`)**:
   - **Business Context:** ตามหลักการประเมินเพื่อแก้ปัญหา Free-rider ใน `memory-bank/intent.md` การประเมินรายบุคคล (`INDIVIDUAL`) ต้องทำโดยสมาชิกภายในกลุ่มเดียวกันที่เห็นการทำงานจริงเท่านั้น แต่ใน `add_extra_evaluators_to_pair` เช็คเพียงว่าผู้ประเมินไม่ใช่คนเดียวกับผู้ถูกประเมิน (`s.user_id in [item_a_id, item_b_id]`) โดยไม่ได้ตรวจว่าอยู่ `group_id` เดียวกันหรือไม่ ทำให้ระบบสามารถสุ่มนักศึกษาจากกลุ่มอื่นที่ไม่เคยทำงานร่วมกันมาประเมินผลงานรายบุคคลข้ามกลุ่มได้

3. **นักศึกษาในห้องเรียนที่ยังไม่มีกลุ่ม (`group_id is None`) ไม่ได้รับใบงานประเมินตอน Publish แต่ถูกนำมาคิดคะแนนรายบุคคลเป็น 0 (`backend/app/features/pairing/engine.py:52-56` vs `scoring/services.py:83-87`)**:
   - **Business Context:** ในสถานการณ์จริงของวิชาเรียน มักมีนักศึกษาใน Roster ที่ยังไม่ได้สังกัดกลุ่ม (`group_id is None`) ตอนอาจารย์กด Publish งาน ระบบใน `generate_group_pairs_for_criterion` กรองเฉพาะนักศึกษาที่มี `group_id.isnot(None)` ทำให้คนไม่มีกลุ่มไม่ได้รับคู่ประเมินเลย แต่ใน `run_scoring_engine_for_assignment` กลับดึงนักศึกษาทุกคนในห้องมาคำนวณคะแนนโดยไม่มีการแจ้งเตือนอาจารย์ก่อนกด Publish ว่ายังมีนักศึกษาตกหล่นที่ยังไม่ได้จัดเข้ากลุ่ม
