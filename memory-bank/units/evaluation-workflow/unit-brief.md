# Unit: Evaluation & Submission Workflow

## Purpose
จัดการประสบการณ์การทำแบบประเมินของผู้ใช้ (Evaluation UI/UX) รองรับสเกล 6 ระดับ (Forced Choice), การบันทึกฉบับร่างอัตโนมัติ (Autosave Draft), การทำงาน Offline และการส่งผลประเมิน (Submission)

## Responsibilities
- แสดงผลหน้าประเมิน Group Evaluation และ Individual Evaluation พร้อมแสดง Artifact Link ของทั้งสองฝั่ง (FR-EVAL-01, FR-EVAL-02, FR-EVAL-11)
- ให้บริการสเกลประเมินแบบ 6-point forced choice scale ไม่มีตัวเลือกกลาง พร้อม Text label ทุกปุ่ม (FR-EVAL-03, D1)
- จัดการ Autosave Draft ทุกครั้งที่มีการเปลี่ยนคำตอบ (Debounce $\le 2$ วินาที) แบบ Idempotent (FR-EVAL-04, FR-API-01)
- รองรับการ Submit แบบบางส่วนหรือครบถ้วน พร้อมแสดงจำนวนข้อที่ยังไม่ตอบ (FR-EVAL-05)
- รองรับการ Re-submit ได้ไม่จำกัดครั้งก่อน Deadline โดยบันทึก Revision History ทุกครั้ง และใช้ชุดล่าสุดคำนวณ (FR-EVAL-06, FR-API-02)
- แสดง Progress bar ความคืบหน้าแบบ Real-time (FR-EVAL-07)
- ปิดรับการ Submit ทันทีเมื่อถึง Deadline และเปลี่ยนเป็นโหมด Read-only (FR-EVAL-08)
- รองรับ Offline queue คำตอบในฝั่ง Client และทำการ Sync เมื่อการเชื่อมต่อกลับมา (FR-EVAL-13)
- ปฏิบัติตามมาตรฐานการเข้าถึง WCAG 2.2 AA และ WAI-ARIA APG Radio Group (FR-A11Y-01..06)

## NOT Responsible For
- จัดสรรคู่การประเมิน (หน้าที่ของ `pairing-engine`)
- คำนวณ Quality Index และ Band Mapping (หน้าที่ของ `scoring-engine`)

## Dependencies
- Depends on: `auth-identity`, `assignment-lifecycle`, `pairing-engine`
- Used by: `scoring-engine`, `integrity-quality`, `reporting-export`

## Key Business Rules
- ใช้เฉพาะสเกล 6-point forced choice (ค่า 1 ถึง 6) ห้ามมีตัวเลือกเท่ากัน (FR-EVAL-03, D1)
- ข้อมูลฉบับร่าง (Draft) ที่ไม่เคยกด Submit ต้องไม่ถูกนำไปคำนวณคะแนน (FR-EVAL-09, DR-01)
- ไม่อนุญาตให้ Submit หรือแก้ไขคำตอบหลัง Deadline ผ่านไปแล้ว (FR-EVAL-08)
- การ Re-submit ต้องเก็บประวัติ revision ไว้ใน `comparison_revision` ทุกครั้ง (FR-EVAL-06)
- ทุก request การ Submit ต้องรองรับ `Idempotency-Key` เพื่อป้องกันการส่งซ้ำ (FR-API-02)
- Accessible UI: มีป้ายกำกับข้อความชัดเจน, Contrast $\ge 4.5:1$, รองรับการเลื่อนด้วย Keyboard (FR-A11Y-01..05)

## Key Stories
- [FR-EVAL-01..13, FR-API-01..02, FR-A11Y-01..06]

## Bolt Type
[ ] DDD Construction — ถ้า domain logic ซับซ้อน
[x] Simple Construction — ถ้าเป็น UI, integration, utility
