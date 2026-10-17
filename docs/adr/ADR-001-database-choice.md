# ADR-001: Use PostgreSQL as the Primary Relational Database for PairEval

## Status
Accepted

## Date
2026-08-24 (Recorded retrospectively in WS-08 on 2026-10-17)

## Context
ระบบ **PairEval (Campus Pairwise Evaluation Service)** เป็นระบบประเมินผลงานกลุ่มและรายบุคคลของนักศึกษาในระดับอุดมศึกษาด้วยวิธีเปรียบเทียบคู่ (Pairwise Comparison) เพื่อแก้ปัญหาคะแนนเฟ้อ (Peer rating inflation) และปัญหา Free-rider ภายในกลุ่ม โดยมีข้อจำกัดและบริบทสำคัญดังนี้:

1. **ความซับซ้อนและความสัมพันธ์ของข้อมูลเชิงโครงสร้าง (Relational & Transactional Integrity):**
   - ข้อมูลในระบบมีความสัมพันธ์แบบหลายระดับที่ต้องอ้างอิงกันอย่างเคร่งครัด ได้แก่ `User` $\leftrightarrow$ `ClassroomMember` $\leftrightarrow$ `Classroom` / `GroupEntity`, `Assignment` $\leftrightarrow$ `Criterion`, การจับคู่ `PairAssignment` $\leftrightarrow$ `Comparison` $\leftrightarrow$ `ComparisonRevision`, รวมถึงผลลัพธ์การคำนวณคะแนน `ComputedScore`, `ScoreOverride`, `Appeal` และ `AuditEvent` แบบ Append-only
   - มีฟีเจอร์ที่ต้องการ **ACID Transaction แบบ Atomic** เช่น การนำเข้ารายชื่อนักศึกษาผ่านไฟล์ CSV (`UPSERT` / `REPLACE` mode) ที่ต้อง Rollback ทั้งก้อนหากพบข้อมูลผิดพลาด และการ Publish งานที่ต้องสร้างคู่ประเมินทั้งหมดพร้อมกันในธุรกรรมเดียว
2. **ลักษณะการใช้งานพร้อมกันในคาบเรียน (Concurrent Classroom Workload):**
   - ในการใช้งานจริง อาจารย์มักเปิดให้นักศึกษาทั้งเซกชัน (เช่น 40–150 คน) กดทำแบบประเมินเปรียบเทียบคู่พร้อมกันในเวลาจำกัด ($\le 15$ นาที) โดย Frontend มีระบบ **Autosave Draft ทุก $\le 2$ วินาที** (`POST /api/evaluations/draft` และ `draft:batch`) ทำให้เกิด Concurrent Writes จำนวนมากในเวลาเดียวกัน
