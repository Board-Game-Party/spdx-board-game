# Unit: Pairing Engine

## Purpose
คำนวณ Feasibility และจัดสรรคู่เปรียบเทียบ (Pair Allocation) สำหรับ Group และ Individual Evaluation อย่างสมดุล ปลอดอคติ และให้ผลลัพธ์ที่ Deterministic

## Responsibilities
- ตรวจสอบความพร้อมและความเป็นไปได้ทางคณิตศาสตร์ (Feasibility Check) ระหว่าง Workload ($k$) และ Coverage ($R$) (FR-PAIR-04, FR-PAIR-05, §8.2)
- ปรับลด Coverage เป้าหมายอัตโนมัติเมื่อเงื่อนไขไม่ผ่าน พร้อมอธิบายเหตุผลเป็นตัวเลข (FR-PAIR-05, §8.2)
- สร้างชุดคู่เปรียบเทียบฝั่ง Group Evaluation โดยห้ามผู้ประเมินได้คู่ที่มีกลุ่มตัวเอง (FR-PAIR-01, FR-PAIR-02, §8.4)
- สร้างชุดคู่เปรียบเทียบฝั่ง Individual Evaluation ภายในกลุ่ม โดยห้ามผู้ประเมินได้คู่ที่มีตัวเอง (FR-PAIR-03, §8.3)
- กำหนด Coverage รายบุคคลตามสูตร $m - 2$ และจัดการกรณีกลุ่มขนาดเล็ก ($m \le 2$ ปิด individual, $m=3$ flag `LOW_CONFIDENCE`) (FR-PAIR-12, FR-PAIR-13, §8.3)
- ควบคุม Invariants INV-1 ถึง INV-5 (Balanced coverage, ภาระงานเท่ากัน $\Delta \le 1$, ห้ามได้คู่เดิมซ้ำในเกณฑ์เดียวกัน, Deterministic ด้วย Seed) (FR-PAIR-06, FR-PAIR-07, FR-PAIR-09, §8.4)
- สุ่มสลับตำแหน่งการแสดงผลซ้าย-ขวาของแต่ละคู่ (Position randomization) (FR-PAIR-08)
- รองรับการมอบหมายคู่ประเมินเพิ่มเติม (Extra Evaluator Assignment) ตามคำสั่งของ Instructor (FR-PAIR-10)

## NOT Responsible For
- เก็บสถานะการตอบแบบประเมินและ Autosave (หน้าที่ของ `evaluation-workflow`)
- คำนวณคะแนน Quality Index (หน้าที่ของ `scoring-engine`)

## Dependencies
- Depends on: `classroom-roster`, `assignment-lifecycle`
- Used by: `evaluation-workflow`, `reporting-export`, `scoring-engine`

## Key Business Rules
- **INV-1:** ไม่มี evaluator คนใดได้รับ pair ที่มีตนเองหรือกลุ่มตนเอง
- **INV-2:** ไม่มี evaluator คนใดได้รับ pair เดิมซ้ำใน criterion เดียวกัน
- **INV-3:** Balanced coverage: $\max(\text{coverage}) - \min(\text{coverage}) \le 1$
- **INV-4:** Balanced workload: จำนวน pair ที่แต่ละคนได้รับต่างกันไม่เกิน 1
- **INV-5:** Determinism: เมื่อให้ Seed เดียวกันและข้อมูลนำเข้าชุดเดิม ต้องได้ชุดคู่เดิมทุกครั้ง
- กลุ่มขนาด $m \le 2$ คนต้องไม่มีการสร้างคู่ Individual Evaluation (FR-PAIR-12)
- หาก $C(m-1, 2) > k_{max}$ ต้องสุ่มเลือกคู่ตามเพดาน $k_{max}$ พร้อมรักษาสมดุลของ coverage (FR-PAIR-14)

## Key Stories
- [FR-PAIR-01..15, INV-1..5]

## Bolt Type
[x] DDD Construction — ถ้า domain logic ซับซ้อน
[ ] Simple Construction — ถ้าเป็น UI, integration, utility
