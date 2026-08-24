# Intent: Campus Pairwise Comparison Service

## Intent Statement
พัฒนาระบบประเมินผลงานกลุ่มและรายบุคคลของนักศึกษาในระดับอุดมศึกษาด้วยวิธี Pairwise Comparison (PairEval) เพื่อลดอคติจากการให้คะแนนเดี่ยว (Absolute scoring bias) และปัญหาคะแนนเฟ้อ (Peer rating inflation) พร้อมทั้งแยกแยะผลงานรายบุคคลเพื่อแก้ปัญหา Free-rider ได้อย่างโปร่งใส มีหลักฐานเชิงประจักษ์ และใช้เวลาประเมินไม่เกิน 15 นาทีต่องาน

## Business Context
- **Problem:**
  - **Absolute scoring bias:** อาจารย์มีอคติในการให้คะแนนเดี่ยวตามลำดับการตรวจ และมัก anchor กับงานที่เพิ่งตรวจไป
  - **Free-rider problem:** สมาชิกที่ไม่ทำงานได้คะแนนเท่ากับคนที่ทำงานจริงเนื่องจากคะแนนผูกติดกับกลุ่ม
  - **Peer rating inflation:** เมื่อให้นักศึกษาให้คะแนนเพื่อนเป็นตัวเลขเดี่ยว ส่วนใหญ่ให้คะแนนเต็มทั้งหมด ทำให้แยกแยะความแตกต่างไม่ได้
- **Users:**
  - **Instructor (Owner & Co-teacher):** กำหนด assignment, ตรวจสอบรายงานคุณภาพ/ความผิดปกติ, override คะแนน และ finalize ผลคะแนน
  - **Teaching Assistant (TA):** นำเข้ารายชื่อนักศึกษา (Roster) และช่วยดูแลภาพรวมของ classroom
  - **Student:** ส่งผลงาน (Artifact URL) และทำแบบประเมินเปรียบเทียบคู่ทั้งระดับกลุ่ม (Group) และระดับบุคคล (Individual) พร้อมดูคะแนนของตนเอง
- **Value:**
  - การเปรียบเทียบคู่ ("A หรือ B ดีกว่า") มีความแม่นยำและสม่ำเสมอกว่าการให้คะแนนเดี่ยว
  - มีหลักฐานเชิงประจักษ์ในการแยกแยะคะแนนรายบุคคลภายในกลุ่มอย่างเป็นธรรม
  - ปกป้องความเป็นส่วนตัว (Anonymity / k-anonymity) ช่วยให้นักศึกษากล้าประเมินตามความเป็นจริง
  - อาจารย์สามารถตรวจสอบ (Audit log) และควบคุมคะแนนได้ทุกขั้นตอนโดยระบบไม่ตัดเกรดอัตโนมัติ

## Success Criteria
- [ ] **Participation Rate:** สัดส่วนนักศึกษาที่ส่งผลการประเมินครบตามที่ได้รับมอบหมาย $\ge 90\%$
- [ ] **Median Time-on-task:** เวลาเฉลี่ยที่นักศึกษาใช้ทำแบบประเมินต่อ assignment $\le 15$ นาที
- [ ] **Score Dispersion:** ค่าเบี่ยงเบนมาตรฐาน (SD) ของคะแนนรายบุคคลภายในกลุ่ม $\ge 0.5$ คะแนน (จากเต็ม 5)
- [ ] **Instructor Override Rate:** สัดส่วนคะแนนที่อาจารย์ต้องแก้ไขด้วยมือ $\le 5\%$
- [ ] **Dispute Rate:** อัตราคำร้องอุทธรณ์คะแนนจากนักศึกษา $\le 3\%$ ของจำนวนนักศึกษาทั้งหมด
- [ ] **Low-confidence Items:** Item ที่ได้รับผลการเปรียบเทียบคู่น้อยกว่าเกณฑ์ (น้อยกว่า 3 ครั้ง) $\le 5\%$

