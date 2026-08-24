# System Architecture & Component Diagram — PairEval

## 1. Mermaid Component Diagram

```mermaid
flowchart TB
    subgraph CLIENT_TIER["Frontend Client Tier (React + TypeScript + Tailwind CSS)"]
        direction TB
        subgraph FE_MODULES["Feature UI Modules (src/features)"]
            direction LR
            FE_AUTH["Auth Module<br/>• Google Login<br/>• Session Guard"]
            FE_CLASS["Classroom Module<br/>• Roster Table<br/>• CSV Upload Modal"]
            FE_ASSIGN["Assignment Module<br/>• Setup Form<br/>• 100% Weight Check"]
            FE_EVAL["Evaluation Module<br/>• 6-Point Forced Scale (D1)<br/>• Autosave & Offline Queue"]
            FE_REPORT["Reporting Module<br/>• Summary & Charts<br/>• k-Anonymity Guard (k≥3)"]
            FE_AUDIT["Audit & Appeals<br/>• Score Override Form<br/>• Dispute Intake"]
        end
    end

    CLIENT_TIER -->|"REST API / JSON + Idempotency-Key"| API_GATEWAY

    subgraph BACKEND_TIER["Backend Service Tier (FastAPI + Python 3.12)"]
        direction TB
        subgraph API_GATEWAY["API & Security Middleware Layer (app/core)"]
            direction LR
            MW_AUTH["Authentication & OIDC Verifier"]
            MW_HD["Hosted Domain Guard"]
            MW_AUTHZ["Role-Based RBAC"]
            MW_SCOPE["Classroom Scope 404 Guard"]
            MW_LOG["Structured JSON Logger"]
        end

        API_GATEWAY --> BACKEND_SERVICES

        subgraph BACKEND_SERVICES["Backend Feature Services (app/features)"]
            direction TB
            subgraph ROW1["Management & Evaluation Engines"]
                direction LR
                SVC_AUTH["Auth Service<br/>• Email Normalization<br/>• User Activation"]
                SVC_CLASS["Classroom Service<br/>• Atomic CSV Parser<br/>• Injection Guard"]
                SVC_ASSIGN["Assignment Service<br/>• State Transitions<br/>• Weight Guard"]
                SVC_PAIR["Pairing Engine (DDD)<br/>• Feasibility Solver (§8.2)<br/>• Invariants INV-1..5 (D8)"]
                SVC_EVAL["Evaluation Service<br/>• Autosave Draft<br/>• Re-submissions"]
            end
            subgraph ROW2["Scoring, Analytics & Governance"]
                direction LR
                SVC_SCORE["Scoring Engine (Pure Function)<br/>• Quality Index q (§9.2)<br/>• Band Mapping (§9.3)<br/>• Multiplier M (§9.4)"]
                SVC_INTEG["Integrity Engine<br/>• Intransitivity 3-Cycles<br/>• Straight-line & Position Bias"]
                SVC_REPORT["Reporting & Export Service<br/>• k-Anonymity Guard<br/>• UTF-8 BOM CSV / XLSX"]
                SVC_AUDIT["Audit & Appeals Service<br/>• Append-Only Log (AR-03)<br/>• Override Tracker"]
                SVC_NOTIF["Notification Service<br/>• Email Queue<br/>• Grade Privacy Sanitizer"]
            end
        end

        subgraph BG_JOBS["Background Task Runner"]
            direction LR
            JOB_SCORE["Scheduled Score Recompute (Nightly 02:00 & On-demand)"]
            JOB_NOTIF["Email Dispatch Worker (Milestone & 48h Reminders)"]
        end
    end

    subgraph DATA_TIER["Data & Storage Tier"]
        direction LR
        DB_PRIMARY[("PostgreSQL 16 Database<br/>• Operational Relational Data<br/>• Comparison Revisions<br/>• Computed Score Snapshots")]
        DB_AUDIT[("Append-Only Audit Log Storage<br/>• Immutable Event Records<br/>• Tamper-Proof Audit Trail")]
    end

    subgraph EXTERNAL_TIER["External Services"]
        direction LR
        EXT_GOOGLE["Google Identity Services (OAuth 2.0 / OIDC)"]
        EXT_SMTP["Email Delivery Service (SMTP)"]
    end

    %% Wiring
    MW_AUTH -.->|"Verify Token"| EXT_GOOGLE
    BACKEND_SERVICES -->|"Read / Write"| DB_PRIMARY
    SVC_AUDIT -->|"Append-Only Events"| DB_AUDIT
    SVC_NOTIF -->|"Enqueue Tasks"| JOB_NOTIF
    JOB_NOTIF -->|"Send Emails (No Grades)"| EXT_SMTP
    JOB_SCORE -->|"Run AR-01 Scoring"| SVC_SCORE
    JOB_SCORE -->|"Persist Snapshots"| DB_PRIMARY
```

---

## 2. Architectural Principles & Specifications

| Principle ID | Principle | Description & Implementation |
|---|---|---|
| **AR-01** | Pure Function Scoring Engine | `Scoring Engine` ถูกออกแบบให้เป็น Pure function คำนวณจากข้อมูลดิบในฐานข้อมูลโดยไม่มี state ภายใน เมื่อให้ข้อมูลนำเข้าชุดเดิมจะคำนวณได้ผลลัพธ์เดิมทุกหลักทศนิยม (Reproducible & Auditable) |
| **AR-02** | Unified Authorization Layer | ทุกการเข้าถึงข้อมูลที่สามารถระบุตัวตนของผู้ประเมิน (Evaluator Identity) ต้องผ่าน Middleware ตรวจสอบสิทธิ์เดียวกันอย่างเคร่งครัด โดยเฉพาะการ Mask ข้อมูลด้วย Pseudonymous ID สำหรับ Co-teacher และ Student |
| **AR-03** | Append-Only Audit Trail | ข้อมูลใน Audit Log ถูกจัดเก็บแบบ Append-only แยกส่วนจาก Operational Data ทั่วไป และไม่มีฟังก์ชันหรือ API ใดที่สามารถแก้ไขหรือลบประวัติการกระทำได้ |
| **AR-04** | Client-Side Offline Resilience | ฝั่ง Frontend Client มีระบบ Local Queue สำหรับบันทึกคำตอบระหว่างที่สัญญาณเครือข่ายขัดข้อง และจะทำการ Autosave ไปยัง Server แบบ Idempotent ทันทีที่เชื่อมต่ออินเทอร์เน็ตได้อีกครั้ง |
| **AR-05** | k-Anonymity & Privacy by Design | ข้อมูลคะแนนรายบุคคลจะไม่ถูกเปิดเผยต่อนักศึกษาจนกว่าจะมีผู้ส่งประเมิน $\ge 3$ คน ($k_{min}$) และห้ามแสดงผลต่างคะแนนรายวัน (Delta) เพื่อป้องกันการแกะรอยผู้ประเมินตามมาตรฐาน PDPA |
| **AR-06** | Mathematical Pairing Feasibility | ระบบตรวจสอบความเป็นไปได้ทางคณิตศาสตร์ระหว่าง Workload ($k$) และ Coverage ($R$) ก่อน Publish หากเกินขีดจำกัดจะปรับลด $R$ อัตโนมัติและแสดงเหตุผลเป็นตัวเลขแก่อาจารย์ |
