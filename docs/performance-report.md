# Performance Report — PairEval

## Setup

| | |
|---|---|
| Target | `http://localhost:8000` (uvicorn + SQLite, single process) |
| ชุดทดสอบ | `k6/` — smoke / load / stress / soak / breakpoint (k6 v2.2.0) |
| Fixture | 20 กลุ่ม x 5 คน = 100 นักศึกษา, coverage R=4, workload k=8 → 1600 group pairs + 600 individual pairs |
| Load profile (load.js) | นักศึกษา ramp 0→20 VUs (30s) → คงที่ 20 VUs (1m) → ลง 0 (20s) พร้อมอาจารย์ 1 VU เปิดรายงาน/export ตลอดการรัน |
| Think time | sleep สุ่ม 0.5–2.5s ระหว่างทุก request |
| วันที่ทดสอบ | 2026-10-05 |
| Baseline | `k6/baseline/{load,smoke,soak}-summary.json` |

SLO แบ่งเป็น 3 tier (`k6/lib/thresholds.js`) เพราะหน้าจอเดียวของนักศึกษาเรียก API หลายครั้ง —
ถ้าใช้เกณฑ์ของงาน aggregate มาคลุมทุก endpoint เกณฑ์จะหลวมจนจับ regression ไม่ได้

| tier | p95 budget | endpoint ตัวอย่าง |
|---|---:|---|
| interactive | 200 ms | `/auth/google`, `/notifications`, `/evaluations/draft` |
| screen | 3 000 ms | `/assignments/{id}/evaluations`, `/reports/*`, `:submit` |
| job | 30 000 ms | `/my-score`, `:recompute`, `/export/*` |

> ⚠️ ทุกการรันยิงใส่ localhost เท่านั้น — `assertSafeTarget()` ใน `k6/lib/config.js`
> ปฏิเสธ target ที่ไม่ใช่ localhost เว้นแต่ตั้ง `PE_ALLOW_REMOTE=yes`

---

## Hypothesis vs Actual

สมมติฐานทั้ง 4 ข้อถูกบันทึกไว้ในคอมเมนต์ของ `k6/lib/journeys.js` และ `k6/lib/thresholds.js`
**ก่อน** การรันครั้งนี้ — ไม่ใช่เขียนย้อนหลัง

| Hypothesis | ผลจริง (load, 20 VUs) | ถูก/ผิด |
|---|---|:--:|
| `GET /my-score` จะช้าที่สุดในกลุ่มที่นักศึกษาเรียก เพราะรัน scoring engine ใหม่ทั้ง assignment ทุกครั้ง — p95 > 500ms | p95 = **145.7 ms** | **ผิดที่ scale นี้** |
| `GET /export/csv` จะเป็น endpoint ที่ช้าที่สุดของทั้งระบบ | p95 = **656.8 ms** — ช้าที่สุดจริง | ถูก |
| autosave `POST /evaluations/draft` อยู่ใน budget 200ms ได้แม้ที่ 20 VUs | p95 = **37.0 ms** จาก 1199 requests | ถูก |
| เพดานของระบบถูกกำหนดโดยงาน aggregate ไม่ใช่จำนวน request | breakpoint: mix หนักตันที่ **< 2 req/s** ขณะที่ autosave 1199 requests ผ่านสบาย | ถูก |

**ข้อที่ 1 ผิด แต่ผิดเพราะ scale ไม่ใช่เพราะโค้ด** — ที่ 20 VUs บน SQLite ที่เพิ่งสร้างใหม่
งาน recompute ทั้ง assignment (2 200 comparisons) ยังจบใน ~146 ms
แต่ breakpoint test แสดงว่า endpoint เดียวกันนี้ไปถึง **120 s (timeout)** เมื่อ arrival rate ขึ้นเป็น 2–3 req/s
สมมติฐานถูกเรื่องกลไก แต่ผิดเรื่องจุดที่กลไกนั้นจะเริ่มเจ็บ — ซึ่งเป็นเหตุผลที่ load test เดียวไม่พอ

---

## Results — load.js (ด่าน CI)

ภาพรวม: 1 632 requests, 12.43 req/s, 57 iterations, VU สูงสุด 21,
`http_req_failed` = **0.00%** (error budget ใช้ไป 0.0%), checks ผ่าน **100.00%**,
429/503 = 0, 5xx/timeout = 0 → **thresholds ผ่านทั้งหมด, exit code 0**

