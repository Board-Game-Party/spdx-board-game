# Code Review: `update_assignment`

A detailed review of the `update_assignment` function across Security, Error Handling & Data Integrity, Performance, Code Smells, and Naming.

---

## 1. Security Issues

### 1.1 Unused `current_user` Parameter — Missing Authorization Check (IDOR / Broken Access Control)
- **Severity:** **High**
- **Location:** `def update_assignment(..., current_user: User)`
- **Problem:** `current_user` is passed into the function signature but is never referenced in the body.
- **Impact:** Unless ownership and role checks (e.g., verifying `current_user` is the instructor/owner of `assignment.classroom_id`) are strictly enforced in every single caller, any authenticated user could update any assignment across any classroom, or audit logs will lack actor tracking (`updated_by`).

### 1.2 Unvalidated `artifact_url` (Stored XSS / SSRF Risk)
- **Severity:** **Medium**
- **Location:** `assignment.artifact_url = req.artifact_url`
- **Problem:** If `req.artifact_url` is typed as a plain `str` rather than a strict HTTP/HTTPS URL type, arbitrary URI schemes (such as `javascript:alert(1)` or `file:///...`) can be stored.
- **Impact:** If the frontend renders `artifact_url` directly inside an `<a href="...">` tag, clicking it will execute arbitrary JavaScript (Stored XSS). If the backend fetches the artifact URL, it opens a Server-Side Request Forgery (SSRF) vector.

### 1.3 Partial / Bypassed State Lock on Scoring & Pairing Configuration
- **Severity:** **High**
- **Location:** Lines 9–13 vs. Lines 41–56
- **Problem:** When `assignment.status != "DRAFT"`, the guard blocks changes to `group_max_score`, `individual_max_score`, and `target_coverage` with the message *"Cannot modify core scoring/pairing configuration when assignment is active."* However, other core scoring and pairing fields (`instructor_weight`, `max_workload`, `min_comparisons`, `score_floor`, `score_ceiling`, `completion_threshold`, `pairing_seed`) are **not** blocked and can be freely overwritten while active.
- **Impact:** Modifying `pairing_seed`, `score_floor`/`score_ceiling`, or `instructor_weight` mid-assignment can corrupt active peer-review pairings, invalidate in-progress grading calculations, or allow unintended grade manipulation after submissions have started.

---

## 2. Missing Error Handling & Bugs

### 2.1 Truthiness Bug on `c.display_order` (`0` Evaluates to `False`)
- **Severity:** **Medium**
- **Location:** `display_order=c.display_order if c.display_order else idx`
- **Problem:** Uses truthiness (`if c.display_order`) instead of an explicit `is not None` check. In Python, `0` is falsy.
- **Impact:** If a criterion at index `3` explicitly specifies `display_order=0` to appear first, `0 if 0 else 3` evaluates to `3`, silently ignoring the user's explicit `0` value. Should be `c.display_order if c.display_order is not None else idx`.

### 2.2 Race Condition (TOCTOU) & Unhandled `IntegrityError` on `slug` and `db.commit()`
- **Severity:** **Medium**
- **Location:** Lines 17–26 (`slug` uniqueness check) and Line 72 (`db.commit()`)
- **Problem:** Checking `.first()` before updating is a classic Time-of-Check to Time-of-Use (TOCTOU) race condition. Concurrent requests with the same `slug` will both pass the `.first()` check, and one will fail at `db.commit()` with an unhandled `sqlalchemy.exc.IntegrityError` (resulting in a `500 Internal Server Error` and an un-rolled-back session).
- **Impact:** Concurrent updates return `500` instead of `409 Conflict`, and the database session is left in an invalid state if not explicitly rolled back via `db.rollback()`.

### 2.3 Missing Cross-Field Invariant Validation on Partial Updates
- **Severity:** **High**
- **Location:** Lines 29–54
- **Problem:** Because fields are updated individually when `not None`, cross-field invariants are never validated against the resulting `Assignment` state:
  - `score_floor` vs. `score_ceiling`: A request updating only `score_floor` could set `assignment.score_floor > assignment.score_ceiling`.
  - `group_deadline_utc` vs. `individual_deadline_utc`: Deadlines may have required ordering or timezone constraints that break when only one is updated.
  - `min_comparisons` vs. `max_workload` / `target_coverage`: Could result in impossible pairing constraints (e.g., `min_comparisons > max_workload`).
- **Impact:** Persists logically invalid state to the database, causing downstream runtime crashes during pairing generation or score calculation.

