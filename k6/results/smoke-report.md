# k6 performance report — smoke

- target: `http://localhost:8000`
- fixture: 20 กลุ่ม x 5 คน = 100 นักศึกษา
- generated: 2026-10-05T08:11:32.660Z

## ภาพรวม

| ตัวชี้วัด | ค่า |
|---|---|
| requests ทั้งหมด | 56 |
| throughput | 19.33 req/s |
| iterations | 1 |
| http_req_duration avg / p95 / p99 | 42.1 / 141.4 / 430.0 ms |
| http_req_failed | 0.00% (SLO < 1.00%) |
| error budget ใช้ไป | 0.0% |
| checks ผ่าน | 100.00% (SLO > 99.00%) |
| 429/503 (ปฏิเสธอย่างสุภาพ) | 0 |
| 5xx/timeout (ล้ม) | 0 |
| VU สูงสุดที่ใช้ | 1 |

## latency ราย endpoint (เรียงจากช้าที่สุด)

| endpoint | tier | budget p95 | n | med | p95 | p99 | max | ผล |
|---|---|---:|---:|---:|---:|---:|---:|:--:|
| `GET /api/assignments/{id}/export/csv` | job | 30000 | 4 | 122.0 | **487.0** | 538.3 | 551.2 | PASS |
| `GET /api/assignments/{id}/export/xlsx` | job | 30000 | 1 | 330.8 | **330.8** | 330.8 | 330.8 | PASS |
| `GET /api/assignments/{id}/reports/coverage` | screen | 3000 | 1 | 123.4 | **123.4** | 123.4 | 123.4 | PASS |
| `GET /api/assignments/{id}/reports/individual` | screen | 3000 | 1 | 95.2 | **95.2** | 95.2 | 95.2 | PASS |
| `POST /api/assignments/{id}:recompute` | job | 30000 | 1 | 74.4 | **74.4** | 74.4 | 74.4 | PASS |
| `GET /api/assignments/{id}/evaluations` | screen | 3000 | 3 | 63.7 | **66.6** | 66.8 | 66.9 | PASS |
| `GET /api/assignments/{id}/my-score` | job | 30000 | 1 | 46.7 | **46.7** | 46.7 | 46.7 | PASS |
| `GET /api/assignments/{id}/reports/quality` | screen | 3000 | 1 | 40.0 | **40.0** | 40.0 | 40.0 | PASS |
| `GET /api/assignments/{id}/reports/group` | screen | 3000 | 1 | 39.2 | **39.2** | 39.2 | 39.2 | PASS |
| `POST /api/assignments/{id}/evaluations:submit` | screen | 3000 | 2 | 17.7 | **20.7** | 21.0 | 21.1 | PASS |
| `GET /api/classrooms/{id}/audit` | screen | 3000 | 1 | 11.0 | **11.0** | 11.0 | 11.0 | PASS |
| `POST /api/auth/google` | interactive | 200 | 4 | 8.1 | **8.8** | 8.9 | 8.9 | PASS |
| `POST /api/evaluations/draft` | interactive | 200 | 22 | 7.1 | **8.5** | 9.5 | 9.7 | PASS |
| `GET /api/notifications` | interactive | 200 | 2 | 3.3 | **3.3** | 3.3 | 3.3 | PASS |
| `GET /api/auth/me` | interactive | 200 | 1 | 2.0 | **2.0** | 2.0 | 2.0 | PASS |

## เทียบ baseline (p95)

| endpoint | baseline | ครั้งนี้ | เปลี่ยนแปลง | |
|---|---:|---:|---:|:--:|
| `GET /api/auth/me` | 1.2 | 2.0 | +64.6% | REGRESSED |
| `POST /api/assignments/{id}:recompute` | 46.5 | 74.4 | +60.1% | REGRESSED |
| `GET /api/classrooms/{id}/audit` | 8.8 | 11.0 | +25.6% | REGRESSED |
| `GET /api/assignments/{id}/reports/coverage` | 103.7 | 123.4 | +19.0% | ok |
| `GET /api/assignments/{id}/export/xlsx` | 307.2 | 330.8 | +7.7% | ok |
| `GET /api/assignments/{id}/reports/quality` | 38.2 | 40.0 | +4.7% | ok |
| `POST /api/assignments/{id}/evaluations:submit` | 20.3 | 20.7 | +2.3% | ok |
| `GET /api/assignments/{id}/reports/individual` | 94.7 | 95.2 | +0.6% | ok |
| `GET /api/assignments/{id}/my-score` | 46.7 | 46.7 | -0.0% | ok |
| `GET /api/assignments/{id}/export/csv` | 507.4 | 487.0 | -4.0% | ok |
| `GET /api/assignments/{id}/evaluations` | 78.5 | 66.6 | -15.2% | ok |
| `GET /api/assignments/{id}/reports/group` | 47.9 | 39.2 | -18.1% | ok |
| `POST /api/evaluations/draft` | 10.5 | 8.5 | -19.0% | ok |
| `POST /api/auth/google` | 33.7 | 8.8 | -73.8% | ok |
| `GET /api/notifications` | 13.9 | 3.3 | -76.1% | ok |

## เวลาต่อ 1 user journey (รวม think time)

| flow | n | med | p95 | p99 | max |
|---|---:|---:|---:|---:|---:|
| evaluate_GROUP | 1 | 209.0 | 209.0 | 209.0 | 209.0 |
| evaluate_INDIVIDUAL | 1 | 68.0 | 68.0 | 68.0 | 68.0 |
| export | 1 | 1244.0 | 1244.0 | 1244.0 | 1244.0 |
| instructor_reports | 1 | 310.0 | 310.0 | 310.0 | 310.0 |
| recompute | 1 | 75.0 | 75.0 | 75.0 | 75.0 |
| student_journey | 1 | 335.0 | 335.0 | 335.0 | 335.0 |
| student_readonly | 1 | 583.0 | 583.0 | 583.0 | 583.0 |

## thresholds

ผ่านทั้งหมด