3. **ข้อจำกัดด้านเวลา ทักษะของทีม และแพลตฟอร์ม (Team & Platform Constraints):**
   - ทีมพัฒนาประกอบด้วยนักศึกษา 5 คน ใช้เวลาพัฒนาภายใน 1 ภาคการศึกษา
   - Backend กำหนดใช้ **Python 3.12 + FastAPI + SQLAlchemy 2.0 ORM** ([tech-stack.md](file:///home/ptok/Documents/spdx-Project/spdx-board-game/memory-bank/standards/tech-stack.md))
   - ต้องรันได้ทั้งในสภาพแวดล้อมการพัฒนา/ทดสอบด้วย **Docker Compose** (`compose.yaml`, `compose.test.yaml`) และ Deploy บน Cloud PaaS (**Render**) ร่วมกับ Frontend บน **Vercel**

## Decision
เลือกใช้ **PostgreSQL** (รันผ่าน `postgres:17-alpine` ใน Docker สำหรับ Dev/CI และ Managed PostgreSQL บน Render สำหรับ Staging/Production) เป็นฐานข้อมูลหลักเพียงตัวเดียวของระบบ โดยเชื่อมต่อผ่าน **SQLAlchemy 2.0 (`psycopg2-binary`)**

## Alternatives Considered

1. **SQLite** — ไม่เลือกสำหรับ Staging/Production เพราะ:
   - ใช้การล็อกระดับไฟล์ (Database-level write lock) เมื่อมีนักศึกษาหลายสิบคนส่งคำขอ Autosave Draft (`Comparison`) และ Submit พร้อมกันในห้องเรียน จะเกิดปัญหา `database is locked` และคอขวดในการเขียนข้อมูลพร้อมกัน (Concurrent writes)
   - บนแพลตฟอร์ม PaaS อย่าง Render ระบบไฟล์ของ Container เป็นแบบ Ephemeral (ข้อมูลหายเมื่อ Redeploy หรือ Restart) หากไม่ผูก Persistent Disk แยกต่างหาก
   - พฤติกรรมการบังคับใช้ Foreign Key และชนิดข้อมูล `Numeric` / `DateTime(timezone=True)` ไม่เข้มงวดเท่า PostgreSQL ซึ่งเสี่ยงทำให้ข้อมูลคะแนนคลาดเคลื่อน

2. **MongoDB (Document / NoSQL Database)** — ไม่เลือกเพราะ:
   - โมเดลข้อมูลของ PairEval มีความสัมพันธ์เชื่อมโยงข้ามตารางสูงมาก (เช่น การตรวจสอบ Invariants `INV-1..5` ตอนจับคู่ต้องเช็คทั้ง `GroupEntity`, `ClassroomMember`, `Criterion` และ `PairAssignment` ส่วนการคิดคะแนนต้อง Join `Comparison` กับ `PairAssignment` และ `ClassroomMember`) หากใช้ Document Database จะต้องทำ `$lookup` ซับซ้อนหรือทำ Data Denormalization ที่เสี่ยงต่อข้อมูลไม่สอดคล้องกันเวลาอาจารย์ย้ายกลุ่มนักศึกษา
   - ขาดการบังคับใช้ Foreign Key Constraints และ Unique Constraints ระดับ Schema ที่เข้มงวดเท่า RDBMS สำหรับระบบที่มีผลต่อเกรดของนักศึกษาและต้องมี Audit Trail ที่ตรวจสอบย้อนหลังได้
   - ทีมคุ้นเคยกับ SQL และ SQLAlchemy ORM ในระบบ FastAPI มากกว่าการดูแลรักษา ODM (เช่น Motor / Beanie)

3. **MySQL / MariaDB** — ไม่เลือกเพราะ:
   - แม้จะเป็น RDBMS ที่รองรับ ACID เช่นกัน แต่ PostgreSQL รองรับการทำงานร่วมกับ FastAPI + SQLAlchemy 2.0, ชนิดข้อมูล `DateTime(timezone=True)` และการทำ Transactional DDL (รวมถึงการจำลองฐานข้อมูลทดสอบด้วย `tmpfs` ใน `postgres:17-alpine`) ได้ตรงตามมาตรฐานของระบบบน Render มากกว่า โดยที่ Render มีบริการ Managed PostgreSQL ให้ใช้งานได้ทันทีในแพลตฟอร์มเดียวกับ Backend

## Consequences

### Positive
- **รับประกันความถูกต้องของข้อมูลคะแนนและการจับคู่ (Data Integrity):** Foreign Key, Cascade Delete, และ Unique Constraints (เช่น `(classroom_id, slug)`, `(assignment_id, criterion_id, evaluator_user_id, item_a_id, item_b_id)`) ถูกบังคับใช้ที่ระดับฐานข้อมูล ป้องกันข้อมูลซ้ำหรือข้อมูลกำพร้า
- **รองรับ Concurrent Autosave ได้ดีด้วย MVCC:** ระบบ Multi-Version Concurrency Control (MVCC) ของ PostgreSQL ช่วยให้นักศึกษาทั้งห้องสามารถกดเลือกคำตอบและ Autosave พร้อมกันได้โดยที่การอ่านรายงานของอาจารย์ไม่บล็อกการเขียนของนักศึกษา
- **สภาพแวดล้อม Dev / Test / Prod เหมือนกัน 100% (Dev-Prod Parity):** การใช้ `postgres:17-alpine` บน `tmpfs` ใน `compose.test.yaml` ทำให้ Unit Test, Integration Test และ E2E Test รันบน Engine เดียวกับ Production จริง ไม่เจอปัญหาเทสผ่านบน SQLite แต่พังบน PostgreSQL
- **รองรับการเก็บข้อมูลกึ่งโครงสร้างควบคู่กับ Relational:** สามารถเก็บข้อมูล `before_json` / `after_json` ของ `AuditEvent` และ `payload_json` ของ `Notification` ไว้ในฐานข้อมูลเดียวกันได้โดยไม่ต้องตั้งฐานข้อมูลแยก

### Negative / Trade-offs
- **ใช้ทรัพยากรในการรัน Local & CI มากกว่า SQLite:** การรัน Unit Test และ E2E Test ต้องสตาร์ท Container `test-db` (`postgres:17-alpine`) และรอ Healthcheck (`pg_isready`) ก่อนรันเทส ทำให้ใช้เวลาเตรียม Container ประมาณ 2–3 วินาที
- **ต้องระวังเรื่อง Connection Pooling และการจัดการ Session:** ในสถาปัตยกรรม FastAPI หากมีคำขอเข้ามาพร้อมกันจำนวนมากหรือเกิด N+1 Queries จะทำให้ Connection ของ PostgreSQL เต็มได้ง่าย จึงต้องกำหนด `Depends(get_db)` ให้ปิด Session ทุกครั้งและระวังการเขียน Query ในลูป
- **ข้อจำกัดของ Free/Starter Tier บน Cloud PaaS:** Managed PostgreSQL บน Render มีข้อจำกัดด้านจำนวน Connection สูงสุดและพื้นที่จัดเก็บข้อมูล

## Revisit When
ต้องกลับมาทบทวน ADR นี้อีกครั้งเมื่อเกิดเงื่อนไขอย่างใดอย่างหนึ่งต่อไปนี้:
1. **ปริมาณการเขียนข้อมูลพร้อมกันจาก Autosave เกินขีดจำกัดของ PostgreSQL อินสแตนซ์เดียว:** เช่น มีการใช้งานพร้อมกันระดับมหาวิทยาลัยหลายพันคนในวินาทีเดียวกัน จน p95 latency ของ `POST /api/evaluations/draft` เกิน 500ms ต่อเนื่อง ซึ่งอาจต้องพิจารณาแยกส่วนรับโหลด Autosave ไปไว้ใน In-memory store (เช่น Redis) แล้วค่อย Flush ลง PostgreSQL
2. **มีการเปลี่ยนแพลตฟอร์มโฮสติ้งไปสู่ Serverless เต็มรูปแบบ:** ที่ไม่สามารถรักษา Persistent TCP Connection กับ PostgreSQL แบบดั้งเดิมได้โดยไม่มี Connection Pooler (เช่น PgBouncer หรือ Supabase / Neon Serverless Driver)

## AI-DLC Note
- **AI proposed:** แนะนำให้ใช้ **SQLite (In-memory)** สำหรับการรัน Unit/Integration Test (`conftest.py`) และใช้ **PostgreSQL** เฉพาะตอนรันจริงบน Production เพื่อให้รัน `pytest` ได้เร็วโดยไม่ต้องพึ่ง Docker Container
- **Human decided:** เลือกใช้ **PostgreSQL จริงทั้งใน Test (`compose.test.yaml` ผ่าน `postgres:17-alpine` บน `tmpfs`) และใน Production** เพราะระบบของเรามีการใช้ Constraint, การตรวจ `IntegrityError`, ชนิดข้อมูล `Numeric` สำหรับคำนวณคะแนนทศนิยม, และ `DateTime(timezone=True)` ซึ่ง SQLite มีพฤติกรรมต่างจาก PostgreSQL หากใช้คนละตัวจะเสี่ยงเกิดบั๊กที่เทสจับไม่ได้เมื่อนำขึ้น Staging จริง
