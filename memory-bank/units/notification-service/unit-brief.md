# Unit: Notification Service

## Purpose
จัดการส่งการแจ้งเตือนทางอีเมลแก่นักศึกษาและอาจารย์ตามเหตุการณ์ในวงจรของ Assignment โดยคำนึงถึงความเป็นส่วนตัวและความปลอดภัยของข้อมูลคะแนน

## Responsibilities
- ส่งการแจ้งเตือนเมื่อ Assignment เปิดให้เข้าประเมิน (FR-NOTIF-01)
- ส่งการแจ้งเตือนเตือนความจำล่วงหน้า 48 ชั่วโมงก่อน Deadline แก่นักศึกษาที่ยังทำไม่ครบ (FR-NOTIF-02, FR-EVAL-10)
- ส่งการแจ้งเตือนเมื่อมีการ Re-generate คู่ประเมินแก่นักศึกษาที่ได้รับผลกระทบ (FR-NOTIF-03)
- ส่งการแจ้งเตือนเมื่อคะแนน Finalized แก่นักศึกษาทุกคน (FR-NOTIF-04)
- ส่งการแจ้งเตือนเมื่อได้รับมอบหมายให้ประเมินคู่เพิ่มเติม (Extra Evaluator) (FR-NOTIF-05)
- สร้างเนื้อหา Notification ที่มี Direct Link ไปยังหน้าที่ต้องทำ และไม่มีข้อมูลคะแนนของบุคคลใดอยู่ในเนื้อความ (FR-NOTIF-06, FR-PRIV-04)

## NOT Responsible For
- กำหนด Trigger เหตุการณ์หรือสถานะ Assignment (หน้าที่ของ `assignment-lifecycle` และ `pairing-engine`)
- แสดงผลคะแนนในระบบ (หน้าที่ของ `reporting-export`)

## Dependencies
- Depends on: `assignment-lifecycle`, `classroom-roster`, `auth-identity`
- Used by: `assignment-lifecycle`, `pairing-engine`, `scoring-engine`

## Key Business Rules
- **FR-NOTIF-06 / FR-PRIV-04:** ข้อความในการแจ้งเตือนทุกฉบับต้องมีลิงก์ตรงไปยังระบบ และ **ต้องไม่มีคะแนนหรือข้อมูลผลการประเมินของใครอยู่ในเนื้อความอีเมล** อย่างเด็ดขาด
- การแจ้งเตือนเตือนความจำ 48 ชม. ต้องส่งเฉพาะนักศึกษาที่สถานะการส่งยังไม่ครบถ้วนเท่านั้น (FR-NOTIF-02)
- ข้อมูลการส่งอีเมลต้องถูกบันทึกลงตาราง `notification` เพื่อการตรวจสอบสถานะ

## Key Stories
- [FR-NOTIF-01..06, FR-PRIV-04]

## Bolt Type
[ ] DDD Construction — ถ้า domain logic ซับซ้อน
[x] Simple Construction — ถ้าเป็น UI, integration, utility
