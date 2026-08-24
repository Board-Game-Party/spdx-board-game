# User Stories — PairEval (Pairwise Evaluation System)

## สารบัญ User Stories

| Epic / Module | Story ID | หัวข้อ | บทบาท (Role) | PRD Traceability |
|---|---|---|---|---|
| **1. Authentication & Authorization** | [US-AUTH-01](#us-auth-01-google-oauth-20-login--session-management) | Google OAuth 2.0 Login & Session Management | Student / Instructor | FR-AUTH-01, FR-AUTH-04 |
| | [US-AUTH-02](#us-auth-02-hosted-domain-restriction) | Hosted Domain Restriction | Student / Instructor | FR-AUTH-02 |
| | [US-AUTH-03](#us-auth-03-email-normalization--roster-matching) | Email Normalization & Roster Matching | Student | FR-AUTH-03, FR-CLASS-04 |
| | [US-AUTH-04](#us-auth-04-role-based-access-control--resource-isolation) | Role-Based Access Control & Resource Isolation | All Roles | FR-AUTHZ-01, FR-AUTHZ-02, FR-AUTHZ-03 |
| **2. Classroom & Roster Management** | [US-CLASS-01](#us-class-01-classroom-lifecycle-management) | Classroom Lifecycle Management | Instructor (Owner) | FR-CLASS-01, FR-CLASS-06, FR-CLASS-07 |
| | [US-CLASS-02](#us-class-02-atomic-csv-roster-import--validation) | Atomic CSV Roster Import & Validation | Instructor / TA | FR-CLASS-01, FR-CLASS-02, FR-CLASS-03, FR-SEC-04 |
| | [US-CLASS-03](#us-class-03-roster-upsert--member-management) | Roster Upsert & Member Management | Instructor / TA | FR-CLASS-05, FR-CLASS-06 |
| **3. Assignment Lifecycle & Criteria** | [US-ASSIGN-01](#us-assign-01-assignment-creation--configuration) | Assignment Creation & Configuration | Instructor | FR-ASSIGN-01, FR-ASSIGN-05, FR-ASSIGN-07 |
| | [US-ASSIGN-02](#us-assign-02-criteria-setup--100-weight-validation) | Criteria Setup & 100% Weight Validation | Instructor | FR-ASSIGN-02, FR-ASSIGN-03 |
| | [US-ASSIGN-03](#us-assign-03-assignment-state-machine--lifecycle-transitions) | Assignment State Machine & Lifecycle Transitions | Instructor | FR-ASSIGN-03, FR-ASSIGN-04, §7.3 |
| **4. Pairing Engine & Feasibility** | [US-PAIR-01](#us-pair-01-pairing-feasibility-check--auto-reduction) | Pairing Feasibility Check & Auto-reduction | Instructor | FR-PAIR-04, FR-PAIR-05, §8.2 |
| | [US-PAIR-02](#us-pair-02-balanced-group-pair-generation) | Balanced Group Pair Generation | Instructor / Student | FR-PAIR-01, FR-PAIR-02, FR-PAIR-06..09, §8.4 |
| | [US-PAIR-03](#us-pair-03-individual-pair-generation--small-group-handling) | Individual Pair Generation & Small Group Handling | Instructor / Student | FR-PAIR-03, FR-PAIR-12..15, §8.3 |
| | [US-PAIR-04](#us-pair-04-manual-extra-evaluator-assignment) | Manual Extra Evaluator Assignment | Instructor | FR-PAIR-10 |
| **5. Evaluation Experience (UI/UX)** | [US-EVAL-01](#us-eval-01-group-evaluation-with-6-point-forced-choice-scale) | Group Evaluation with 6-Point Forced Choice Scale | Student | FR-EVAL-01..03, FR-A11Y-01..05 |
| | [US-EVAL-02](#us-eval-02-autosave-draft--progress-tracking) | Autosave Draft & Progress Tracking | Student | FR-EVAL-04, FR-EVAL-07, FR-A11Y-06 |
| | [US-EVAL-03](#us-eval-03-evaluation-submission--re-submission) | Evaluation Submission & Re-submission | Student | FR-EVAL-05, FR-EVAL-06, FR-EVAL-08, FR-EVAL-09 |
| | [US-EVAL-04](#us-eval-04-individual-peer-evaluation-ui) | Individual Peer Evaluation UI | Student | FR-EVAL-11, FR-EVAL-12 |
| | [US-EVAL-05](#us-eval-05-offline-queue--resilient-sync) | Offline Queue & Resilient Sync | Student | FR-EVAL-13 |
| **6. Scoring Engine & Band Mapping** | [US-SCORE-01](#us-score-01-quality-index--band-mapping-calculation) | Quality Index & Band Mapping Calculation | Instructor / System | FR-SCORE-01..03, §9.1..9.3 |
| | [US-SCORE-02](#us-score-02-participation-multiplier-calculation) | Participation Multiplier Calculation | Instructor / System | FR-SCORE-04, FR-SCORE-11..13, §9.4 |
| | [US-SCORE-03](#us-score-03-low-confidence-flagging--finalization-snapshot) | Low Confidence Flagging & Finalization Snapshot | Instructor | FR-SCORE-05..07, FR-SCORE-09, FR-SCORE-10 |
| | [US-SCORE-04](#us-score-04-instructor-score-override) | Instructor Score Override | Instructor (Owner) | FR-SCORE-08, DR-03 |
| **7. Reports & Data Export** | [US-REPORT-01](#us-report-01-group--individual-summary-reports) | Group & Individual Summary Reports | Instructor | FR-REPORT-01, FR-REPORT-02, FR-REPORT-05 |
| | [US-REPORT-02](#us-report-02-pair-coverage--quality-signals-report) | Pair Coverage & Quality Signals Report | Instructor | FR-REPORT-03, FR-REPORT-04 |
| | [US-REPORT-03](#us-report-03-student-score-view-with-k-anonymity) | Student Score View with k-Anonymity | Student | FR-REPORT-06, FR-ANON-01..04 |
| | [US-EXPORT-01](#us-export-01-csv--xlsx-export-with-identity-masking) | CSV & XLSX Export with Identity Masking | Instructor | FR-EXPORT-01..06, FR-SEC-04 |
| **8. Integrity & Quality Signals** | [US-INTEG-01](#us-integ-01-evaluation-anomaly--bias-detection) | Evaluation Anomaly & Bias Detection | Instructor / System | QS-01..07, FR-QS-01..03 |
| **9. Notification Service** | [US-NOTIF-01](#us-notif-01-assignment-milestone-email-notifications) | Assignment Milestone Email Notifications | Student | FR-NOTIF-01..06, FR-PRIV-04 |
| **10. Audit & Appeals** | [US-AUDIT-01](#us-audit-01-append-only-audit-trail-logging) | Append-Only Audit Trail Logging | System / Auditor | FR-AUDIT-01..03, AR-03 |
| | [US-APPEAL-01](#us-appeal-01-student-score-appeals-intake--resolution) | Student Score Appeals Intake & Resolution | Student / Instructor | FR-APPEAL-01, FR-APPEAL-02 |

---

## 1. Authentication & Authorization

### US-AUTH-01: Google OAuth 2.0 Login & Session Management
## User Story
As a user (Student or Instructor), I want to log in using my university Google account via Google OAuth 2.0, so that I can securely access the system without managing separate passwords.

## Acceptance Criteria
- Given ผู้ใช้ยังไม่ได้เข้าสู่ระบบ เมื่อเปิดเข้าใช้งานหน้าใด ๆ ของระบบ แล้วระบบต้อง redirect ไปยังหน้า Google OAuth 2.0 Consent screen
- Given ผู้ใช้ยืนยันตัวตนผ่าน Google สำเร็จ เมื่อระบบตรวจสอบ token ถูกต้อง แล้วระบบต้องสร้าง session ที่มีอายุการใช้งาน 12 ชั่วโมง และ refresh session ได้อย่างโปร่งใสโดยไม่ต้องบังคับ login ใหม่

## Definition of Done
- [ ] Feature ทำงานได้ตาม acceptance criteria
- [ ] มี unit test ครอบคลุม business rule ของ story นี้
- [ ] มี E2E test สำหรับ AC อย่างน้อย 1 ข้อ (จะทำจริงใน WS-04)
- [ ] Code ผ่าน review จากสมาชิกในกลุ่ม
- [ ] Deploy ขึ้น staging แล้วเปิดใช้ได้จริง

---

### US-AUTH-02: Hosted Domain Restriction
## User Story
As a course instructor, I want the system to restrict logins to specified university email domains, so that unauthorized external users cannot access classroom data.

## Acceptance Criteria
- Given ห้องเรียนกำหนด allowed domain เป็น `uni.ac.th` เมื่อผู้ใช้พยายามเข้าสู่ระบบด้วยอีเมล `@gmail.com` แล้วระบบต้องปฏิเสธการเข้าใช้งานพร้อมแสดงข้อความแจ้งเตือนที่ชัดเจน
- Given ผู้ใช้เข้าสู่ระบบด้วยอีเมลภายใต้ domain ที่ได้รับอนุญาต เมื่อผ่านการตรวจสอบ แล้วระบบต้องอนุญาตให้เข้าสู่ระบบและนำทางไปยัง dashboard ของห้องเรียนนั้น

## Definition of Done
- [ ] Feature ทำงานได้ตาม acceptance criteria
- [ ] มี unit test ครอบคลุม business rule ของ story นี้
- [ ] มี E2E test สำหรับ AC อย่างน้อย 1 ข้อ (จะทำจริงใน WS-04)
- [ ] Code ผ่าน review จากสมาชิกในกลุ่ม
- [ ] Deploy ขึ้น staging แล้วเปิดใช้ได้จริง

---

### US-AUTH-03: Email Normalization & Roster Matching
## User Story
As a student, I want the system to recognize my email regardless of character casing, dot placement, or tags, so that I can seamlessly access my assigned classroom even if my email format differs slightly from the roster.

## Acceptance Criteria
- Given รายชื่อใน Roster บันทึกอีเมลเป็น `Somchai.A+section1@uni.ac.th` เมื่อนักศึกษาเข้าสู่ระบบด้วยอีเมล `somchaia@uni.ac.th` แล้วระบบต้องจับคู่กับข้อมูลใน Roster ได้อย่างถูกต้อง
- Given อีเมลนักศึกษาใหม่ที่ยังไม่เคย login มีสถานะในระบบเป็น `PENDING` เมื่อนักศึกษาเข้าสู่ระบบสำเร็จในครั้งแรก แล้วระบบต้องเปลี่ยนสถานะเป็น `ACTIVE` โดยอัตโนมัติ

## Definition of Done
- [ ] Feature ทำงานได้ตาม acceptance criteria
- [ ] มี unit test ครอบคลุม business rule ของ story นี้
- [ ] มี E2E test สำหรับ AC อย่างน้อย 1 ข้อ (จะทำจริงใน WS-04)
- [ ] Code ผ่าน review จากสมาชิกในกลุ่ม
- [ ] Deploy ขึ้น staging แล้วเปิดใช้ได้จริง

---

### US-AUTH-04: Role-Based Access Control & Resource Isolation
## User Story
As a system administrator, I want role permissions and classroom resource scopes enforced at the server level, so that users cannot access or modify unauthorized data across different roles or classrooms.

## Acceptance Criteria
- Given ผู้ใช้ล็อกอินในฐานะ Student เมื่อพยายามเรียก API ฝั่ง Instructor (เช่น `GET /assignments/{id}/reports/group`) โดยตรง แล้วระบบต้องตอบกลับด้วย HTTP status 403 Forbidden
- Given ผู้ใช้สังกัด Classroom A เมื่อพยายามเข้าถึง Resource ของ Classroom B แล้วระบบต้องตอบกลับด้วย HTTP status 404 Not Found เสมอ (เพื่อไม่ให้เปิดเผยการมีอยู่ของข้อมูล)
- Given ผู้ใช้หนึ่งคนเป็น Instructor ใน Classroom A และเป็น Student ใน Classroom B เมื่อสลับห้องเรียน แล้วระบบต้องปรับสิทธิ์การใช้งานตามบริบทห้องเรียนอย่างถูกต้อง

## Definition of Done
- [ ] Feature ทำงานได้ตาม acceptance criteria
- [ ] มี unit test ครอบคลุม business rule ของ story นี้
- [ ] มี E2E test สำหรับ AC อย่างน้อย 1 ข้อ (จะทำจริงใน WS-04)
- [ ] Code ผ่าน review จากสมาชิกในกลุ่ม
- [ ] Deploy ขึ้น staging แล้วเปิดใช้ได้จริง

---

## 2. Classroom & Roster Management

### US-CLASS-01: Classroom Lifecycle Management
## User Story
As an instructor (Owner), I want to create, configure, and archive classrooms, so that I can organize evaluation environments per semester and course section.

## Acceptance Criteria
- Given Instructor (Owner) กำหนดชื่อห้องเรียน, timezone, และ allowed email domains เมื่อกดยืนยันสร้างห้องเรียน แล้วระบบต้องสร้าง Classroom slug เฉพาะและบันทึกข้อมูลอย่างสมบูรณ์
- Given ห้องเรียนสิ้นสุดการเรียนการสอน เมื่อ Owner เลือก Archive ห้องเรียน แล้วระบบต้องเปลี่ยนสถานะเป็น Read-only และซ่อนออกจากหน้ารายการหลัก

## Definition of Done
- [ ] Feature ทำงานได้ตาม acceptance criteria
- [ ] มี unit test ครอบคลุม business rule ของ story นี้
- [ ] มี E2E test สำหรับ AC อย่างน้อย 1 ข้อ (จะทำจริงใน WS-04)
- [ ] Code ผ่าน review จากสมาชิกในกลุ่ม
- [ ] Deploy ขึ้น staging แล้วเปิดใช้ได้จริง

---

### US-CLASS-02: Atomic CSV Roster Import & Validation
## User Story
As an instructor or TA, I want to import student roster and group assignments via CSV with atomic validation, so that bad data is rejected entirely without corrupting the classroom state.

## Acceptance Criteria
- Given ไฟล์ CSV รายชื่อนักศึกษา 100 แถว มีแถวที่ 42 รูปแบบอีเมลไม่ถูกต้อง เมื่ออัปโหลดไฟล์ แล้วระบบต้องปฏิเสธทั้งไฟล์ (ไม่มีแถวใดถูกบันทึก) และรายงานข้อผิดพลาดว่า "row 42: invalid email format"
- Given ไฟล์ CSV มีข้อมูลที่มีสูตร formula เช่น `=SUM(1+1)` เมื่อทำการนำเข้า แล้วระบบต้อง escape อักขระพิเศษเพื่อป้องกัน Formula Injection (FR-SEC-04)
- Given ไฟล์ CSV มีกลุ่มที่มีสมาชิกเพียง 1 คน เมื่ออัปโหลด แล้วระบบต้องแจ้งเตือนว่ากลุ่มต้องมีสมาชิกอย่างน้อย 2 คน

## Definition of Done
- [ ] Feature ทำงานได้ตาม acceptance criteria
- [ ] มี unit test ครอบคลุม business rule ของ story นี้
- [ ] มี E2E test สำหรับ AC อย่างน้อย 1 ข้อ (จะทำจริงใน WS-04)
- [ ] Code ผ่าน review จากสมาชิกในกลุ่ม
- [ ] Deploy ขึ้น staging แล้วเปิดใช้ได้จริง

---

### US-CLASS-03: Roster Upsert & Member Management
## User Story
As an instructor (Owner), I want to update student group allocations via CSV upsert and manage Co-teachers and TAs, so that roster changes during the semester are handled smoothly.

## Acceptance Criteria
- Given Roster มีการปรับเปลี่ยนกลุ่มนักศึกษา เมื่ออัปโหลด CSV แบบ Upsert แล้วระบบต้องแสดงหน้าต่างเปรียบเทียบความเปลี่ยนแปลง (Diff view) ก่อนให้อาจารย์กดยืนยัน
- Given ห้องเรียนมี Owner เพียงคนเดียว เมื่อ Owner พยายามลบบทบาทของตนเองออกจากห้องเรียน แล้วระบบต้องปฏิเสธการทำรายการ

## Definition of Done
- [ ] Feature ทำงานได้ตาม acceptance criteria
- [ ] มี unit test ครอบคลุม business rule ของ story นี้
- [ ] มี E2E test สำหรับ AC อย่างน้อย 1 ข้อ (จะทำจริงใน WS-04)
- [ ] Code ผ่าน review จากสมาชิกในกลุ่ม
- [ ] Deploy ขึ้น staging แล้วเปิดใช้ได้จริง

---

## 3. Assignment Lifecycle & Criteria

### US-ASSIGN-01: Assignment Creation & Configuration
## User Story
As an instructor, I want to create assignments with specific group/individual max scores, deadline dates, and artifact links, so that students have clear instructions and references for evaluation.

## Acceptance Criteria
- Given Instructor กรอกข้อมูลชื่องาน, คำอธิบาย, artifact link, กำหนดคะแนนเต็มกลุ่มและบุคคล, และกำหนด deadline แยกฝั่ง เมื่อบันทึก แล้วระบบต้องสร้าง assignment ในสถานะ `DRAFT` และเก็บเวลา deadline เป็น UTC
- Given Instructor กำหนด `individual_max_score = 0` เมื่อ publish assignment แล้วระบบต้องเปิดเฉพาะการประเมินกลุ่มโดยไม่สร้างคู่ประเมินรายบุคคล

## Definition of Done
- [ ] Feature ทำงานได้ตาม acceptance criteria
- [ ] มี unit test ครอบคลุม business rule ของ story นี้
- [ ] มี E2E test สำหรับ AC อย่างน้อย 1 ข้อ (จะทำจริงใน WS-04)
- [ ] Code ผ่าน review จากสมาชิกในกลุ่ม
- [ ] Deploy ขึ้น staging แล้วเปิดใช้ได้จริง

---

### US-ASSIGN-02: Criteria Setup & 100% Weight Validation
## User Story
As an instructor, I want to define evaluation criteria with weights that must sum to 100%, so that scores are distributed accurately according to course objectives.

## Acceptance Criteria
- Given Assignment ฝั่ง Group มี 3 เกณฑ์กำหนดน้ำหนัก 40%, 35%, 25% (รวมได้ 100%) เมื่อกดบันทึกหรือ publish แล้วระบบต้องอนุญาตให้ดำเนินการต่อ
- Given Assignment มีเกณฑ์ที่ผลรวมน้ำหนักเท่ากับ 95% (ไม่ครบ 100%) เมื่อพยายาม publish assignment แล้วระบบต้องไม่อนุญาตและแสดงข้อความเตือนให้ปรับน้ำหนักให้ครบ 100% (±0.01%)

## Definition of Done
- [ ] Feature ทำงานได้ตาม acceptance criteria
- [ ] มี unit test ครอบคลุม business rule ของ story นี้
- [ ] มี E2E test สำหรับ AC อย่างน้อย 1 ข้อ (จะทำจริงใน WS-04)
- [ ] Code ผ่าน review จากสมาชิกในกลุ่ม
- [ ] Deploy ขึ้น staging แล้วเปิดใช้ได้จริง

---

### US-ASSIGN-03: Assignment State Machine & Lifecycle Transitions
## User Story
As an instructor, I want the assignment lifecycle to follow strict state transitions (Draft, Published, Open, Closed, Finalized), so that evaluation data integrity is maintained throughout the process.

## Acceptance Criteria
- Given Assignment อยู่ในสถานะ `PUBLISHED` เมื่อ Instructor ต้องการแก้ไข Criteria หรือ Roster แล้วระบบต้องบังคับให้ทำการ Unpublish เสียก่อน พร้อมเตือนว่า Comparison เดิมจะถูกยกเลิก
- Given Assignment อยู่ในสถานะ `OPEN` เมื่อ Instructor ต้องการขยายเวลาส่งงาน แล้วระบบต้องอนุญาตให้เลื่อน Deadline ออกไปได้ตลอดเวลา
- Given Assignment อยู่ในสถานะ `FINALIZED` เมื่อ Instructor มีความจำเป็นต้องเปิด Reopen คะแนนกลับเป็น `CLOSED` แล้วระบบต้องบังคับให้ระบุเหตุผลและบันทึก Audit log ทันที

## Definition of Done
- [ ] Feature ทำงานได้ตาม acceptance criteria
- [ ] มี unit test ครอบคลุม business rule ของ story นี้
- [ ] มี E2E test สำหรับ AC อย่างน้อย 1 ข้อ (จะทำจริงใน WS-04)
- [ ] Code ผ่าน review จากสมาชิกในกลุ่ม
- [ ] Deploy ขึ้น staging แล้วเปิดใช้ได้จริง

---

## 4. Pairing Engine & Feasibility

### US-PAIR-01: Pairing Feasibility Check & Auto-reduction
## User Story
As an instructor, I want the system to calculate pairing mathematical feasibility before publishing, so that unattainable coverage targets are adjusted gracefully with explicit explanations.

## Acceptance Criteria
- Given ห้องเรียนขนาดเล็กที่มีจำนวนนักศึกษาไม่เพียงพอต่อ Coverage เป้าหมาย $R=5$ เมื่ออาจารย์ตรวจสอบความพร้อมก่อน Publish แล้วระบบต้องคำนวณลด $R$ ลงมาที่ค่าสูงสุดที่เป็นไปได้ และแสดงข้อความอธิบายเหตุผลเป็นตัวเลขให้ทราบอย่างชัดเจน
- Given การตรวจสอบ Feasibility ผ่านทุกข้อกำหนด เมื่อคำนวณสำเร็จ แล้วระบบต้องแสดงจำนวนคู่ทั้งหมด, Workload ต่อคน ($k$), และจำนวน Comparison รวมให้อาจารย์เห็นก่อนกดยืนยัน Publish

## Definition of Done
- [ ] Feature ทำงานได้ตาม acceptance criteria
- [ ] มี unit test ครอบคลุม business rule ของ story นี้
- [ ] มี E2E test สำหรับ AC อย่างน้อย 1 ข้อ (จะทำจริงใน WS-04)
- [ ] Code ผ่าน review จากสมาชิกในกลุ่ม
- [ ] Deploy ขึ้น staging แล้วเปิดใช้ได้จริง

---

### US-PAIR-02: Balanced Group Pair Generation
## User Story
As a student, I want to receive a balanced and unbiased set of group evaluation pairs, so that I evaluate peers fairly without being assigned my own group's work.

## Acceptance Criteria
- Given ระบบทำการ Generate Group Pairs เมื่อเสร็จสิ้น แล้วต้องไม่มีนักศึกษาคนใดได้รับคู่เปรียบเทียบที่มีกลุ่มตนเองอยู่ (INV-1)
- Given มีหลายเกณฑ์การประเมิน เมื่อจัดสรรคู่ แล้วนักศึกษาคนเดียวกันต้องไม่ได้รับคู่เดิมซ้ำในเกณฑ์เดียวกัน (INV-2)
- Given การจัดสรรคู่ทั้งหมดในระบบ เมื่อตรวจสอบผล แล้วความต่างของ Coverage สูงสุดและต่ำสุดระหว่างคู่ใด ๆ ต้องไม่เกิน 1 ($\max(\text{coverage}) - \min(\text{coverage}) \le 1$) (INV-3)
- Given มีการ Publish Assignment เมื่อสร้างชุดคู่ประเมิน แล้วตำแหน่งซ้าย-ขวาของแต่ละคู่ต้องถูกสุ่มและบันทึกไว้อย่างคงที่ (FR-PAIR-08)

## Definition of Done
- [ ] Feature ทำงานได้ตาม acceptance criteria
- [ ] มี unit test ครอบคลุม business rule ของ story นี้
- [ ] มี E2E test สำหรับ AC อย่างน้อย 1 ข้อ (จะทำจริงใน WS-04)
- [ ] Code ผ่าน review จากสมาชิกในกลุ่ม
- [ ] Deploy ขึ้น staging แล้วเปิดใช้ได้จริง

---

### US-PAIR-03: Individual Pair Generation & Small Group Handling
## User Story
As an instructor and student, I want individual within-group pair comparisons configured according to group size, so that individual peer evaluation is fair and robust.

## Acceptance Criteria
- Given กลุ่มมีขนาด $m=5$ คน เมื่อสร้างคู่ Individual Evaluation แล้วระบบต้องคำนวณ Coverage สูงสุดเป็น $m-2 = 3$ ครั้งต่อคู่ และนักศึกษาแต่ละคนประเมิน $C(4,2) = 6$ คู่ต่อเกณฑ์
- Given กลุ่มมีขนาด $m \le 2$ คน เมื่อประมวลผล แล้วระบบต้องปิดการทำ Individual Evaluation และแสดงข้อความอธิบายเหตุผลแก่นักศึกษา (FR-PAIR-12)
- Given กลุ่มมีขนาด $m=3$ คน เมื่อสร้างคู่ประเมิน แล้วระบบต้องสร้างคู่ได้แต่ต้องติดธง `LOW_CONFIDENCE` ในผลลัพธ์โดยอัตโนมัติ (FR-PAIR-13)

## Definition of Done
- [ ] Feature ทำงานได้ตาม acceptance criteria
- [ ] มี unit test ครอบคลุม business rule ของ story นี้
- [ ] มี E2E test สำหรับ AC อย่างน้อย 1 ข้อ (จะทำจริงใน WS-04)
- [ ] Code ผ่าน review จากสมาชิกในกลุ่ม
- [ ] Deploy ขึ้น staging แล้วเปิดใช้ได้จริง

---

### US-PAIR-04: Manual Extra Evaluator Assignment
## User Story
As an instructor, I want to assign additional evaluators to specific pairs that lack sufficient comparisons, so that I can resolve low-coverage pairs before finalizing scores.

## Acceptance Criteria
- Given คู่เปรียบเทียบคู่หนึ่งมี Coverage ต่ำ เมื่อ Instructor สั่ง "ส่งประเมินเพิ่ม" พร้อมระบุจำนวนคน แล้วระบบต้องสุ่มเลือกจาก Evaluator ที่มีสิทธิ์และยังไม่เคยประเมินคู่นั้นมาก่อน
- Given Instructor ต้องการประเมินคู่นั้นด้วยตนเอง เมื่อเปิดหน้าประเมิน แล้วระบบต้องบันทึกผลการประเมินโดยใช้น้ำหนัก Instructor Weight ในการคำนวณ

## Definition of Done
- [ ] Feature ทำงานได้ตาม acceptance criteria
- [ ] มี unit test ครอบคลุม business rule ของ story นี้
- [ ] มี E2E test สำหรับ AC อย่างน้อย 1 ข้อ (จะทำจริงใน WS-04)
- [ ] Code ผ่าน review จากสมาชิกในกลุ่ม
- [ ] Deploy ขึ้น staging แล้วเปิดใช้ได้จริง

---

## 5. Evaluation Experience (UI/UX)

### US-EVAL-01: Group Evaluation with 6-Point Forced Choice Scale
## User Story
As a student, I want an intuitive, accessible evaluation interface with a 6-point forced-choice scale and artifact links, so that I can easily compare two groups based on their actual deliverables.

## Acceptance Criteria
- Given หน้าทำแบบประเมิน Group Evaluation เมื่อแสดงคู่เปรียบเทียบ แล้วต้องแสดงชื่อกลุ่ม ลิงก์ไปยัง Artifact ผลงานของทั้งสองกลุ่ม และปุ่มเลือก 6 ระดับ (ไม่มีตัวเลือกตรงกลาง)
- Given ผู้ใช้งานใช้ Keyboard หรือ Screen Reader เมื่อเลื่อนผ่านตัวเลือก แล้วต้องสามารถควบคุมตามมาตรฐาน WAI-ARIA Radio Group และมี Text Label กำกับทุกตัวเลือกชัดเจน

## Definition of Done
- [ ] Feature ทำงานได้ตาม acceptance criteria
- [ ] มี unit test ครอบคลุม business rule ของ story นี้
- [ ] มี E2E test สำหรับ AC อย่างน้อย 1 ข้อ (จะทำจริงใน WS-04)
- [ ] Code ผ่าน review จากสมาชิกในกลุ่ม
- [ ] Deploy ขึ้น staging แล้วเปิดใช้ได้จริง

---

### US-EVAL-02: Autosave Draft & Progress Tracking
## User Story
As a student, I want my evaluation progress and drafts saved automatically as I make selections, so that I never lose my work due to accidental browser closure.

## Acceptance Criteria
- Given นักศึกษาเลือกคำตอบในข้อใดข้อหนึ่ง เมื่อหยุดการกระทำเป็นเวลา 2 วินาที (Debounce) แล้วระบบต้องส่ง API Autosave Draft และแสดงสถานะ "บันทึกแล้ว เมื่อ HH:MM" ผ่าน `aria-live="polite"`
- Given นักศึกษาปิดหน้าเว็บไประหว่างทำแบบประเมิน เมื่อเปิดกลับเข้ามาใหม่ก่อน Deadline แล้วคำตอบฉบับร่างเดิมทั้งหมดต้องยังคงอยู่ครบถ้วน

## Definition of Done
- [ ] Feature ทำงานได้ตาม acceptance criteria
- [ ] มี unit test ครอบคลุม business rule ของ story นี้
- [ ] มี E2E test สำหรับ AC อย่างน้อย 1 ข้อ (จะทำจริงใน WS-04)
- [ ] Code ผ่าน review จากสมาชิกในกลุ่ม
- [ ] Deploy ขึ้น staging แล้วเปิดใช้ได้จริง

---

### US-EVAL-03: Evaluation Submission & Re-submission
## User Story
As a student, I want to submit and re-submit my evaluations freely until the deadline, so that I can revise my choices after further reflection.

## Acceptance Criteria
- Given นักศึกษาทำแบบประเมินไม่ครบทุกข้อ เมื่อกดปุ่ม Submit แล้วระบบต้องแสดงกล่องยืนยันแจ้งจำนวนข้อที่ยังไม่ได้ตอบก่อนให้กดยืนยันส่ง
- Given นักศึกษากด Submit ไปแล้ว แต่ยังไม่ถึง Deadline เมื่อต้องการเปลี่ยนคำตอบและกด Re-submit แล้วระบบต้องบันทึก Revision ใหม่ และใช้ชุดคำตอบล่าสุดในการคำนวณคะแนน
- Given ถึงกำหนด Deadline ของ Assignment แล้ว เมื่อนักศึกษาเปิดหน้าประเมิน ระบบต้องปิดการแก้ไขและแสดงคำตอบเป็น Read-only ทันที

## Definition of Done
- [ ] Feature ทำงานได้ตาม acceptance criteria
- [ ] มี unit test ครอบคลุม business rule ของ story นี้
- [ ] มี E2E test สำหรับ AC อย่างน้อย 1 ข้อ (จะทำจริงใน WS-04)
- [ ] Code ผ่าน review จากสมาชิกในกลุ่ม
- [ ] Deploy ขึ้น staging แล้วเปิดใช้ได้จริง

---

### US-EVAL-04: Individual Peer Evaluation UI
## User Story
As a student, I want a dedicated evaluation screen for evaluating peers within my group, so that I can assess my teammates' contributions separately from group deliverables.

## Acceptance Criteria
- Given นักศึกษาอยู่ในกลุ่มขนาด $\ge 3$ คน เมื่อเข้าสู่หน้า Individual Evaluation แล้วระบบต้องแสดงรายการคู่เปรียบเทียบของสมาชิกภายในกลุ่ม (ไม่รวมตนเอง) พร้อมปุ่ม Submit แยกจากฝั่ง Group
- Given กลุ่มมีขนาด $\le 2$ คน เมื่อนักศึกษาเข้าสู่หน้า Individual Evaluation แล้วระบบต้องไม่แสดงฟอร์มประเมินและแจ้งเหตุผลว่าขนาดกลุ่มเล็กเกินกว่าจะประเมินรายบุคคลได้

## Definition of Done
- [ ] Feature ทำงานได้ตาม acceptance criteria
- [ ] มี unit test ครอบคลุม business rule ของ story นี้
- [ ] มี E2E test สำหรับ AC อย่างน้อย 1 ข้อ (จะทำจริงใน WS-04)
- [ ] Code ผ่าน review จากสมาชิกในกลุ่ม
- [ ] Deploy ขึ้น staging แล้วเปิดใช้ได้จริง

---

### US-EVAL-05: Offline Queue & Resilient Sync
## User Story
As a student, I want the web client to queue my responses locally when network connectivity drops, so that I can continue working uninterrupted and sync automatically once reconnected.

## Acceptance Criteria
- Given นักศึกษากำลังตอบแบบประเมินแล้วสัญญาณอินเทอร์เน็ตหลุดชั่วคราว เมื่อเลือกคำตอบต่อไป แล้วระบบฝั่ง Client ต้องเก็บคำตอบลง Local Queue
- Given สัญญาณอินเทอร์เน็ตกลับมาทำงานปกติ เมื่อ Client ตรวจพบการเชื่อมต่อ แล้วระบบต้องส่งคำตอบในคิวไป Autosave ที่ Server อย่างถูกต้องและแจ้งสถานะการบันทึกสำเร็จ

## Definition of Done
- [ ] Feature ทำงานได้ตาม acceptance criteria
- [ ] มี unit test ครอบคลุม business rule ของ story นี้
- [ ] มี E2E test สำหรับ AC อย่างน้อย 1 ข้อ (จะทำจริงใน WS-04)
- [ ] Code ผ่าน review จากสมาชิกในกลุ่ม
- [ ] Deploy ขึ้น staging แล้วเปิดใช้ได้จริง

---

## 6. Scoring Engine & Band Mapping

### US-SCORE-01: Quality Index & Band Mapping Calculation
## User Story
As an instructor, I want scores calculated via Quality Index ($q$) weighted mean and mapped through configurable score bands (Floor 60% – Ceiling 100%), so that relative comparison data translates into meaningful academic grades.

## Acceptance Criteria
- Given ผลการประเมินคู่ที่ได้รับสถานะ SUBMITTED เมื่อ Scoring Engine คำนวณ Quality Index $q(i,c)$ แล้วต้องคิดแบบ Weighted Mean โดยใช้น้ำหนัก Evaluator Weight ($w_e$)
- Given ค่า $q=0.72$, Floor=0.60, Ceiling=1.00, น้ำหนักเกณฑ์ 40%, และ Group Max Score=15 เมื่อคำนวณคะแนน แล้วระบบต้องได้ Score Ratio = $0.60 + (0.40 \times 0.72) = 0.888$ และคะแนนเกณฑ์นั้นเท่ากับ $0.888 \times 6.0 = 5.328$ (ตรงตาม Worked Example ใน §9.5)

## Definition of Done
- [ ] Feature ทำงานได้ตาม acceptance criteria
- [ ] มี unit test ครอบคลุม business rule ของ story นี้
- [ ] มี E2E test สำหรับ AC อย่างน้อย 1 ข้อ (จะทำจริงใน WS-04)
- [ ] Code ผ่าน review จากสมาชิกในกลุ่ม
- [ ] Deploy ขึ้น staging แล้วเปิดใช้ได้จริง

---

### US-SCORE-02: Participation Multiplier Calculation
## User Story
As an instructor, I want the participation penalty multiplier applied solely to non-participating individuals without impacting their teammates' group scores, so that grading is fair to responsible students.

## Acceptance Criteria
- Given นักศึกษาทำแบบประเมินได้สัดส่วน $p=0.60$ และเกณฑ์กำหนด Completion Threshold=0.90 เมื่อคำนวณตัวคูณ $M$ แล้วระบบต้องได้ $M = \min(1.0, 0.60/0.90) = 0.667$
- Given สมาชิกในกลุ่มส่งการประเมินไม่ครบจนได้ $M=0.667$ เมื่อคำนวณคะแนนสุดท้าย แล้วคะแนนส่วนบุคคลของเขาจะถูกคูณด้วย $M$ ในขณะที่คะแนนของกลุ่มและของเพื่อนร่วมกลุ่มคนอื่นจะไม่ถูกหักลด (FR-SCORE-11)

## Definition of Done
- [ ] Feature ทำงานได้ตาม acceptance criteria
- [ ] มี unit test ครอบคลุม business rule ของ story นี้
- [ ] มี E2E test สำหรับ AC อย่างน้อย 1 ข้อ (จะทำจริงใน WS-04)
- [ ] Code ผ่าน review จากสมาชิกในกลุ่ม
- [ ] Deploy ขึ้น staging แล้วเปิดใช้ได้จริง

---

### US-SCORE-03: Low Confidence Flagging & Finalization Snapshot
## User Story
As an instructor, I want items with low comparison counts flagged and scoring inputs/outputs snapshotted upon finalization, so that grade records are reproducible and auditable indefinitely.

## Acceptance Criteria
- Given Item หนึ่งได้รับจำนวน Comparison น้อยกว่า $min\_comparisons$ (default 3) เมื่อระบบคำนวณคะแนน แล้วต้องติดธง `LOW_CONFIDENCE` และไม่อนุมัติให้ Auto-finalize
- Given Instructor กดปุ่ม Finalize คะแนน เมื่อการทำงานสำเร็จ แล้วระบบต้องบันทึก Snapshot ของ Input และ Output คะแนนทั้งหมดเป็น Immutable record เพื่อให้ตรวจสอบย้อนหลังได้ผลเดิมเสมอ

## Definition of Done
- [ ] Feature ทำงานได้ตาม acceptance criteria
- [ ] มี unit test ครอบคลุม business rule ของ story นี้
- [ ] มี E2E test สำหรับ AC อย่างน้อย 1 ข้อ (จะทำจริงใน WS-04)
- [ ] Code ผ่าน review จากสมาชิกในกลุ่ม
- [ ] Deploy ขึ้น staging แล้วเปิดใช้ได้จริง

---

### US-SCORE-04: Instructor Score Override
## User Story
As an instructor (Owner), I want to manually override any calculated group or individual score with a mandatory reason, so that I retain full academic governance over final grades.

## Acceptance Criteria
- Given Instructor ต้องการแก้ไขคะแนนของนักศึกษา เมื่อกรอกคะแนนใหม่โดยไม่ระบุเหตุผล แล้วระบบต้องปฏิเสธการแก้ไขและแจ้งเตือนให้กรอกเหตุผลประกอบ
- Given Instructor กรอกคะแนนใหม่พร้อมระบุเหตุผลครบถ้วน เมื่อบันทึก แล้วระบบต้องบันทึกทับในตาราง `score_override` พร้อมบันทึก Actor, Before/After และเหตุผลลงใน Audit log

## Definition of Done
- [ ] Feature ทำงานได้ตาม acceptance criteria
- [ ] มี unit test ครอบคลุม business rule ของ story นี้
- [ ] มี E2E test สำหรับ AC อย่างน้อย 1 ข้อ (จะทำจริงใน WS-04)
- [ ] Code ผ่าน review จากสมาชิกในกลุ่ม
- [ ] Deploy ขึ้น staging แล้วเปิดใช้ได้จริง

---

## 7. Reports & Data Export

### US-REPORT-01: Instructor Group & Individual Summary Reports
## User Story
As an instructor, I want comprehensive summary reports for groups and individuals with score breakdowns and distribution charts, so that I can analyze overall class performance.

## Acceptance Criteria
- Given หน้ารายงาน Group Summary เมื่อ Instructor เปิดดู แล้วต้องแสดงตารางสรุป กลุ่ม $\times$ Criterion $\times$ Quality Index ($q$), Comparison Count, Weighted Score, และสถานะ Flags
- Given หน้ารายงาน Individual Summary เมื่อเปิดดู แล้วต้องแสดงรายชื่อนักศึกษา คะแนนรายบุคคล ค่า Participation Ratio ($p$), ค่า Multiplier ($M$), คะแนนรวมสุทธิ, และ Distribution Histogram

## Definition of Done
- [ ] Feature ทำงานได้ตาม acceptance criteria
- [ ] มี unit test ครอบคลุม business rule ของ story นี้
- [ ] มี E2E test สำหรับ AC อย่างน้อย 1 ข้อ (จะทำจริงใน WS-04)
- [ ] Code ผ่าน review จากสมาชิกในกลุ่ม
- [ ] Deploy ขึ้น staging แล้วเปิดใช้ได้จริง

---

### US-REPORT-02: Pair Coverage & Quality Signals Report
## User Story
As an instructor, I want a Pair Coverage Report and Quality Signals Report, so that I can detect anomalies, low-coverage pairs, and suspected collusion.

## Acceptance Criteria
- Given หน้ารายงาน Pair Coverage Report เมื่อเปิดดู แล้วต้องแสดงรายการทุกคู่เปรียบเทียบ จำนวน Coverage จริง ค่าเฉลี่ยผล และมีปุ่มกด "ส่งประเมินเพิ่ม" หรือ "ประเมินเอง"
- Given หน้ารายงาน Quality Report เมื่อตรวจพบสัญญาณผิดปกติ เช่น Straight-lining หรือ Intransitivity แล้วระบบต้องแสดงรายการ Flag พร้อมคำแนะนำการปฏิบัติแก่อาจารย์

## Definition of Done
- [ ] Feature ทำงานได้ตาม acceptance criteria
- [ ] มี unit test ครอบคลุม business rule ของ story นี้
- [ ] มี E2E test สำหรับ AC อย่างน้อย 1 ข้อ (จะทำจริงใน WS-04)
- [ ] Code ผ่าน review จากสมาชิกในกลุ่ม
- [ ] Deploy ขึ้น staging แล้วเปิดใช้ได้จริง

---

### US-REPORT-03: Student Score View with k-Anonymity
## User Story
As a student, I want to view my individual score, group score, and participation multiplier while maintaining peer anonymity, so that I understand my grade without privacy leaks.

## Acceptance Criteria
- Given นักศึกษาเปิดดูหน้ารายงานคะแนนของตนเอง เมื่อดูข้อมูล แล้วระบบต้องแสดงเฉพาะคะแนนกลุ่มตนเอง คะแนนบุคคลตนเอง และคะแนน Participation ของตนเองเท่านั้น (ไม่แสดงของเพื่อนคนอื่น)
- Given คะแนนรายบุคคลของนักศึกษามีจำนวนผู้ประเมินที่ส่งคำตอบน้อยกว่า $k_{min}=3$ เมื่อนักศึกษาเปิดดูคะแนน แล้วระบบต้องซ่อนคะแนนและแสดงข้อความว่า "ยังมีข้อมูลไม่เพียงพอ" เพื่อรักษา k-anonymity (FR-ANON-02)
- Given มีการคำนวณ Interim score รายวัน เมื่อนักศึกษาเข้าดูคะแนน ระบบต้องแสดงเฉพาะค่าปัจจุบันและห้ามแสดงประวัติผลต่างรายวัน (Delta) เพื่อป้องกันการแกะรอยผู้ประเมิน (FR-ANON-03)

## Definition of Done
- [ ] Feature ทำงานได้ตาม acceptance criteria
- [ ] มี unit test ครอบคลุม business rule ของ story นี้
- [ ] มี E2E test สำหรับ AC อย่างน้อย 1 ข้อ (จะทำจริงใน WS-04)
- [ ] Code ผ่าน review จากสมาชิกในกลุ่ม
- [ ] Deploy ขึ้น staging แล้วเปิดใช้ได้จริง

---

### US-EXPORT-01: CSV & XLSX Export with Identity Masking
## User Story
As an instructor, I want to export evaluation data to Excel-friendly CSV (UTF-8 with BOM) and multi-sheet XLSX files with pseudonymous evaluator IDs by default, so that data is usable in external tools while protecting student privacy.

## Acceptance Criteria
- Given Instructor ทำการ Export รายงานเป็นไฟล์ CSV เมื่อเปิดด้วย Microsoft Excel บนเครื่องภาษาไทย แล้วตัวอักษรภาษาไทยต้องแสดงผลถูกต้องสมบูรณ์โดยไม่เพี้ยน (มี UTF-8 BOM)
- Given มีการ Export ข้อมูล Raw Comparison เมื่อผู้ใช้ทั่วไปหรือ Co-teacher ดาวน์โหลดไฟล์ แล้วรหัสผู้ประเมินต้องแสดงเป็น Pseudonymous Evaluator ID เสมอ
- Given Instructor (Owner) ต้องการ Export ข้อมูลที่มีตัวตนจริงของผู้ประเมิน เมื่อกดยืนยันเจตนา แล้วระบบต้องอนุญาตและบันทึก Audit log ทันที (FR-EXPORT-04)

## Definition of Done
- [ ] Feature ทำงานได้ตาม acceptance criteria
- [ ] มี unit test ครอบคลุม business rule ของ story นี้
- [ ] มี E2E test สำหรับ AC อย่างน้อย 1 ข้อ (จะทำจริงใน WS-04)
- [ ] Code ผ่าน review จากสมาชิกในกลุ่ม
- [ ] Deploy ขึ้น staging แล้วเปิดใช้ได้จริง

---

## 8. Integrity & Quality Signals

### US-INTEG-01: Evaluation Anomaly & Bias Detection
## User Story
As an instructor, I want the system to compute quality signals (Straight-lining, Position bias, Intransitivity 3-cycles, Speed running, and Inter-rater agreement), so that I can spot bad-faith evaluations without automated unfair penalties.

## Acceptance Criteria
- Given ผู้ประเมินเลือกตอบฝั่งเดียวกันเกิน 80% ของจำนวนข้อทั้งหมด เมื่อส่งแบบประเมิน แล้วระบบต้องบันทึกสัญญาณ `QS-03: Position bias` ใน Quality Report
- Given ผู้ประเมินมีลำดับคำตอบที่ขัดแย้งกันเป็นวงกลม $A > B, B > C, C > A$ เกิน 20% ของ triple ที่ตรวจได้ เมื่อประมวลผล แล้วระบบต้องบันทึกสัญญาณ `QS-04: Intransitivity`
- Given ระบบตรวจพบสัญญาณผิดปกติ QS-01 ถึง QS-07 เมื่อคำนวณคะแนน แล้วระบบต้องไม่ตัดสิทธิ์หรือตัดคะแนนผู้ประเมินโดยอัตโนมัติ (ให้เป็นข้อมูลแก่อาจารย์ตัดสินใจเท่านั้น) (FR-QS-01)

## Definition of Done
- [ ] Feature ทำงานได้ตาม acceptance criteria
- [ ] มี unit test ครอบคลุม business rule ของ story นี้
- [ ] มี E2E test สำหรับ AC อย่างน้อย 1 ข้อ (จะทำจริงใน WS-04)
- [ ] Code ผ่าน review จากสมาชิกในกลุ่ม
- [ ] Deploy ขึ้น staging แล้วเปิดใช้ได้จริง

---

## 9. Notification Service

### US-NOTIF-01: Assignment Milestone Email Notifications
## User Story
As a student, I want to receive timely email reminders about assignment milestones (Opening, 48-hour deadline warning, and Score finalization) without any sensitive grade data in the email body, so that I stay on schedule securely.

## Acceptance Criteria
- Given Assignment เปิดให้เข้าประเมิน (Open) เมื่อถึงเวลาเปิด แล้วระบบต้องส่งอีเมลแจ้งเตือนพร้อมลิงก์ตรงไปยังหน้าระบบแก่นักศึกษาทุกคน
- Given เหลือเวลาอีก 48 ชั่วโมงก่อนหมดเวลาส่ง และมีนักศึกษาที่ยังส่งไม่ครบ เมื่อระบบตรวจสอบรอบกำหนดการ แล้วต้องส่งอีเมลเตือนความจำเฉพาะนักศึกษาที่ยังทำไม่ครบเท่านั้น
- Given อีเมลแจ้งเตือนทุกประเภทถูกส่งออกจากระบบ เมื่อตรวจสอบเนื้อความ แล้วต้องไม่มีคะแนนหรือข้อมูลผลการประเมินของนักศึกษาคนใดระบุอยู่ในเนื้อหาอีเมลอย่างเด็ดขาด (FR-NOTIF-06, FR-PRIV-04)

## Definition of Done
- [ ] Feature ทำงานได้ตาม acceptance criteria
- [ ] มี unit test ครอบคลุม business rule ของ story นี้
- [ ] มี E2E test สำหรับ AC อย่างน้อย 1 ข้อ (จะทำจริงใน WS-04)
- [ ] Code ผ่าน review จากสมาชิกในกลุ่ม
- [ ] Deploy ขึ้น staging แล้วเปิดใช้ได้จริง

---

## 10. Audit & Appeals

### US-AUDIT-01: Append-Only Audit Trail Logging
## User Story
As a security compliance officer and instructor, I want an immutable, append-only audit trail recording all significant administrative actions, so that the evaluation process is verifiable and resistant to tampering.

## Acceptance Criteria
- Given มีการกระทำสำคัญ เช่น Publish, Unpublish, Score Override, Finalize, หรือ Export ข้อมูลตัวตนจริง เมื่อการกระทำสำเร็จ แล้วระบบต้องบันทึก Audit Record ที่มี Actor, Action, Resource, Before/After JSON, Timestamp (UTC), IP Address, และ Reason ทันที
- Given มีผู้พยายามแก้ไขหรือลบรายการใน Audit log ผ่าน API หรือฐานข้อมูล แล้วระบบต้องไม่มีคำสั่งหรือ Endpoint สำหรับแก้ไข/ลบ Audit log (Append-only enforcement)

## Definition of Done
- [ ] Feature ทำงานได้ตาม acceptance criteria
- [ ] มี unit test ครอบคลุม business rule ของ story นี้
- [ ] มี E2E test สำหรับ AC อย่างน้อย 1 ข้อ (จะทำจริงใน WS-04)
- [ ] Code ผ่าน review จากสมาชิกในกลุ่ม
- [ ] Deploy ขึ้น staging แล้วเปิดใช้ได้จริง

---

### US-APPEAL-01: Student Score Appeals Intake & Resolution
## User Story
As a student, I want to submit a score dispute appeal within 7 days after finalization, and as an instructor, I want to review and resolve appeals, so that grading disputes are resolved transparently.

## Acceptance Criteria
- Given คะแนนของ Assignment อยู่ในสถานะ `FINALIZED` ไม่เกิน 7 วัน เมื่อนักศึกษาไม่เห็นด้วยกับคะแนน แล้วสามารถกรอกข้อความยื่นคำร้องอุทธรณ์ผ่านระบบได้
- Given พ้นกำหนด 7 วันหลัง Finalize ไปแล้ว เมื่อนักศึกษาพยายามยื่นอุทธรณ์ แล้วระบบต้องปิดการรับคำร้องและแจ้งเตือนว่าหมดระยะเวลายื่นอุทธรณ์
- Given Instructor เปิดดูรายการคำร้องอุทธรณ์ เมื่อพิจารณาและเลือกดำเนินการ Override คะแนนหรือยืนยันคะแนนเดิมพร้อมกรอกคำชี้แจง แล้วระบบต้องบันทึกผลการพิจารณาและแจ้งเตือนผลต่อนักศึกษา

## Definition of Done
- [ ] Feature ทำงานได้ตาม acceptance criteria
- [ ] มี unit test ครอบคลุม business rule ของ story นี้
- [ ] มี E2E test สำหรับ AC อย่างน้อย 1 ข้อ (จะทำจริงใน WS-04)
- [ ] Code ผ่าน review จากสมาชิกในกลุ่ม
- [ ] Deploy ขึ้น staging แล้วเปิดใช้ได้จริง