| Endpoint | tier | p50 | p95 | p99 | n | error rate |
|---|---|---:|---:|---:|---:|---:|
| `GET /api/assignments/{id}/export/csv` | job | 159.4 | **656.8** | 668.4 | 12 | 0% |
| `GET /api/assignments/{id}/export/xlsx` | job | 498.9 | **576.5** | 583.4 | 3 | 0% |
| `GET /api/assignments/{id}/reports/individual` | screen | 150.4 | **292.3** | 300.3 | 7 | 0% |
| `GET /api/assignments/{id}/reports/coverage` | screen | 110.0 | **223.8** | 241.8 | 7 | 0% |
| `GET /api/assignments/{id}/reports/group` | screen | 63.3 | **165.4** | 172.0 | 7 | 0% |
| `GET /api/assignments/{id}/evaluations` | screen | 56.0 | **158.1** | 281.8 | 110 | 0% |
| `GET /api/assignments/{id}/my-score` | job | 64.0 | **145.7** | 204.5 | 50 | 0% |
| `POST /api/assignments/{id}:recompute` | job | 102.8 | **102.8** | 102.8 | 1 | 0% |
| `POST /api/assignments/{id}/evaluations:submit` | screen | 20.6 | **60.7** | 94.9 | 105 | 0% |
| `GET /api/assignments/{id}/reports/quality` | screen | 31.3 | **59.7** | 67.5 | 7 | 0% |
| `POST /api/evaluations/draft` | interactive | 9.3 | **37.0** | 55.3 | 1199 | 0% |
| `GET /api/classrooms/{id}/audit` | screen | 5.2 | **33.1** | 34.2 | 7 | 0% |
| `POST /api/auth/google` | interactive | 8.8 | **32.3** | 44.8 | 57 | 0% |
| `GET /api/notifications` | interactive | 2.6 | **5.0** | 7.6 | 50 | 0% |

### เวลาต่อ 1 user journey (รวม think time)

ตัวเลขที่ผู้ใช้รู้สึกจริง ไม่ใช่ latency ของ request เดียว

| flow | n | p50 | p95 |
|---|---:|---:|---:|
| `student_journey` (ทำครบ 2 ฝั่ง + เช็คคะแนน) | 50 | 36.8 s | **42.0 s** |
| `evaluate_GROUP` (16 comparisons) | 55 | 26.0 s | 30.4 s |
| `evaluate_INDIVIDUAL` (6 comparisons) | 50 | 10.9 s | 12.5 s |
| `export` (CSV 4 แบบ + XLSX) | 3 | 1.57 s | 1.74 s |
| `instructor_reports` (รายงาน 4 ชุด + audit) | 7 | 0.39 s | 0.65 s |

เวลา 42 s ของ `student_journey` เกือบทั้งหมดเป็น think time ที่เราใส่เอง (22 comparisons x sleep 0.5–2.5s ≈ 33 s)
ส่วนที่เป็นเวลาเซิร์ฟเวอร์จริงคือ ~2 s — ตัวเลขนี้จึงใช้ดู **สัดส่วน** ไม่ใช่ใช้เป็น SLO

---

## Results — soak.js (3 นาที, โหลดปกติคงที่)

8 readers + writers 6 คน/นาที + อาจารย์ 1 คน: 3 468 requests, 809 iterations, VU สูงสุด 13,
`http_req_failed` = **0.00%**, 5xx/timeout = **0** → **thresholds ผ่านทั้งหมด**

คำถามที่ soak ตอบคือ "โหลดเท่าเดิม แต่เวลาผ่านไป p95 ไต่ขึ้นไหม" —
ทุก request ถูก tag ด้วยช่วงเวลา early / mid / late (`exec.vu.tags.phase` ใน `k6/soak.js`)

| ช่วง | n | p50 | p95 | p99 |
|---|---:|---:|---:|---:|
| early | 1 181 | 13.3 | 372.3 | 611.5 |
| mid | 1 159 | 13.2 | 341.6 | 477.9 |
| late | 1 117 | 15.3 | 383.3 | 603.1 |

**p95 ช่วงท้ายเทียบช่วงต้น: +3.0% → คงที่** ไม่พบสัญญาณ resource leak ในกรอบเวลานี้