### 2.4 Potential Foreign Key Violation or Data Loss on Bulk `Criterion` Delete
- **Severity:** **High**
- **Location:** `db.query(Criterion).filter(Criterion.assignment_id == assignment.id).delete()`
- **Problem:** Bulk `.delete()` bypasses SQLAlchemy ORM cascade rules by default (`synchronize_session="evaluate"`) and deletes rows directly in SQL. Furthermore, all existing `Criterion` primary keys (`id`) are destroyed and regenerated even if only a typo in one criterion's name was fixed.
- **Impact:**
  1. If any draft evaluations, rubric previews, or foreign keys reference `criterion.id`, `db.commit()` will either crash with a `ForeignKeyViolation` or cascade-delete related records unexpectedly.
  2. ORM objects in `assignment.criteria` already loaded in memory can become out of sync with the database prior to `refresh`.

### 2.5 No Check Against Changing `status` After Irreversible State (e.g., `CLOSED` / `GRADED`)
- **Severity:** **Medium**
- **Location:** Lines 3–13
- **Problem:** The check only distinguishes between `"DRAFT"` and `!= "DRAFT"`, treating `"PUBLISHED"`, `"IN_PROGRESS"`, `"CLOSED"`, and `"ARCHIVED"` identically.
- **Impact:** Even after an assignment is completely finished and grades are finalized, someone can still change `name`, `slug`, `deadlines`, `instructor_weight`, `score_floor`, etc.

