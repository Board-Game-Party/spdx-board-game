# Unit: Reporting & Data Export

## Purpose
จัดทำรายงานสรุปคะแนนระดับกลุ่มและบุคคล รายงาน Coverage รายงานสัญญาณคุณภาพ พร้อมทั้งส่งออกข้อมูลในรูปแบบ CSV (UTF-8 with BOM) และ XLSX ภายใต้การควบคุม k-anonymity

## Responsibilities
- รายงาน Group Summary (กลุ่ม $\times$ criterion $\times$ $q$, comparison count, คะแนน, flag) (FR-REPORT-01)
- รายงาน Individual Summary (นักศึกษา $\times$ criterion $\times$ $q$, count, คะแนน, participation, คะแนนรวม, flag) (FR-REPORT-02)
- รายงาน Pair Coverage Report พร้อมปุ่มส่งประเมินเพิ่มและประเมินเองสำหรับ Instructor (FR-REPORT-03)
- รายงานความเห็นและกราฟการกระจายตัวของคะแนน (Score Distribution Chart) (FR-REPORT-05)
- มุมมองคะแนนสำหรับนักศึกษา: เห็นเฉพาะคะแนนกลุ่มตนเอง คะแนนตนเอง และ participation ของตนเองเท่านั้น (FR-REPORT-06)
- บังคับใช้ **k-anonymity threshold ($k_{min} \ge 3$):** ปิดบังคะแนนรายบุคคลจนกว่าจะมีผู้ส่งครบเกณฑ์ และไม่แสดงผลเปลี่ยนแปลงคะแนนรายวัน (FR-ANON-02, FR-ANON-03)
- ส่งออกข้อมูลเป็น CSV (UTF-8 with BOM เพื่อรองรับภาษาไทยใน Microsoft Excel) และ XLSX แบบ 4 sheets (FR-EXPORT-01, FR-EXPORT-02)
- ซ่อนตัวตนผู้ประเมินด้วย Pseudonymous ID ใน Raw comparison export เป็นค่าเริ่มต้น (FR-EXPORT-03)
- ควบคุมการ Export ที่มีตัวตนจริง ให้ทำได้เฉพาะ Owner พร้อมยืนยันเจตนาและบันทึก Audit log (FR-EXPORT-04, FR-AUDIT-01)
- ตั้งชื่อไฟล์ Export ตามรูปแบบมาตรฐาน: `{classroom_slug}_{assignment_slug}_{report}_{YYYYMMDD-HHmm}.{ext}` (FR-EXPORT-05)

## NOT Responsible For
- ยืนยันสิทธิ์ Role ของผู้ร้องขอ (หน้าที่ของ `auth-identity`)
- คำนวณ Quality Index ดิบ (หน้าที่ของ `scoring-engine`)

## Dependencies
- Depends on: `auth-identity`, `scoring-engine`, `integrity-quality`, `assignment-lifecycle`, `classroom-roster`
- Used by: Instructor Web Dashboard, Student Portal

## Key Business Rules
- **FR-ANON-01:** นักศึกษาต้องไม่มีทางเข้าถึงข้อมูลว่าใครเป็นผู้ประเมินตน ไม่ว่าจะผ่านทาง UI, API หรือการ Export
- **FR-ANON-02:** คะแนน Individual จะไม่แสดงต่อนักศึกษาจนกว่าจะมี Comparison ที่ส่งแล้ว $\ge 3$ ครั้ง
- **FR-ANON-03:** ห้ามแสดงผลต่างคะแนนรายวัน (Delta) เพื่อป้องกันการแกะรอยผู้ประเมิน
- **FR-EXPORT-04:** การ Export ที่มีตัวตนจริงของผู้ประเมิน อนุญาตเฉพาะบทบาท Owner เท่านั้น และต้องบันทึก Audit log ทุกครั้ง
- ไฟล์ CSV ทุกไฟล์ต้องมี UTF-8 BOM (`\xef\xbb\xbf`) นำหน้าเพื่อให้โปรแกรม Microsoft Excel ภาษาไทยแสดงผลถูกต้อง

## Key Stories
- [FR-REPORT-01..06, FR-EXPORT-01..06, FR-ANON-01..05]

## Bolt Type
[ ] DDD Construction — ถ้า domain logic ซับซ้อน
[x] Simple Construction — ถ้าเป็น UI, integration, utility