> ข้อจำกัดที่ต้องระบุ: 3 นาทีสั้นเกินกว่าจะสรุปเรื่อง memory leak ได้จริง
> ตัวเลข +3.0% บอกได้แค่ว่า "ไม่มีการเสื่อมแบบเร็ว" ต้องรัน `PE_SOAK_DURATION=30m` ขึ้นไป
> พร้อมเฝ้า RSS ของ process ฝั่งเซิร์ฟเวอร์ควบคู่ ก่อนจะสรุปว่าไม่มี leak

---

## Threshold ที่ไม่ผ่าน

### load.js — ไม่มี
ผ่านทั้ง 14 endpoint + error budget + checks

### stress.js (ramp ถึง 120 VUs) — ไม่ผ่าน 14 รายการ *(คาดไว้แล้ว ไม่ใช่ด่าน CI)*

| metric | ค่า | เกณฑ์ |
|---|---|---|
| `http_req_duration{name:worksheet_get}` | p95 = 4 100 ms, p99 = 30 451 ms | p95 < 3 000 |
| `http_req_duration{name:submit_eval}` | p95 = 3 191 ms, p99 = 59 145 ms | p95 < 3 000 |
| `http_req_duration{name:draft_batch}` | p95 = 2 290 ms | p95 < 200 |
| `http_req_duration{name:auth_login}` | p95 = 1 761 ms | p95 < 200 |
| `http_req_failed` | 1.84% | < 1% |
| `pe_hard_failures` | **46** | < 1 |

### breakpoint.js — ไม่ผ่าน 10 รายการ *(คาดไว้แล้ว ไม่ใช่ด่าน CI)*
`http_req_failed` = 21.20%, `pe_hard_failures` = 162, dropped iterations = 295

---

## Bottleneck ที่พบ

### 1. scoring engine รันใหม่ทั้ง assignment ในทุก request ที่เกี่ยวกับคะแนน

**หลักฐานจากโค้ด** — `backend/app/features/scoring/services.py:22` `run_scoring_engine_for_assignment()`
โหลด **ทุก** `PairAssignment` (2 200 แถว) และ **ทุก** `Comparison` ของ assignment เข้าหน่วยความจำ
แล้วคำนวณคะแนนใหม่หมด โดยไม่มี cache และไม่มีการอ่านจากตารางคะแนนที่ persist ไว้

ถูกเรียกจาก 6 จุด:

| ที่เรียก | endpoint | ความถี่ที่เกิดจริง |
|---|---|---|
| `scoring/services.py:318` `get_student_score_view` | `GET /my-score` | **ทุกครั้งที่นักศึกษา 1 คนเปิดดูคะแนนตัวเอง** |
| `scoring/services.py:174, 195, 274` | `:recompute`, score views | อาจารย์กด |
| `reporting/services.py:19, 79` | `/reports/*`, `/export/*` | อาจารย์เปิดหน้ารายงาน |

ต้นทุนต่อ 1 request เป็น O(จำนวน comparison ทั้ง assignment) — **ไม่ขึ้นกับว่าใครถาม**
ห้องเรียน 100 คนเปิดดูคะแนนตัวเองพร้อมกัน = recompute ทั้ง assignment 100 รอบ
เพื่อตอบคำถามที่แต่ละคนต้องการแค่ 2 ตัวเลขของตัวเอง

**หลักฐานจากการวัด** — breakpoint test ไล่ arrival rate ของ mix หนัก
(`:recompute` + `/reports/individual` + `/export/csv` + `/my-score`) เป็นขั้น:

| เป้า req/s | n (สำเร็จ) | p50 | p95 |
|---:|---:|---:|---:|
| 1 | 164 | 99.7 ms | 538.8 ms |
| 2 | 252 | 3 701 ms | **11 747 ms** |
| 3 | 174 | 10 680 ms | **69 294 ms** |
| 4 | 0 | — | — |
| 5 | 0 | — | — |

