# Unit: Classroom & Roster Management

## Purpose
จัดการข้อมูลห้องเรียน รายชื่อนักศึกษา การแบ่งกลุ่ม และการนำเข้าข้อมูล Roster ผ่านไฟล์ CSV แบบ Atomic

## Responsibilities
- สร้าง แก้ไข และ Archive ห้องเรียน (FR-CLASS-01, FR-CLASS-06, FR-CLASS-07)
- นำเข้ารายชื่อนักศึกษาและกลุ่มผ่าน CSV (`email`, `group_name`, `student_id`, `display_name`) แบบ Atomic validation (FR-CLASS-01, FR-CLASS-02)
- ตรวจสอบความถูกต้องของ Roster (อีเมลซ้ำ, รูปแบบผิด, group_name ว่าง, กลุ่ม < 2 คน) (FR-CLASS-03)
- สร้าง user สถานะ `PENDING` สำหรับผู้ใช้ใหม่ และ activate อัตโนมัติเมื่อ login (FR-CLASS-04)
- จัดการสมาชิกห้องเรียน (เพิ่ม/ลบ Co-teacher, TA) และป้องกันการลบ Owner คนสุดท้าย (FR-CLASS-06)
- รองรับ CSV Upsert พร้อมแสดง diff ก่อนยืนยัน (FR-CLASS-05)
- ป้องกัน CSV formula injection ในข้อมูลที่ import/export (FR-SEC-04)

## NOT Responsible For
- ตรวจสอบความพร้อมของกลุ่มในการจัดคู่ประเมิน (หน้าที่ของ `pairing-engine`)
- ยืนยันตัวตน Google Login (หน้าที่ของ `auth-identity`)

## Dependencies
- Depends on: `auth-identity`
- Used by: `assignment-lifecycle`, `pairing-engine`, `reporting-export`, `evaluation-workflow`

## Key Business Rules
- หากพบข้อผิดพลาดใน CSV แม้แต่แถวเดียว ต้อง reject ทั้งไฟล์ และรายงานตำแหน่งแถวที่ผิด (Atomic Import) (FR-CLASS-02)
- ขนาดกลุ่มต้องมีสมาชิกอย่างน้อย 2 คน และระบบควรเตือนหากอยู่นอกช่วง 4–7 คน (FR-CLASS-03, FR-PAIR-15)
- ไม่อนุญาตให้ลบ Owner คนสุดท้ายออกจากห้องเรียน (FR-CLASS-06)
- ห้องเรียนที่ถูก Archive ต้องอยู่ในสถานะ read-only (FR-CLASS-07)
- ทุก cell ที่ขึ้นต้นด้วย `=`, `+`, `-`, `@` ต้องถูก escape เพื่อป้องกัน Formula Injection (FR-SEC-04)

## Key Stories
- [FR-CLASS-01..07, FR-SEC-04]

## Bolt Type
[ ] DDD Construction — ถ้า domain logic ซับซ้อน
[x] Simple Construction — ถ้าเป็น UI, integration, utility
