# Entity Relationship Diagram (ERD) — PairEval

## 1. Mermaid Entity Relationship Diagram

```mermaid
erDiagram
    USER ||--o{ CLASSROOM : "created_by"
    USER ||--o{ CLASSROOM_MEMBER : "member_of"
    USER ||--o{ PAIR_ASSIGNMENT : "evaluates"
    USER ||--o{ COMPARISON : "submits"
    USER ||--o{ SCORE_OVERRIDE : "overridden_by"
    USER ||--o{ AUDIT_EVENT : "actor"
    USER ||--o{ NOTIFICATION : "receives"
    USER ||--o{ APPEAL : "submits"

    CLASSROOM ||--o{ CLASSROOM_MEMBER : "enrolled_in"
    CLASSROOM ||--o{ GROUP_ENTITY : "contains"
    CLASSROOM ||--o{ ASSIGNMENT : "manages"
    CLASSROOM ||--o{ AUDIT_EVENT : "scoped_to"

    GROUP_ENTITY ||--o{ CLASSROOM_MEMBER : "assigned_to"

    ASSIGNMENT ||--o{ CRITERION : "defines"
    ASSIGNMENT ||--o{ PAIR_ASSIGNMENT : "schedules"
    ASSIGNMENT ||--o{ COMPUTED_SCORE : "produces"
    ASSIGNMENT ||--o{ SCORE_OVERRIDE : "has_overrides"
    ASSIGNMENT ||--o{ AUDIT_EVENT : "records"
    ASSIGNMENT ||--o{ APPEAL : "has_appeals"

    CRITERION ||--o{ PAIR_ASSIGNMENT : "evaluates_under"
    CRITERION ||--o{ COMPUTED_SCORE : "scored_under"
    CRITERION ||--o{ SCORE_OVERRIDE : "overridden_under"

    PAIR_ASSIGNMENT ||--|| COMPARISON : "receives"
    COMPARISON ||--o{ COMPARISON_REVISION : "has_revisions"

    USER {
        uuid id PK "Primary Key"
        varchar email_normalized UK "Normalized email (lowercase, no tags)"
        varchar email_raw "Original email as entered"
        varchar display_name "Display name of user"
        varchar google_sub UK "Google OAuth subject ID"
        varchar status "PENDING | ACTIVE | DISABLED"
        timestamptz created_at "Account creation timestamp"
        timestamptz last_login_at "Last login timestamp"
    }

    CLASSROOM {
        uuid id PK "Primary Key"
        varchar name "Classroom name"
        varchar slug UK "Unique URL slug"
        varchar timezone "Timezone e.g. Asia/Bangkok"
        text_array allowed_email_domains "Allowed email domains for login"
        varchar status "ACTIVE | ARCHIVED"
        uuid created_by FK "Creator user id"
        timestamptz created_at "Creation timestamp"
    }

    GROUP_ENTITY {
        uuid id PK "Primary Key"
        uuid classroom_id FK "Classroom reference"
        varchar name "Group name (unique within classroom)"
        timestamptz created_at "Group creation timestamp"
    }

    CLASSROOM_MEMBER {
        uuid id PK "Primary Key"
        uuid classroom_id FK "Classroom reference"
        uuid user_id FK "User reference"
        varchar role "OWNER | CO_TEACHER | TA | STUDENT"
        uuid group_id FK "Nullable: Assigned group for students"
        timestamptz joined_at "Enrollment timestamp"
    }

    ASSIGNMENT {
        uuid id PK "Primary Key"
        uuid classroom_id FK "Classroom reference"
        varchar name "Assignment name"
        varchar slug "Assignment URL slug"
        text description "Detailed description and guidelines"
        text artifact_url "Deliverable/Presentation link (A5)"
        numeric group_max_score "Max score for group portion"
        numeric individual_max_score "Max score for individual portion"
        timestamptz group_deadline_utc "Group evaluation deadline in UTC"
        timestamptz individual_deadline_utc "Individual evaluation deadline in UTC"
        numeric instructor_weight "Weight multiplier for instructor evaluations"
        int target_coverage "Target comparisons per pair (default 5)"
        int max_workload "Max pairs per student (default 8)"
        int min_comparisons "Min comparisons before confidence flag (default 3)"
        numeric score_floor "Band mapping floor (default 0.600)"
        numeric score_ceiling "Band mapping ceiling (default 1.000)"
        numeric completion_threshold "Participation threshold (default 0.900)"
        varchar scoring_formula_version "Scoring algorithm version e.g. v2.0"
        bigint pairing_seed "Deterministic seed for pairing"
        varchar status "DRAFT | PUBLISHED | OPEN | CLOSED | FINALIZED | ARCHIVED"
        timestamptz published_at "Publish timestamp"
        timestamptz finalized_at "Score finalization timestamp"
        uuid created_by FK "Creator instructor id"
        timestamptz created_at "Creation timestamp"
    }

    CRITERION {
        uuid id PK "Primary Key"
        uuid assignment_id FK "Assignment reference"
        varchar side "GROUP | INDIVIDUAL"
        varchar name "Criterion name"
        text description "Rubric/Guideline description"
        numeric weight_pct "Weight percentage (sum per side = 100)"
        int display_order "Order of display in UI"
    }

    PAIR_ASSIGNMENT {
        uuid id PK "Primary Key"
        uuid assignment_id FK "Assignment reference"
        uuid criterion_id FK "Criterion reference"
        varchar side "GROUP | INDIVIDUAL"
        uuid item_a_id "Group ID or Student ID (Item A)"
        uuid item_b_id "Group ID or Student ID (Item B)"
        uuid evaluator_user_id FK "Assigned evaluator user id"
        uuid display_left_item_id "Randomized left item id (D8)"
        int generation "Regeneration iteration counter"
        varchar source "AUTO | INSTRUCTOR_EXTRA | INSTRUCTOR_SELF"
        timestamptz created_at "Assignment creation timestamp"
    }

    COMPARISON {
        uuid id PK "Primary Key"
        uuid pair_assignment_id UK,FK "1-to-1 Pair assignment reference"
        uuid evaluator_user_id FK "Evaluator user id"
        int choice "1: A>>, 2: A>, 3: A>, 4: B>, 5: B>, 6: B>>"
        varchar status "DRAFT | SUBMITTED | EXCLUDED"
        int time_on_task_ms "Time spent on this comparison (ms)"
        timestamptz first_seen_at "First rendered timestamp"
        timestamptz saved_at "Autosave timestamp"
        timestamptz submitted_at "Submission timestamp"
        text excluded_reason "Reason if excluded by instructor"
        uuid excluded_by FK "Instructor user id who excluded"
    }

    COMPARISON_REVISION {
        uuid id PK "Primary Key"
        uuid comparison_id FK "Comparison reference"
        int choice "Submitted choice (1-6)"
        varchar status "SUBMITTED"
        timestamptz submitted_at "Revision timestamp"
        int revision_no "Sequential revision number (1, 2, ...)"
    }

    COMPUTED_SCORE {
        uuid id PK "Primary Key"
        uuid assignment_id FK "Assignment reference"
        uuid criterion_id FK "Nullable: Criterion reference (or null for total)"
        varchar side "GROUP | INDIVIDUAL"
        uuid item_id "Group ID or Student ID"
        int comparison_count "Number of comparisons received"
        numeric effective_weight_sum "Sum of evaluator weights"
        numeric quality_index "Quality Index q in [0, 1]"
        numeric score_ratio "Band mapped ratio [floor, ceiling]"
        numeric weighted_score "Calculated weighted score"
        text_array flags "Flags e.g. LOW_CONFIDENCE, OVERRIDDEN"
        boolean is_final "True if part of finalized snapshot"
        varchar formula_version "Scoring version used"
        timestamptz computed_at "Computation timestamp"
    }

    SCORE_OVERRIDE {
        uuid id PK "Primary Key"
        uuid assignment_id FK "Assignment reference"
        varchar side "GROUP | INDIVIDUAL"
        uuid item_id "Group ID or Student ID"
        uuid criterion_id FK "Nullable: Specific criterion or total"
        numeric original_value "Calculated original score"
        numeric override_value "Instructor overridden score"
        text reason "Mandatory override justification"
        uuid created_by FK "Instructor user id"
        timestamptz created_at "Override timestamp"
    }

    AUDIT_EVENT {
        uuid id PK "Primary Key"
        uuid classroom_id FK "Classroom reference"
        uuid assignment_id FK "Nullable: Assignment reference"
        uuid actor_user_id FK "Actor user id"
        varchar action "PUBLISH | OVERRIDE | FINALIZE | EXPORT_IDENTITIES | etc"
        varchar resource_type "ASSIGNMENT | SCORE | ROSTER | COMPARISON"
        uuid resource_id "Affected resource id"
        jsonb before_json "State before action"
        jsonb after_json "State after action"
        text reason "Optional or mandatory reason"
        varchar ip_address "Client IP address"
        timestamptz occurred_at "Event timestamp in UTC"
    }

    NOTIFICATION {
        uuid id PK "Primary Key"
        uuid user_id FK "Recipient user id"
        varchar type "ASSIGNMENT_OPEN | DEADLINE_48H | FINALIZED | EXTRA_PAIR"
        jsonb payload_json "Notification payload (no grade values)"
        timestamptz sent_at "Sent timestamp"
        timestamptz read_at "Read timestamp"
    }

    APPEAL {
        uuid id PK "Primary Key"
        uuid assignment_id FK "Assignment reference"
        uuid student_user_id FK "Appealing student user id"
        text message "Student dispute message"
        varchar status "OPEN | RESOLVED | REJECTED"
        text resolution "Instructor response and resolution"
        uuid resolved_by FK "Resolving instructor user id"
        timestamptz created_at "Appeal submission timestamp"
        timestamptz resolved_at "Resolution timestamp"
    }
```

