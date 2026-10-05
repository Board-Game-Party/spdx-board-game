# k6 performance report — stress

- target: `http://localhost:8000`
- fixture: 20 กลุ่ม x 5 คน = 100 นักศึกษา
- generated: 2026-10-05T07:39:41.308Z

## ภาพรวม

| ตัวชี้วัด | ค่า |
|---|---|
| requests ทั้งหมด | 2494 |
| throughput | 14.64 req/s |
| iterations | 171 |
| http_req_duration avg / p95 / p99 | 1809.4 / 3393.5 / 57937.8 ms |
| http_req_failed | 1.84% (SLO < 1.00%) |
| error budget ใช้ไป | 184.4% |
| checks ผ่าน | 98.15% (SLO > 99.00%) |
| 429/503 (ปฏิเสธอย่างสุภาพ) | 0 |
| 5xx/timeout (ล้ม) | 46 |
| VU สูงสุดที่ใช้ | 121 |

## latency ราย endpoint (เรียงจากช้าที่สุด)

| endpoint | tier | budget p95 | n | med | p95 | p99 | max | ผล |
|---|---|---:|---:|---:|---:|---:|---:|:--:|
| `GET /api/assignments/{id}/evaluations` | screen | 3000 | 430 | 802.9 | **4100.3** | 30451.2 | 60028.4 | FAIL |
| `GET /api/assignments/{id}/reports/coverage` | screen | 3000 | 8 | 856.8 | **4085.5** | 4119.6 | 4128.2 | FAIL |
| `POST /api/assignments/{id}/evaluations:submit` | screen | 3000 | 365 | 399.5 | **3190.7** | 59144.8 | 60931.5 | FAIL |
| `POST /api/evaluations/draft:batch` | interactive | 200 | 1242 | 208.1 | **2290.3** | 58016.4 | 60511.1 | FAIL |
| `GET /api/assignments/{id}/reports/individual` | screen | 3000 | 8 | 523.3 | **2144.4** | 2562.6 | 2667.2 | PASS |
| `GET /api/notifications` | interactive | 200 | 158 | 40.0 | **1979.6** | 14671.1 | 30415.6 | FAIL |
| `POST /api/auth/google` | interactive | 200 | 249 | 45.2 | **1761.0** | 30520.3 | 31600.0 | FAIL |
| `GET /api/assignments/{id}/reports/group` | screen | 3000 | 8 | 152.3 | **706.5** | 771.7 | 788.0 | PASS |
| `GET /api/assignments/{id}/reports/quality` | screen | 3000 | 8 | 113.4 | **328.6** | 363.2 | 371.9 | PASS |
| `GET /api/classrooms/{id}/audit` | screen | 3000 | 8 | 9.5 | **104.5** | 115.4 | 118.1 | PASS |

## เวลาต่อ 1 user journey (รวม think time)

| flow | n | med | p95 | p99 | max |
|---|---:|---:|---:|---:|---:|
| evaluate_GROUP | 202 | 11383.0 | 21522.9 | 75420.9 | 78504.0 |
| evaluate_INDIVIDUAL | 167 | 5755.0 | 24980.9 | 67116.2 | 71159.0 |
| instructor_reports | 8 | 1265.0 | 7371.2 | 7933.4 | 8074.0 |
| student_journey | 158 | 15930.0 | 26121.1 | 41422.7 | 58048.0 |

## thresholds

ไม่ผ่าน (k6 exit code != 0):

- http_req_duration{name:submit_eval} -> p(95)<3000
- http_req_duration{name:submit_eval} -> p(99)<7500
- pe_hard_failures -> count<1
- http_req_duration{name:report_coverage} -> p(95)<3000
- http_req_duration{name:draft_batch} -> p(95)<200
- http_req_duration{name:draft_batch} -> p(99)<500
- http_req_failed -> rate<0.01
- http_req_duration{name:notifications} -> p(95)<200
- http_req_duration{name:notifications} -> p(99)<500
- checks -> rate>0.99
- http_req_duration{name:worksheet_get} -> p(95)<3000
- http_req_duration{name:worksheet_get} -> p(99)<7500
- http_req_duration{name:auth_login} -> p(95)<200
- http_req_duration{name:auth_login} -> p(99)<500