ระหว่าง 1 → 2 req/s latency โตขึ้น **~22 เท่า** จากโหลดที่เพิ่มแค่เท่าตัว
นี่คือรูปร่างของคิวที่ตันแล้ว ไม่ใช่การช้าลงแบบเป็นเส้นตรง
**เพดานของระบบในการตั้งค่านี้อยู่ระหว่าง 1–2 req/s** ของงาน aggregate
ที่ 4 req/s ขึ้นไปไม่มี request ไหนจบเลยภายใน timeout 120 s (295 iterations ถูก k6 ทิ้ง)

### 2. ระบบล้มแทนที่จะปฏิเสธ — ไม่มี load shedding

ตัวเลขที่ต้องอ่านคู่กันในทุกการรันที่โหลดเกิน:

| | 429/503 (ปฏิเสธอย่างสุภาพ) | 5xx/timeout (ล้ม) |
|---|---:|---:|
| stress (120 VUs) | **0** | **46** |
| breakpoint (ถึง 5 req/s) | **0** | **162** |

ไม่มี rate limit, ไม่มีคิว, ไม่มี timeout ฝั่งแอป — พอเกินกำลัง ผู้ใช้ได้ 500 หรือค้างจนหมดเวลา
ไม่ได้ข้อความ "ลองใหม่อีกครั้ง" ซึ่งเป็นสิ่งที่กู้คืนได้ ต่างกันทั้งในแง่ UX และในแง่ความสามารถในการกู้ระบบ

### 3. SQLite serialize การเขียน

การรันนี้ใช้ SQLite ไฟล์เดียว การเขียนทุกครั้งจึงล็อกทั้งไฟล์
ใน stress test `submit_eval` มี p95 = 3.2 s แต่ p99 = **59.1 s** — ช่องว่างแบบนี้
(p99 มากกว่า p95 เกือบ 20 เท่า) คือลายเซ็นของการรอคิวล็อก ไม่ใช่ของงานที่หนักขึ้นสม่ำเสมอ

---

## สิ่งที่จะแก้ (ยังไม่แก้ในวันนี้)

| ลำดับ | แนวทาง | คาดว่าได้อะไร |
|---|---|---|
| 1 | persist ผลของ scoring engine ลงตารางคะแนน + invalidate เมื่อมี comparison ใหม่ แล้วให้ `GET /my-score` อ่านจากตารางนั้น | `/my-score` ที่ load scale: p95 **146 ms → < 30 ms**; ที่ 2 req/s: **11.7 s → ระดับ interactive** เพราะต้นทุนต่อ request เปลี่ยนจาก O(ทั้ง assignment) เป็น O(1) |
| 2 | ให้ `get_student_score_view` ดึงเฉพาะคะแนนของกลุ่มและของตัวผู้เรียกที่ร้องขอ ไม่ต้องคำนวณทั้ง assignment | ลดงานต่อ request ลง ~100 เท่าในห้อง 100 คน (ถ้าทำข้อ 1 แล้ว ข้อนี้เป็นการตัดงานส่วนที่เหลือ) |
| 3 | ใส่ rate limit + timeout ฝั่งแอปบน endpoint tier `job` ให้ตอบ 429 เมื่อคิวเต็ม | ย้ายตัวเลข 46/162 จากคอลัมน์ "ล้ม" ไปคอลัมน์ "ปฏิเสธอย่างสุภาพ" — `pe_hard_failures` กลับไปเป็น 0 |
| 4 | ใช้ Postgres บน staging ไม่ใช่ SQLite | ปิดช่องว่าง p95/p99 ของ endpoint ที่เขียน (`submit_eval` p99 59 s) |

วัดซ้ำด้วยคำสั่งเดิมหลังแก้ แล้วเทียบกับ `k6/baseline/load-summary.json` — รายงานจะขึ้นธง
`REGRESSED` / `ok` ให้เองในหัวข้อ "เทียบ baseline (p95)"

---

## AI Analysis

**คำถามที่ถาม:** จากผล k6 ของทั้ง 4 scenario + โค้ด handler ของ endpoint ที่ช้า
เวลาหมดไปกับอะไร และการวัดอะไรจะยืนยันหรือตัดแต่ละข้อออก

**AI เสนอสาเหตุ (เรียงตามน้ำหนักหลักฐาน):**

1. **recompute ทั้ง assignment ต่อ 1 request** — `run_scoring_engine_for_assignment` โหลดทุก pair
   และทุก comparison แล้วคำนวณใหม่ ไม่มี cache
   *การวัดที่จะยืนยัน:* รัน breakpoint ซ้ำด้วย `PE_GROUPS=5` (ลด comparison ลง 4 เท่า) —
   ถ้าเพดาน req/s ขยับขึ้นเป็นสัดส่วนผกผันกับจำนวน comparison คือยืนยัน
