# k6 performance report — load

- target: `http://localhost:8000`
- fixture: 20 กลุ่ม x 5 คน = 100 นักศึกษา
- generated: 2026-10-05T07:35:02.909Z

## ภาพรวม

| ตัวชี้วัด | ค่า |
|---|---|
| requests ทั้งหมด | 1632 |
| throughput | 12.43 req/s |
| iterations | 57 |
| http_req_duration avg / p95 / p99 | 23.5 / 83.1 / 182.2 ms |
| http_req_failed | 0.00% (SLO < 1.00%) |
| error budget ใช้ไป | 0.0% |
| checks ผ่าน | 100.00% (SLO > 99.00%) |
| 429/503 (ปฏิเสธอย่างสุภาพ) | 0 |
| 5xx/timeout (ล้ม) | 0 |
| VU สูงสุดที่ใช้ | 21 |

## latency ราย endpoint (เรียงจากช้าที่สุด)

| endpoint | tier | budget p95 | n | med | p95 | p99 | max | ผล |
|---|---|---:|---:|---:|---:|---:|---:|:--:|
| `GET /api/assignments/{id}/export/csv` | job | 30000 | 12 | 159.4 | **656.8** | 668.4 | 671.3 | PASS |
| `GET /api/assignments/{id}/export/xlsx` | job | 30000 | 3 | 498.9 | **576.5** | 583.4 | 585.1 | PASS |
| `GET /api/assignments/{id}/reports/individual` | screen | 3000 | 7 | 150.4 | **292.3** | 300.3 | 302.3 | PASS |
| `GET /api/assignments/{id}/reports/coverage` | screen | 3000 | 7 | 110.0 | **223.8** | 241.8 | 246.3 | PASS |
| `GET /api/assignments/{id}/reports/group` | screen | 3000 | 7 | 63.3 | **165.4** | 172.0 | 173.7 | PASS |
| `GET /api/assignments/{id}/evaluations` | screen | 3000 | 110 | 56.0 | **158.1** | 281.8 | 307.2 | PASS |
| `GET /api/assignments/{id}/my-score` | job | 30000 | 50 | 64.0 | **145.7** | 204.5 | 245.2 | PASS |
| `POST /api/assignments/{id}:recompute` | job | 30000 | 1 | 102.8 | **102.8** | 102.8 | 102.8 | PASS |
| `POST /api/assignments/{id}/evaluations:submit` | screen | 3000 | 105 | 20.6 | **60.7** | 94.9 | 158.4 | PASS |
| `GET /api/assignments/{id}/reports/quality` | screen | 3000 | 7 | 31.3 | **59.7** | 67.5 | 69.5 | PASS |
| `POST /api/evaluations/draft` | interactive | 200 | 1199 | 9.3 | **37.0** | 55.3 | 131.4 | PASS |
| `GET /api/classrooms/{id}/audit` | screen | 3000 | 7 | 5.2 | **33.1** | 34.2 | 34.4 | PASS |
| `POST /api/auth/google` | interactive | 200 | 57 | 8.8 | **32.3** | 44.8 | 50.2 | PASS |
| `GET /api/notifications` | interactive | 200 | 50 | 2.6 | **5.0** | 7.6 | 8.2 | PASS |

## เวลาต่อ 1 user journey (รวม think time)

| flow | n | med | p95 | p99 | max |
|---|---:|---:|---:|---:|---:|
| evaluate_GROUP | 55 | 26032.0 | 30386.2 | 32041.1 | 32350.0 |
| evaluate_INDIVIDUAL | 50 | 10862.5 | 12530.4 | 13682.7 | 13791.0 |
| export | 3 | 1572.0 | 1738.5 | 1753.3 | 1757.0 |
| instructor_reports | 7 | 389.0 | 648.7 | 660.9 | 664.0 |
| recompute | 1 | 103.0 | 103.0 | 103.0 | 103.0 |
| student_journey | 50 | 36764.0 | 42023.3 | 42899.4 | 43407.0 |

## thresholds

ผ่านทั้งหมด
