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