## Decisions Already Made
- **6-Point Forced Choice Scale (D1):** ใช้สเกล 6 ระดับ (1–6) โดยไม่มีตัวเลือกกลาง ("เท่ากัน") เพื่อป้องกัน Central tendency bias
- **Band Mapping for Scoring (D2):** แปลงค่า Quality Index ($q$) เป็นคะแนนด้วย Band mapping (Default floor 60%, ceiling 100%) ไม่ normalize ผลรวมให้เท่ากับ 1 เพื่อให้คะแนนสะท้อนคุณภาพจริง
- **Mathematical Feasibility & Dynamic Coverage (D3):** คำนวณ Workload ($k$) และ Coverage ($R$) เชื่อมโยงกัน โดยระบบตรวจ Feasibility ก่อน publish และปรับลด $R$ อัตโนมัติพร้อมแจ้งเหตุผลเป็นตัวเลขหากเกินขีดจำกัด
- **Individual Coverage Formula (D4):** กำหนด Coverage รายบุคคลสูงสุดเท่ากับ $m - 2$ ตามขนาดกลุ่ม $m$ (กลุ่ม $\le 2$ คนไม่มี individual eval, กลุ่ม 3 คน flag `LOW_CONFIDENCE`)
- **Separated Participation Multiplier (D5):** แยกคะแนนคุณภาพผลงานออกจากตัวคูณการมีส่วนร่วม ($M$) โดยการไม่ประเมินของสมาชิกคนใดคนหนึ่งจะไม่ฉุดคะแนนของกลุ่ม
- **Instructor Weight as Weighted Mean (D6):** กำหนดน้ำหนักของอาจารย์เป็น float ในสูตร Weighted mean ไม่ใช่วิธีนับคะแนนซ้ำ (Duplicate votes)
- **k-anonymity & Privacy Protection (D7):** ซ่อนคะแนนรายบุคคลจนกว่าจะมีผู้ส่งประเมิน $\ge 3$ คน ($k_{min}$) และไม่แสดงผลการเปลี่ยนแปลงคะแนนรายวันเพื่อป้องกันการแกะรอยผู้ประเมิน
- **Randomized Left/Right Item Presentation (D8):** สลับตำแหน่งแสดงผลซ้าย-ขวาแบบสุ่มในทุก pair เพื่อลด Position bias
- **Pure Function Scoring Engine (AR-01, FR-SCORE-10):** คำนวณคะแนนแบบ Pure function ไม่เก็บ state ภายใน ให้ผลลัพธ์เดิมทุกครั้ง (Reproducible)
- **Append-only Audit Logging (AR-03, FR-AUDIT-01..03):** บันทึก audit trail ทุกการกระทำสำคัญแบบ Immutable
- **Google OAuth 2.0 / OIDC Authentication (FR-AUTH-01..03):** ยืนยันตัวตนด้วย Google Account มหาวิทยาลัย (Hosted domain restriction) และ Normalize อีเมลเพื่อจับคู่กับ Roster

## Out of Scope
- ไม่รวมการเชื่อมต่อ LMS เต็มรูปแบบ (เช่น LTI 1.3) ใน v1.0 — ใช้นำเข้า/ส่งออกผ่าน CSV / XLSX
- ไม่พัฒนา Native Mobile App — ใช้งานผ่าน Responsive Web (Mobile-first)
- ไม่ทำการตัดเกรดตัวอักษร (Letter Grade A–F) — ส่งออกเฉพาะคะแนนดิบและคะแนนรวมให้อาจารย์นำไปตัดเกรดเอง
- ไม่รองรับระบบหลายภาษา (Multi-language UI) ใน v1.0 — พัฒนา UI ภาษาไทยเป็นหลัก
- ไม่ใช้แบบจำลองทางสถิติซับซ้อน (เช่น Bradley–Terry, Elo, TrueSkill, z-score) ใน v1.0 เพื่อความโปร่งใสและอธิบายสูตรได้ชัดเจน
- ไม่ทำ Rubric-based absolute scoring หรือ Rubric attachment ต่อ criteria
- ไม่ทำระบบส่งไฟล์งานหลัก (Assignment Submission) — ให้อาจารย์ใส่ Artifact Link/URL ให้อ้างอิง
- ไม่รองรับการประเมินข้าม Classroom