---

## 2. Database Constraints & Invariants

| ID | Constraint / Invariant | Business Rule / Requirement Traceability |
|---|---|---|
| **DR-01** | `comparison.status = 'SUBMITTED'` | เฉพาะผลการเปรียบเทียบที่กดส่ง (SUBMITTED) เท่านั้นที่จะถูกนำมาคิดใน Quality Index ($q$) และคะแนนผลลัพธ์ (FR-SCORE-01) |
| **DR-02** | `pair_assignment` Soft-delete / Generation | ไม่อนุญาตให้ลบ `pair_assignment` ที่มี `comparison` สถานะ SUBMITTED แต่ให้เพิ่ม `generation` เมื่อต้องการ Re-generate คู่ใหม่ (FR-PAIR-11) |
| **DR-03** | Immutable `computed_score` | ข้อมูลคะแนนที่ `is_final = true` เป็น Immutable ไม่สามารถแก้ไขค่าตรง ๆ ได้ หากมีการปรับคะแนนต้องบันทึกผ่านตาราง `score_override` เท่านั้น (FR-SCORE-08, FR-SCORE-09) |
| **DR-04** | Fixed-Point `numeric` Precision | คะแนน, น้ำหนัก, และสัดส่วนทั้งหมดจัดเก็บเป็นประเภท `numeric` (เช่น `numeric(8,3)`, `numeric(6,5)`) ห้ามใช้ `float`/`double` เพื่อป้องกัน Floating-point precision error ในเอกสารคะแนน |
| **DR-05** | UTC Timestamps | ทุก Timestamp ในระบบ (`created_at`, `deadlines`, `occurred_at`) จัดเก็บเป็น UTC (`TIMESTAMPTZ`) เสมอ และแปลงเป็น Timezone ของห้องเรียนเฉพาะตอนแสดงผลใน UI (FR-ASSIGN-05) |
| **DR-06** | Unique Evaluator Pair Assignment | `UNIQUE(assignment_id, criterion_id, evaluator_user_id, item_a_id, item_b_id, generation)` ป้องกันไม่ให้ Evaluator ได้รับคู่ประเมินเดิมซ้ำในเกณฑ์เดียวกัน (INV-2) |
| **DR-07** | Non-reflexive Pair Assignment | `CHECK (item_a_id <> item_b_id)` ป้องกันไม่ให้สร้างคู่เปรียบเทียบระหว่าง Item เดียวกัน (INV-1) |
| **DR-08** | Append-Only Audit Trail | ตาราง `audit_event` ต้องไม่มี API สำหรับ `UPDATE` หรือ `DELETE` เพื่อรองรับความโปร่งใสและตรวจสอบย้อนหลังได้ 100% (FR-AUDIT-03, AR-03) |
| **DR-09** | Criteria Weight Sum = 100% | ตรวจสอบ `SUM(weight_pct) = 100.00` ในแต่ละ `side` (GROUP / INDIVIDUAL) ก่อนเปลี่ยนสถานะ Assignment เป็น `PUBLISHED` (FR-ASSIGN-02) |
| **DR-10** | 6-Point Scale Boundary | `CHECK (choice BETWEEN 1 AND 6)` ในตาราง `comparison` เพื่อบังคับใช้ 6-point forced choice scale อย่างเคร่งครัด (D1, FR-EVAL-03) |
