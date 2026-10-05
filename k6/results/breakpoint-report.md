# k6 performance report — breakpoint

- target: `http://localhost:8000`
- fixture: 20 กลุ่ม x 5 คน = 100 นักศึกษา
- generated: 2026-10-05T07:55:56.638Z

## ภาพรวม

| ตัวชี้วัด | ค่า |
|---|---|
| requests ทั้งหมด | 764 |
| throughput | 2.83 req/s |
| iterations | 137 |
| http_req_duration avg / p95 / p99 | 21023.0 / 88727.9 / 119999.9 ms |
| http_req_failed | 21.20% (SLO < 1.00%) |
| error budget ใช้ไป | 2120.4% |
| checks ผ่าน | 78.66% (SLO > 99.00%) |
| 429/503 (ปฏิเสธอย่างสุภาพ) | 0 |
| 5xx/timeout (ล้ม) | 162 |
| iteration ที่ k6 ปล่อยทิ้ง (dropped) | 295 — ระบบรับ arrival rate ที่ตั้งไว้ไม่ทัน |
| VU สูงสุดที่ใช้ | 200 |

## latency ราย endpoint (เรียงจากช้าที่สุด)

| endpoint | tier | budget p95 | n | med | p95 | p99 | max | ผล |
|---|---|---:|---:|---:|---:|---:|---:|:--:|
| `POST /api/assignments/{id}:recompute` | job | 30000 | 277 | 9569.0 | **119999.6** | 120000.2 | 120000.7 | FAIL |
| `GET /api/assignments/{id}/reports/individual` | screen | 3000 | 181 | 4477.6 | **69782.1** | 89073.5 | 89514.5 | FAIL |
| `GET /api/assignments/{id}/export/csv` | job | 30000 | 157 | 9116.6 | **67473.8** | 89146.4 | 89562.0 | FAIL |
| `GET /api/assignments/{id}/my-score` | job | 30000 | 137 | 2480.6 | **64416.0** | 68904.2 | 88859.1 | FAIL |

## breakpoint — latency เทียบ arrival rate

นับเฉพาะ request ที่สำเร็จ (200) — ถ้าขั้นไหน n=0 หมายความว่าระบบรับ rate นั้นไม่ได้เลย

| เป้า req/s | n (สำเร็จ) | med | p95 | p99 | max |
|---:|---:|---:|---:|---:|---:|
| 1 | 164 | 99.7 | 538.8 | 590.4 | 608.5 |
| 2 | 252 | 3701.3 | 11747.4 | 13955.8 | 14618.4 |
| 3 | 174 | 10680.4 | 69293.9 | 70411.6 | 73843.0 |
| 4 | 0 | 0.0 | 0.0 | 0.0 | 0.0 |
| 5 | 0 | 0.0 | 0.0 | 0.0 | 0.0 |

## thresholds

ไม่ผ่าน (k6 exit code != 0):

- checks -> rate>0.99
- pe_hard_failures -> count<1
- http_req_duration{name:recompute} -> p(95)<30000
- http_req_duration{name:recompute} -> p(99)<75000
- http_req_duration{name:export_csv} -> p(95)<30000
- http_req_duration{name:export_csv} -> p(99)<75000
- http_req_failed -> rate<0.01
- http_req_duration{name:my_score} -> p(95)<30000
- http_req_duration{name:report_individual} -> p(95)<3000
- http_req_duration{name:report_individual} -> p(99)<7500
