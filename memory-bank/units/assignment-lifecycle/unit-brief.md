# Unit: Assignment Lifecycle & Criteria

## Purpose
จัดการวงจรสถานะของงานมอบหมาย (Assignment Lifecycle) กำหนดเกณฑ์การประเมิน (Criteria) ตรวจสอบสัดส่วนน้ำหนัก และควบคุมกำหนดเวลา

## Responsibilities
- จัดการสถานะ Assignment ตาม State Machine (`DRAFT` $\to$ `PUBLISHED` $\to$ `OPEN` $\to$ `CLOSED` $\to$ `FINALIZED`) (FR-ASSIGN-01, §7.3)
- บันทึกและตรวจสอบข้อมูล Assignment (ชื่อ, คำอธิบาย, artifact_url, group_max_score, individual_max_score, deadlines, timezone) (FR-ASSIGN-01)
- ตรวจสอบผลรวมน้ำหนักของ Criteria ในแต่ละฝั่ง (Group และ Individual) ให้เท่ากับ 100% ($\pm 0.01$) ก่อน Publish (FR-ASSIGN-02)
- ควบคุมการแก้ไข Criteria และ Roster (แก้ไขได้เฉพาะสถานะ `DRAFT`, หาก publish แล้วต้อง unpublish ก่อน) (FR-ASSIGN-03)
- จัดการ Deadline (ขยายเวลาได้ตลอดเวลา, ร่นเวลาเข้าได้เฉพาะเมื่อยังไม่ถึง deadline เดิม, จัดเก็บเป็น UTC) (FR-ASSIGN-04, FR-ASSIGN-05)
- Clone assignment จากชุดเดิม (FR-ASSIGN-06)
- จัดการกรณี `individual_max_score = 0` (ปิดการประเมินรายบุคคล) (FR-ASSIGN-07)

## NOT Responsible For
- สร้างชุดคู่ประเมิน pairwise comparison (หน้าที่ของ `pairing-engine`)
- คำนวณคะแนนผลลัพธ์ (หน้าที่ของ `scoring-engine`)

## Dependencies
- Depends on: `auth-identity`, `classroom-roster`
- Used by: `pairing-engine`, `evaluation-workflow`, `scoring-engine`, `reporting-export`, `audit-appeals`

## Key Business Rules
- ผลรวมน้ำหนัก Criteria ฝั่ง Group และฝั่ง Individual ต้องเท่ากับ 100.00% เท่านั้น (FR-ASSIGN-02)
- ไม่อนุญาตให้แก้ไขเกณฑ์หรือสมาชิกเมื่อสถานะไม่ใช่ `DRAFT` (FR-ASSIGN-03)
- การขยายหรือร่น Deadline ต้องบันทึกเป็น UTC เสมอ และห้ามร่นเวลาเมื่อเลย deadline เดิมไปแล้ว (FR-ASSIGN-04, FR-ASSIGN-05)
- เมื่อ `individual_max_score = 0` ระบบต้องข้ามการสร้าง pair ฝั่ง Individual ทั้งหมด (FR-ASSIGN-07)
- การ Reopen assignment จาก `FINALIZED` กลับเป็น `CLOSED` ต้องระบุเหตุผลและบันทึก Audit log (FR-AUDIT-01, §7.3)

## Key Stories
- [FR-ASSIGN-01..07]

## Bolt Type
[ ] DDD Construction — ถ้า domain logic ซับซ้อน
[x] Simple Construction — ถ้าเป็น UI, integration, utility
