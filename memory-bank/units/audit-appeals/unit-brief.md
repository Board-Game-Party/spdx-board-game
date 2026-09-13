# Unit: Audit & Appeals Management

## Purpose
จัดเก็บบันทึกประวัติการกระทำสำคัญของระบบแบบ Append-only (Audit Log) และจัดการกระบวนการยื่นและพิจารณาคำร้องอุทธรณ์คะแนน (Score Appeals & Overrides)

## Responsibilities
- บันทึก Audit Log แบบ Append-only สำหรับเหตุการณ์สำคัญ (Publish/Unpublish, Pair regen, Score override, Finalize/Reopen, Identifiable export, Role change) (FR-AUDIT-01, AR-03)
- บันทึกข้อมูลบริบทครบถ้วนใน Audit Record (Actor, Action, Resource, Before/After JSON, UTC Timestamp, IP Address, Reason) (FR-AUDIT-02)
- ป้องกันการแก้ไขหรือลบ Audit Record (Immutable log, ไม่มี Delete/Update API) (FR-AUDIT-03)
- รองรับการ Override คะแนนรายบุคคลหรือรายกลุ่มโดย Instructor พร้อมบังคับกรอกเหตุผล (FR-SCORE-08, DR-03)
- ระบบรับคำร้องอุทธรณ์คะแนนจากนักศึกษาภายใน 7 วันหลัง Finalize (FR-APPEAL-01)
- หน้าจอสำหรับ Instructor ในการพิจารณา ตอบกลับ และดำเนินการ Override หรือยืนยันคะแนนเดิม (FR-APPEAL-02)
- ปฏิบัติตามข้อกำหนด PDPA ในการจัดการข้อมูลส่วนบุคคลและการเก็บรักษา (FR-PRIV-01..03)

## NOT Responsible For
- คำนวณ Quality Index หรือ Band Mapping อัตโนมัติ (หน้าที่ของ `scoring-engine`)
- ตรวจสอบสิทธิ์การเข้าถึงทั่วไป (หน้าที่ของ `auth-identity`)

## Dependencies
- Depends on: `auth-identity`, `assignment-lifecycle`, `scoring-engine`
- Used by: ทุก unit ที่ต้องการบันทึก Audit Trail

## Key Business Rules
- **AR-03 / FR-AUDIT-03:** Audit Log ต้องเป็น Append-only ห้ามมี API หรือฟังก์ชันในการแก้ไขหรือลบ
- **FR-SCORE-08:** การแก้ไขคะแนน (Score Override) โดย Instructor ต้องบังคับระบุเหตุผล (Reason) เสมอ
- **FR-APPEAL-01:** นักศึกษาสามารถยื่นอุทธรณ์ได้เฉพาะภายใน 7 วันหลังสถานะ Assignment เปลี่ยนเป็น `FINALIZED`
- **DR-03:** `computed_score` ที่ finalized แล้วถือเป็น Immutable การเปลี่ยนแปลงต้องผ่านตาราง `score_override` เท่านั้น
- **FR-PRIV-02:** เมื่อพ้นระยะเวลาจัดเก็บตาม PDPA (2 ปีการศึกษา) ต้องใช้วิธี Anonymize แทนการลบข้อมูลเชิงสถิติ

## Key Stories
- [FR-AUDIT-01..03, FR-APPEAL-01..02, FR-SCORE-08, FR-PRIV-01..03]

## Bolt Type
[ ] DDD Construction — ถ้า domain logic ซับซ้อน
[x] Simple Construction — ถ้าเป็น UI, integration, utility
