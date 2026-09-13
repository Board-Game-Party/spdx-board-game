# Comparison: Setup Steps & Environment Loop (Before vs After)

## 📊 Summary Table

| Metric | Before (WS-05) | After (WS-06 / Docker Loop) | Improvement |
| :--- | :--- | :--- | :--- |
| **Number of Setup Steps** | 6 ขั้นตอนแยกกัน | **1 คำสั่งเดียว** (`docker compose up`) | ลดลง 83% |
| **First-time Onboarding Time** | ~25 นาที (ติดตั้ง Python, Node, venv, deps, DB) | **~3 นาที** (Automated Container Build) | เร็วขึ้น 8.3 เท่า |
| **Subsequent Startup Time** | ~2-3 นาที | **~15-20 วินาที** (Cached Image) | เร็วขึ้น 9 เท่า |
| **Environment Parity** | เสี่ยงปัญหา "It works on my machine" | **100% Identical** บนทุกเครื่องสมาชิก | ตัด Environment Drifts |
| **Test Database Lifecycle** | ข้อมูลค้างสะสมใน local DB | **Ephemeral RAM (tmpfs)** คืนสภาพทุกครั้ง | ไม่มี Flaky/Stale Data |

---

## 🛠️ Step Breakdown

### Before (Manual Environment Setup)
1. ติดตั้ง Python 3.12+ บนเครื่อง Local
2. สร้าง Virtual Environment (`python3 -m venv .venv` และ `source .venv/bin/activate`)
3. ติดตั้ง Backend Dependencies (`pip install -r requirements.txt`)
4. ติดตั้ง Node.js v18+ และติดตั้ง Frontend Dependencies (`npm --prefix frontend install`)
5. ตั้งค่า Database Local และไฟล์ `.env`
6. เปิด 2 Terminal แยกกันเพื่อรัน Backend (`uvicorn`) และ Frontend (`npm run dev`)

### After (Docker Environment Loop)
1. **รัน Development Environment (ทั้ง Backend + Frontend + DB)**:
   ```bash
   docker compose up
   ```
2. **รัน Automated Test Suite (พร้อม Ephemeral Test DB)**:
   ```bash
   docker compose -f compose.test.yaml up unit --abort-on-container-exit --exit-code-from unit
   ```
3. **ล้างระบบ (Teardown)**:
   ```bash
   docker compose down -v
   ```
