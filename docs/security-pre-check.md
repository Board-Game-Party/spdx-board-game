# Security Pre-Check

## GitHub Security Features
| Feature | สถานะ | จำนวน alert |
|---|---|---|
| Dependabot alerts | เปิด | 7 |
| Secret scanning | เปิด | 0|
| Code scanning (CodeQL) | เปิด | 0|

## Alerts ที่พบ
| # | ประเภท | Severity | ไฟล์ | จะแก้/ไม่แก้ + เหตุผล |
|---|---|---|---|---|
| #1 | Arbitrary File Read / Execution (`vitest`) | Critical | `frontend/package-lock.json` | **แก้** - ความรุนแรงระดับ Critical เสี่ยงถูกอ่านและรันไฟล์ในเครื่องนักพัฒนา และมี PR #48 พร้อมอัปเดตแก้ไขแล้ว |
| #6 | Prototype Pollution to RCE (`tinypool`) | Critical | `frontend/package-lock.json` | **แก้** - ความรุนแรงระดับ Critical เสี่ยงเกิด Remote Code Execution แก้ไขได้โดยการอัปเดตแพ็กเกจ test (`vitest`) |
| #5 | Prototype Pollution to RCE (`tinypool`) | Critical | `frontend/package-lock.json` | **แก้** - ความรุนแรงระดับ Critical เสี่ยงเกิด RCE แก้ไขได้พร้อมกับการอัปเดต `vitest` |
| #8 | Denial of Service (`source-map-js`) | High | `frontend/package-lock.json` | **แก้** - ความรุนแรงระดับ High เสี่ยงทำให้เกิด DoS และอัปเดตแก้ไขได้ง่ายผ่าน `npm audit fix` |
| #3 | Path Traversal / Arbitrary File Read (`vitest`) | Moderate | `frontend/package-lock.json` | **แก้** - เป็น Direct dependency ที่มี PR #48 เปิดรอไว้แล้ว สามารถกด Merge เพื่อแก้ไขพร้อมกับ #1 ได้เลย |
| #2 | Path Traversal / Arbitrary File Read (`@vitest/mocker`) | Moderate | `frontend/package-lock.json` | **แก้** - เป็น Dependency ย่อยของ `vitest` ซึ่งจะถูกอัปเดตแก้ไขโดยอัตโนมัติเมื่อแก้รายการ #1 และ #3 |
| #7 | CPU Exhaustion (`postcss-selector-parser`) | Moderate | `frontend/package-lock.json` | **ไม่แก้** - อยู่ในส่วน `Development` และความรุนแรงระดับ Moderate มีผลเฉพาะตอนแปลงไฟล์ CSS ไม่กระทบต่อระบบ Production |
## Secret ใน git history
[พบ/ไม่พบ — ถ้าพบ revoke แล้วหรือยัง]
ไม่พบ

## OWASP Top 10 ข้อที่เกี่ยวกับ project นี้มากที่สุด 3 ข้อ
1. **A06:2021 - Vulnerable and Outdated Components:** เกี่ยวข้องโดยตรงกับทุก Alert ที่พบ เนื่องจากปัญหาทั้งหมดเกิดจากการใช้ npm packages (`vitest`, `tinypool`, `source-map-js`, `postcss-selector-parser`) เวอร์ชันเก่าที่มีช่องโหว่ใน `frontend/package-lock.json`
2. **A01:2021 - Broken Access Control:** เกี่ยวข้องกับ Alert #1, #2 และ #3 (`vitest`, `@vitest/mocker`) ที่มีช่องโหว่ Path Traversal และ Arbitrary File Read ทำให้ผู้โจมตีสามารถเข้าถึงและอ่านไฟล์นอกเหนือจากสิทธิ์ที่กำหนดไว้ได้
3. **A03:2021 - Injection (และ A08:2021 - Software and Data Integrity Failures):** เกี่ยวข้องกับ Alert #5 และ #6 (`tinypool`) ที่เกิดช่องโหว่ Prototype Pollution ทำให้ผู้โจมตีสามารถดัดแปลงโครงสร้าง Object และแทรกคำสั่งเพื่อทำ Remote Code Execution (RCE) ได้

## Security Checklist (WS-08)
- [x] Query ทุกที่ใช้ parameterized ไม่มี string concatenation (ใช้ SQLAlchemy ORM filter ทั้งระบบ)
- [x] ทุก endpoint ที่แก้/ลบข้อมูล ตรวจ **ownership** ไม่ใช่แค่ login (ตรวจสิทธิ์ระดับ Classroom / Assignment / Comparison)
- [x] Response ไม่ส่ง field ที่ไม่ควรออก (`password_hash`, internal id) (กำหนด Pydantic `response_model` ทุก endpoint)
- [x] Error response ไม่มี stack trace หรือ connection string
- [x] `/api/test/seed` และ `/api/test/cleanup` ปิดใน production แล้ว (เปิดเฉพาะเมื่อ `NODE_ENV` เป็น `development` หรือ `test` ใน `backend/app/main.py:72`)
- [x] Log ไม่มี email / token / password (ใช้ `RedactingProcessor` ใน `backend/app/core/logging.py:37`)
- [x] Dependabot alerts ที่ severity High/Critical จัดการแล้วหรือมีเหตุผลว่าทำไมยัง
- [x] ไม่มี secret ใน git history — ถ้ามี revoke แล้ว

## Fixed in WS-08
| ปัญหา | ไฟล์ | วิธีแก้ | test ที่คุ้มครองไม่ให้กลับมา |
|---|---|---|---|
| Dependabot Alerts #1, #2, #3: Arbitrary File Read / Execution และ Path Traversal ใน `vitest` และ `@vitest/mocker` (Critical / Moderate) | `frontend/package.json`, `frontend/package-lock.json` | อัปเดตเวอร์ชัน `vitest` และ `@vitest/mocker` จาก `3.0.5` เป็น `4.1.11` | `backend/tests/test_security_ws08.py::test_vitest_and_mocker_patched_versions` |
| Dependabot Alerts #5, #6: Prototype Pollution to RCE ใน `tinypool` (Critical) | `frontend/package-lock.json` | อัปเดต `vitest` เป็น `4.1.11` ซึ่งถอดแพ็กเกจ `tinypool@1.1.1` ที่มีช่องโหว่ออกจาก dependency tree | `backend/tests/test_security_ws08.py::test_tinypool_vulnerable_package_removed` |
| Broken Access Control (Missing Ownership Check) ในการสั่งยกเว้นผลเปรียบเทียบ (`exclude_comparison`) ข้ามงานมอบหมาย | `backend/app/features/integrity/detector.py` | เพิ่มการ `join(PairAssignment)` และตรวจเงื่อนไข `PairAssignment.assignment_id == assignment.id` ก่อนอนุญาตให้เปลี่ยนสถานะเป็น `EXCLUDED` | `backend/tests/test_security_ws08.py::test_exclude_comparison_enforces_assignment_ownership` |