### 2.6 Cannot Clear Nullable Fields (No Distinction Between "Omitted" and "Explicitly `None`")
- **Severity:** **Medium**
- **Location:** Lines 27–40 (e.g., `if req.description is not None:`, `if req.artifact_url is not None:`, deadlines)
- **Problem:** Checking `if req.<field> is not None:` prevents a user from ever clearing an optional field (setting `artifact_url`, `description`, or `group_deadline_utc` back to `NULL`).
- **Impact:** Once an optional field like `artifact_url` or a deadline is set, it can never be removed via this endpoint (unless using Pydantic's `req.model_fields_set` / `exclude_unset=True`).

---

## 3. Code Smells & Maintainability Issues

### 3.1 Repetitive `if req.field is not None:` Boilerplate (17 Consecutive `if` Blocks)
- **Severity:** **Medium**
- **Location:** Lines 15–56
- **Problem:** 17 manual `if req.<field> is not None: assignment.<field> = req.<field>` statements violate DRY and bloat cyclomatic complexity.
- **Impact:** Error-prone to maintain; adding a new field to `UpdateAssignmentRequest` requires remembering to add another `if` block and lock check. In Pydantic/FastAPI, iterating over `req.model_dump(exclude_unset=True)` (after handling special fields like `criteria` and `slug`) is cleaner and also solves the nullable-field clearing bug (2.6).

### 3.2 Domain / Service Layer Coupled to HTTP Transport (`HTTPException`)
- **Severity:** **Low**
- **Location:** Lines 5, 10, 22 (`raise HTTPException(...)`)
- **Problem:** Business logic / persistence function directly raises FastAPI `HTTPException` with HTTP status codes.
- **Impact:** Makes the function harder to reuse in CLI scripts, background tasks (Celery/ARQ), or non-HTTP contexts without catching web-framework exceptions.

### 3.3 Magic String `"DRAFT"`
- **Severity:** **Low**
- **Location:** Line 3 (`if assignment.status != "DRAFT":`) and Line 58 (`and assignment.status == "DRAFT":`)
- **Problem:** Uses raw string literal `"DRAFT"` instead of an `Enum` (e.g., `AssignmentStatus.DRAFT`). Also redundantly checks `assignment.status == "DRAFT"` on line 58 when line 4 already raised an exception if `req.criteria is not None` and `assignment.status != "DRAFT"`.
- **Impact:** Typos in status strings won't be caught by static type checkers, and the redundant condition on line 58 obscures control flow.

### 3.4 Mutation Before Validation (`validate_criteria_weights` Order)
- **Severity:** **Low**
- **Location:** Line 59 (`validate_criteria_weights(req.criteria, assignment.individual_max_score)`)
- **Problem:** The ORM instance `assignment` is mutated across lines 15–56 *before* `validate_criteria_weights` is called on line 59. If `validate_criteria_weights` raises an exception, `assignment` in the current SQLAlchemy `Session` remain dirty in memory.
- **Impact:** If the caller catches the exception or reuses the `Session` in the same request lifecycle, dirty uncommitted changes on `assignment` could be accidentally flushed later. All validation should happen before mutating the ORM entity.

---

## 4. Performance Issues

### 4.1 Redundant Database Round-Trips (`commit` + `refresh` + `get_assignment_detail`)
- **Severity:** **Low**
- **Location:** Lines 72–74
  ```python
  db.commit()
  db.refresh(assignment)
  return get_assignment_detail(db, assignment)
  ```
- **Problem:**
  1. Deleting and re-inserting `Criterion` rows issues `1 DELETE + N INSERT` statements, followed by `db.commit()`.
  2. `db.refresh(assignment)` immediately executes a `SELECT` query to reload `assignment` attributes.
  3. `get_assignment_detail(db, assignment)` very likely executes additional `SELECT` queries (or re-queries `Assignment` with `joinedload`/`selectinload` for `criteria` and related tables).
- **Impact:** At least 2–3 unnecessary database round-trips on every update. Setting `expire_on_commit=False` or letting `get_assignment_detail` fetch the full hydrated object in a single query eliminates the redundant `db.refresh(assignment)`.

---

## 5. Naming Issues

### 5.1 Cryptic / Abbreviated Variable Names (`req`, `c`, `crit`)
- **Severity:** **Low**
- **Location:**
  - `req: UpdateAssignmentRequest` (parameter)
  - `for idx, c in enumerate(req.criteria):` (line 62)
  - `crit = Criterion(...)` (line 63)
- **Problem:** Single-letter (`c`) and truncated (`crit`, `req`) identifiers reduce readability, especially when `c` and `crit` represent the same conceptual entity (input DTO vs. ORM model) in the same 5-line scope.
- **Impact:** Harder to scan and distinguish between input payload (`criterion_input` / `criterion_req`) and ORM model (`criterion` / `db_criterion`).

### 5.2 Ambiguous Units in Parameter Names (`target_coverage`, `instructor_weight`, `completion_threshold`, `max_workload`)
- **Severity:** **Low**
- **Location:** Lines 41–54 and `weight_pct` on Line 68
- **Problem:** While `group_deadline_utc` (has `_utc`) and `weight_pct` (has `_pct`) clearly state their units, fields like `instructor_weight`, `completion_threshold`, and `target_coverage` omit units. Are weights/thresholds ratios (`0.0–1.0`) or percentages (`0–100`)? Is `max_workload` a count of reviews or hours?
- **Impact:** Increases cognitive load and risk of unit-mismatch bugs (e.g., passing `0.5` where `50` is expected, especially when `weight_pct` uses `_pct` right below it).

---

## Summary Table

| # | Category | Issue | Severity |
|---|----------|-------|----------|
| 1.1 | Security | Unused `current_user` parameter (missing authorization / audit trail) | **High** |
| 1.3 | Security / Logic | Partial state lock allows modifying scoring/pairing fields (`instructor_weight`, `pairing_seed`, etc.) when active | **High** |
| 2.3 | Validation | Missing cross-field invariant checks on partial updates (`score_floor > score_ceiling`, deadlines, workload) | **High** |
| 2.4 | Data Integrity | Bulk `.delete()` on `Criterion` bypasses ORM cascades and destroys primary keys | **High** |
| 1.2 | Security | Unvalidated `artifact_url` (Stored XSS / SSRF risk if plain string) | **Medium** |
| 2.1 | Bug | Truthiness check `if c.display_order else idx` overwrites `display_order=0` | **Medium** |
| 2.2 | Error Handling | Race condition (TOCTOU) on `slug` uniqueness & unhandled `IntegrityError` on `commit()` | **Medium** |
| 2.5 | Logic | No guard against updating closed/archived/graded assignments | **Medium** |
| 2.6 | Bug / API Design | `is not None` checks make it impossible to clear nullable fields back to `NULL` | **Medium** |
| 3.1 | Code Smell | 17 repetitive `if req.<field> is not None` blocks instead of `exclude_unset=True` | **Medium** |
| 3.2 | Code Smell | Domain logic coupled directly to FastAPI `HTTPException` | **Low** |
| 3.3 | Code Smell | Magic string `"DRAFT"` and redundant `assignment.status == "DRAFT"` check | **Low** |
| 3.4 | Code Smell | Mutating ORM object in session before running `validate_criteria_weights` | **Low** |
| 4.1 | Performance | Redundant DB round-trips (`db.commit()` + `db.refresh()` + `get_assignment_detail()`) | **Low** |
| 5.1 | Naming | Abbreviated/single-letter names (`req`, `c`, `crit`) in the same scope | **Low** |
| 5.2 | Naming | Inconsistent unit suffixes (`instructor_weight`, `completion_threshold` vs. `weight_pct`) | **Low** |
