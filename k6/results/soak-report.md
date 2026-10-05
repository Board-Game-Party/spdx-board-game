# k6 performance report — soak

- target: `http://localhost:8000`
- fixture: 20 กลุ่ม x 5 คน = 100 นักศึกษา
- generated: 2026-10-05T08:07:35.932Z

## ภาพรวม

| ตัวชี้วัด | ค่า |
|---|---|
| requests ทั้งหมด | 3468 |
| throughput | 17.25 req/s |
| iterations | 809 |
| http_req_duration avg / p95 / p99 | 80.0 / 364.7 / 583.2 ms |
| http_req_failed | 0.00% (SLO < 1.00%) |
| error budget ใช้ไป | 0.0% |
| checks ผ่าน | 100.00% (SLO > 99.00%) |
| 429/503 (ปฏิเสธอย่างสุภาพ) | 0 |
| 5xx/timeout (ล้ม) | 0 |
| VU สูงสุดที่ใช้ | 13 |

## latency ราย endpoint (เรียงจากช้าที่สุด)

| endpoint | tier | budget p95 | n | med | p95 | p99 | max | ผล |
|---|---|---:|---:|---:|---:|---:|---:|:--:|
| `GET /api/assignments/{id}/reports/coverage` | screen | 3000 | 7 | 585.5 | **723.9** | 746.8 | 752.5 | PASS |
| `GET /api/assignments/{id}/evaluations` | screen | 3000 | 802 | 215.9 | **546.8** | 783.2 | 856.8 | PASS |
| `GET /api/assignments/{id}/reports/individual` | screen | 3000 | 7 | 405.9 | **520.9** | 521.8 | 522.0 | PASS |
| `GET /api/assignments/{id}/my-score` | job | 30000 | 196 | 121.1 | **333.3** | 566.2 | 615.0 | PASS |
| `GET /api/assignments/{id}/reports/group` | screen | 3000 | 7 | 167.2 | **332.0** | 333.3 | 333.7 | PASS |
| `GET /api/assignments/{id}/reports/quality` | screen | 3000 | 7 | 261.5 | **321.2** | 326.8 | 328.1 | PASS |
| `POST /api/assignments/{id}/evaluations:submit` | screen | 3000 | 19 | 46.2 | **139.5** | 159.9 | 165.0 | PASS |
| `GET /api/classrooms/{id}/audit` | screen | 3000 | 7 | 60.9 | **131.6** | 148.2 | 152.3 | PASS |
| `POST /api/auth/google` | interactive | 200 | 536 | 18.3 | **58.5** | 126.9 | 270.4 | PASS |
| `POST /api/evaluations/draft` | interactive | 200 | 304 | 21.8 | **45.8** | 98.3 | 150.8 | PASS |
| `GET /api/auth/me` | interactive | 200 | 783 | 5.0 | **18.1** | 42.8 | 105.0 | PASS |
| `GET /api/notifications` | interactive | 200 | 783 | 5.7 | **12.8** | 25.6 | 64.8 | PASS |

## เวลาต่อ 1 user journey (รวม think time)

| flow | n | med | p95 | p99 | max |
|---|---:|---:|---:|---:|---:|
| evaluate_GROUP | 19 | 26044.0 | 29847.4 | 31311.9 | 31678.0 |
| instructor_reports | 7 | 1464.0 | 1679.4 | 1691.9 | 1695.0 |
| student_readonly | 783 | 1910.0 | 2776.4 | 3065.0 | 3407.0 |

## drift ตามช่วงเวลา (soak — early / mid / late)

| ช่วง | n | med | p95 | p99 | max |
|---|---:|---:|---:|---:|---:|
| early | 1181 | 13.3 | 372.3 | 611.5 | 856.8 |
| mid | 1159 | 13.2 | 341.6 | 477.9 | 638.1 |
| late | 1117 | 15.3 | 383.3 | 603.1 | 847.3 |

p95 ช่วงท้ายเทียบช่วงต้น: +3.0% (คงที่)

## thresholds

ผ่านทั้งหมด
