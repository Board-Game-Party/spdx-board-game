# Unit: Scoring Engine

## Purpose
คำนวณคะแนนจากผลการเปรียบเทียบคู่แบบ Pure Function โดยสังเคราะห์ Quality Index ($q$), แปลงคะแนนด้วย Band Mapping, และคำนวณ Participation Multiplier ($M$)

## Responsibilities
- แปลงตัวเลือก 1–6 เป็นคะแนน $s_{left}, s_{right}$ ตามสเกล (§9.1)
- คำนวณ Quality Index $q(i, c)$ ต่อ Item ในแต่ละ Criterion ด้วย Weighted Mean ถ่วงน้ำหนัก Instructor Weight ($w_e$) (FR-SCORE-01, FR-SCORE-03, §9.2)
- แปลง $q$ เป็นคะแนนด้วย Band Mapping ตาม `score_floor` (default 60%) และ `score_ceiling` (default 100%) (FR-SCORE-02, §9.3)
- คำนวณคะแนนถ่วงน้ำหนักตาม Criteria และรวมคะแนน Component รายกลุ่มและรายบุคคล (§9.3)
- คำนวณ Participation Ratio ($p$) และ Participation Multiplier ($M$) แยกต่างหากจากคะแนนผลงาน (FR-SCORE-04, FR-SCORE-11, §9.4)
- ตรวจสอบและติด Flag `LOW_CONFIDENCE` สำหรับ Item ที่มีจำนวน Comparison $< min\_comparisons$ (FR-SCORE-05)
- คำนวณ Interim Score แบบตามรอบ (Scheduled) และแบบ On-demand (FR-SCORE-06)
- จัดทำ Snapshot ข้อมูล Input/Output เมื่อทำการ Finalize เพื่อความสามารถในการ Audit ย้อนหลัง (FR-SCORE-09)
- รองรับการทำ Golden Test ตาม Worked Example ใน PRD (§9.5) เพื่อการันตีความถูกต้อง

## NOT Responsible For
- จัดการแก้ไขคะแนนแบบ Override ด้วยมือ (หน้าที่ของ `audit-appeals`)
- ตรวจจับพฤติกรรมผิดปกติในการประเมิน (หน้าที่ของ `integrity-quality`)

## Dependencies
- Depends on: `assignment-lifecycle`, `pairing-engine`, `evaluation-workflow`
- Used by: `reporting-export`, `audit-appeals`

## Key Business Rules
- **AR-01 / FR-SCORE-10:** Scoring Engine ต้องเป็น Pure Function รันซ้ำด้วยข้อมูลเดิมต้องได้ผลลัพธ์เดิมทุกหลักทศนิยม (Deterministic & Reproducible)
- **DR-01:** นำเฉพาะคำตอบที่มีสถานะ `SUBMITTED` เท่านั้นมาคำนวณ
- **DR-04:** คำนวณและจัดเก็บค่าคะแนนด้วยชนิดข้อมูล `numeric` (Fixed-point arithmetic) เพื่อป้องกัน Floating-point precision error
- **FR-SCORE-11:** ตัวคูณการมีส่วนร่วม ($M$) มีผลเฉพาะคะแนนส่วนบุคคลของบุคคลนั้นเท่านั้น ห้ามลดคะแนนของกลุ่ม
- Worked Example Golden Test: ผลการคำนวณกลุ่ม Aurora (12.798/15), นก (4.130/5, Final 16.93/20), ต้น ($M=0.667$, Final 10.97/20) ต้องถูกต้องตรงกัน 100% (§9.5)

## Key Stories
- [FR-SCORE-01..13, AR-01, §9.1..9.5]

## Bolt Type
[x] DDD Construction — ถ้า domain logic ซับซ้อน
[ ] Simple Construction — ถ้าเป็น UI, integration, utility
