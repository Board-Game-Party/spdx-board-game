# Unit: Integrity & Quality Signals

## Purpose
วิเคราะห์และตรวจจับความผิดปกติในการประเมิน (Quality Signals & Anomaly Detection) เพื่อสร้างสัญญาณเตือนให้อาจารย์ตรวจสอบความสุจริตทางวิชาการ

## Responsibilities
- ตรวจจับสัญญาณ Low coverage (QS-01: จำนวน comparison < เกณฑ์)
- ตรวจจับสัญญาณ Straight-lining (QS-02: ผู้ประเมินเลือกค่าเดิมซ้ำกันเกิน 80%)
- ตรวจจับสัญญาณ Position bias (QS-03: ผู้ประเมินเลือกฝั่งเดียวเกิน 80%)
- ตรวจจับสัญญาณ Intransitivity cycles (QS-04: ตรวจพบวงกลม $A > B, B > C, C > A$ ในคำตอบของคนเดียวเกิน 20% ของ triple)
- ตรวจจับสัญญาณ Speed running (QS-05: เวลาเฉลี่ยต่อ comparison ต่ำกว่า 3 วินาที)
- ตรวจจับสัญญาณ Self-group favoritism ใน Individual evaluation (QS-06: ให้คะแนนเพื่อนสนิทสูงผิดปกติ $z > 2$)
- ตรวจวัดความสอดคล้องของผู้ประเมินในแต่ละเกณฑ์ (QS-07: Kendall's W Coefficient of Concordance $< 0.2$)
- สร้าง Quality Report รวบรวม Flag ทั้งหมดพร้อมคำแนะนำในการตรวจสอบ (FR-REPORT-04)
- สนับสนุนให้อาจารย์คัดกรองหรือทำเครื่องหมาย `EXCLUDED` ต่อผลประเมินที่ผิดปกติ (FR-QS-02)

## NOT Responsible For
- ตัดสิทธิ์หรือตัดคะแนนผู้ประเมินโดยอัตโนมัติ (สัญญาณเหล่านี้มีไว้ให้อาจารย์พิจารณาเท่านั้น) (FR-QS-01)
- คำนวณคะแนนขั้นสุดท้าย (หน้าที่ของ `scoring-engine`)

## Dependencies
- Depends on: `evaluation-workflow`, `assignment-lifecycle`, `pairing-engine`
- Used by: `reporting-export`, `scoring-engine`

## Key Business Rules
- **FR-QS-01:** ระบบต้องไม่ตัดสิทธิ์ ตัดคะแนน หรือลดน้ำหนักคำตอบโดยอัตโนมัติจากสัญญาณเหล่านี้ (ต้องให้อาจารย์เป็นผู้พิจารณา)
- **FR-QS-02:** หากอาจารย์ทำเครื่องหมาย `EXCLUDED` ใน comparison ใด ระบบต้องบันทึกเหตุผลและเรียกคำนวณคะแนนใหม่
- การตรวจ Intransitivity ต้องสร้างกราฟทิศทางของคู่เปรียบเทียบที่ evaluator คนนั้นตอบเพื่อหาวง 3-cycle ($A \to B \to C \to A$)
- เกณฑ์แจ้งเตือนเริ่มต้น: QS-01 (< 3), QS-02 (> 80%), QS-03 (> 80%), QS-04 (> 20%), QS-05 (< 3,000 ms), QS-07 ($W < 0.2$)

## Key Stories
- [QS-01..07, FR-QS-01..03, FR-REPORT-04]

## Bolt Type
[x] DDD Construction — ถ้า domain logic ซับซ้อน
[ ] Simple Construction — ถ้าเป็น UI, integration, utility
