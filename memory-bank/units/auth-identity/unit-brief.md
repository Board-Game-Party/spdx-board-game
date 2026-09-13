# Unit: Auth & Identity

## Purpose
จัดการการยืนยันตัวตน (Authentication) ผ่าน Google OAuth 2.0 / OIDC และการควบคุมสิทธิ์การเข้าถึง (Authorization) ตาม Role และ Classroom scope

## Responsibilities
- Login ผ่าน Google OAuth 2.0 / OIDC และจัดการ session (FR-AUTH-01, FR-AUTH-04)
- ตรวจสอบ hosted domain (`hd`) ตามที่อนุญาตของแต่ละ classroom (FR-AUTH-02)
- จับคู่ผู้ใช้กับ Roster ด้วย Email ที่ผ่านการ Normalize (lowercase, ลบ dot ใน gmail, ลบ `+tag`) (FR-AUTH-03)
- บังคับใช้ Role Permission Matrix ฝั่ง Server-side (Owner, Co-teacher, TA, Student) (FR-AUTHZ-01)
- ตรวจสอบ Resource isolation ระดับ Classroom และตอบกลับ 404 เมื่อข้าม Classroom (FR-AUTHZ-02)
- รองรับ Multi-role (ผู้ใช้คนเดียวเป็น Instructor ในวิชาหนึ่ง และเป็น Student ในอีกวิชาได้) (FR-AUTHZ-03)

## NOT Responsible For
- จัดการข้อมูลรายชื่อนักศึกษาและกลุ่ม (หน้าที่ของ `classroom-roster`)
- บันทึกประวัติการเข้าถึงข้อมูลตัวตน (หน้าที่ของ `audit-appeals`)

## Dependencies
- Depends on: None (Base authentication & authorization infrastructure)
- Used by: ทุก unit (`classroom-roster`, `assignment-lifecycle`, `pairing-engine`, `evaluation-workflow`, `scoring-engine`, `reporting-export`, `audit-appeals`)

## Key Business Rules
- ผู้ใช้ที่ยังไม่ login ต้องถูก redirect ไปหน้า Google consent (FR-AUTH-01)
- อีเมลนอก domain ที่ classroom กำหนดต้องถูกปฏิเสธการเข้าถึง (FR-AUTH-02)
- `Somchai.A+test@uni.ac.th` และ `somchaia@uni.ac.th` ต้องถือเป็นผู้ใช้คนเดียวกัน (FR-AUTH-03)
- Session มีอายุ 12 ชั่วโมง และต้อง refresh ได้อัตโนมัติ (FR-AUTH-04)
- Student เรียก endpoint ที่สงวนไว้สำหรับ Instructor ต้องได้ 403 Forbidden เสมอ (FR-AUTHZ-01)
- การเข้าถึง Resource ของ classroom อื่น ต้องคืนค่า 404 Not Found เท่านั้น (ห้ามคืน 403 เพื่อไม่ให้รั่วไหลว่า resource มีอยู่จริง) (FR-AUTHZ-02)

## Key Stories
- [FR-AUTH-01..04, FR-AUTHZ-01..03]

## Bolt Type
[ ] DDD Construction — ถ้า domain logic ซับซ้อน
[x] Simple Construction — ถ้าเป็น UI, integration, utility