2. **การเขียนติดล็อกของ SQLite** — p99 ของ `submit_eval` ห่างจาก p95 เกือบ 20 เท่า
   *การวัดที่จะยืนยัน:* รัน stress ชุดเดิมบน Postgres ถ้าช่องว่าง p95/p99 แคบลงแต่ p50 ไม่เปลี่ยน คือยืนยัน
3. **ไม่มี load shedding ทำให้ความล้มช้ากว่าที่ควร** — request ที่เกินกำลังค้างกินคิวจนถึง timeout 120 s
   แทนที่จะถูกปฏิเสธเร็ว ๆ ทำให้ request อื่นช้าตามไปด้วย
   *การวัดที่จะยืนยัน:* ใส่ rate limit แล้วรัน breakpoint ซ้ำ ถ้า p95 ของขั้น 2–3 req/s ดีขึ้น
   ขณะที่สัดส่วน non-2xx เพิ่ม คือยืนยัน

**เรารับ:** ข้อ 1 และ 3 — ข้อ 1 เพราะหลักฐานมาจากทั้งโค้ด (เห็นจุดเรียกครบ 6 แห่ง) และจากกราฟ
arrival rate ที่หักศอกระหว่าง 1 → 2 req/s; ข้อ 3 เพราะ 429/503 = 0 คู่กับ 5xx/timeout = 162
เป็นหลักฐานตรง ๆ ว่าไม่มีกลไกปฏิเสธอยู่เลย

**เราไม่รับ (ยัง):** ข้อ 2 ในฐานะ bottleneck ของ production — การรันนี้ใช้ SQLite ซึ่งเป็น
ข้อจำกัดของ **สภาพแวดล้อมทดสอบ** ไม่ใช่ของระบบที่จะ deploy จริง
ต้องวัดซ้ำบน Postgres ก่อนจะสรุปอะไรเกี่ยวกับการเขียน

**ข้อที่ AI เสนอแล้วเราตัดออกเอง:** AI สงสัยว่ามี N+1 query ที่
`c.pair_assignment` ใน loop ของ `run_scoring_engine_for_assignment`
เราตัดออกเพราะโค้ดบรรทัดก่อนหน้าโหลด `all_pairs` ของ assignment นั้นเข้า session ไปแล้ว
การเข้าถึง relationship แบบ many-to-one จึง resolve จาก identity map โดยไม่ยิง SQL
*การวัดที่จะปิดประเด็นนี้ให้สนิท:* เปิด `echo=True` ที่ engine แล้วนับจำนวน SELECT ต่อ 1 request
ของ `/my-score` — ถ้าเป็นหลักหน่วยไม่ใช่หลักพัน คือยืนยันว่าไม่มี N+1

**การวัดที่จะทำเพิ่ม:** ทั้ง 3 ข้อข้างบน + ขยาย soak จาก 3 นาทีเป็น 30 นาที
พร้อมเฝ้า RSS ฝั่งเซิร์ฟเวอร์ (soak 3 นาทีให้ drift +3.0% ซึ่งยังสรุปเรื่อง leak ไม่ได้)

---

## วิธีรันซ้ำ

```bash
# API
DATABASE_URL="sqlite:///./k6-perf.db" python -u -m uvicorn backend.app.main:app --port 8000

# ชุดทดสอบ (ต้องอยู่ใน k6/ เพราะ handleSummary เขียนลง ./results)
cd k6
k6 run smoke.js        # ยืนยันว่าสคริปต์ยิงติดก่อน
k6 run load.js         # ด่าน pass/fail — exit 0 = ผ่าน
k6 run stress.js       # ดูว่าพังอย่างไร
k6 run breakpoint.js   # หาเพดาน req/s
PE_SOAK_DURATION=30m k6 run soak.js
```

ยืนยันว่า gate ทำงานจริง (ทดสอบแล้ว): `PE_SLO_INTERACTIVE_MS=1 k6 run smoke.js` → **exit code 99**

รายละเอียด env ทั้งหมดอยู่ใน `k6/README.md`
