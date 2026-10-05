# k6 performance suite — PairEval

ชุดทดสอบประสิทธิภาพของ PairEval API ทั้งหมดยิงผ่าน REST เท่านั้น ไม่แตะฐานข้อมูลตรง ๆ
จึงใช้ได้กับทั้ง localhost และ staging ที่ `/api` เปิดอยู่

> ⚠️ ยิงใส่ **localhost หรือ staging ของกลุ่มตัวเอง** เท่านั้น
> สคริปต์มีด่านกันไว้ (`assertSafeTarget`) — ถ้า target ไม่ใช่ localhost จะปฏิเสธการรัน
> เว้นแต่ตั้ง `PE_ALLOW_REMOTE=yes` อย่างตั้งใจ

## โครงไฟล์

| ไฟล์ | ชนิด | หน้าที่ |
|---|---|---|
| `smoke.js` | test | 1 VU 1 iteration เดินครบทุก journey — ยืนยันว่าสคริปต์ยิงติดและ contract ไม่เปลี่ยน |
| `load.js` | test / **CI gate** | โหลดระดับวันส่งงานจริง นักศึกษา + อาจารย์พร้อมกัน |
| `stress.js` | test / exploratory | ดันเกินกำลัง ดูว่าพัง "อย่างไร" (429/503 vs 500/timeout) |
| `soak.js` | test | โหลดปกติแต่ลากยาว หา memory leak / connection leak ผ่าน drift ของ p95 |
| `breakpoint.js` | test / capacity | ไล่ arrival rate เป็นขั้น หาเพดาน req/s ของ endpoint หนัก |
| `lib/config.js` | harness | target, ขนาด fixture, SLO, think time |
| `lib/api.js` | harness | API client + metric tag ราย endpoint + correlation id |
| `lib/fixture.js` | harness | สร้างห้องเรียนสังเคราะห์ใน `setup()` |
| `lib/journeys.js` | harness | user journey ที่ใช้ซ้ำได้ |
| `lib/thresholds.js` | harness | แปลง SLO เป็น threshold ของ k6 (ด่าน pass/fail) |
| `lib/summary.js` | harness | `handleSummary` → `results/*-summary.json` + `results/*-report.md` |

## รัน

**ต้อง `cd k6` ก่อนรัน** — `handleSummary` เขียนผลลง `./results/` ซึ่งอ้างจาก working directory

```bash
# 1) ให้ API ขึ้นก่อน (ใช้ Docker Compose สะดวกที่สุด)
docker compose up -d api

# 2) smoke ก่อนเสมอ — ถ้าแดงอย่าเสียเวลารัน load
# หากไม่มี k6 ติดตั้งในเครื่อง ให้รันผ่าน Docker:
docker run --rm -i --network host -v $(pwd)/k6:/app -w /app grafana/k6 run smoke.js

# หรือถ้ามี k6 ติดตั้งแล้ว:
# cd k6
# k6 run smoke.js

# 3) load = ด่านจริง
k6 run load.js
echo "exit code: $?"      # ≠ 0 แปลว่ามี threshold ไม่ผ่าน

# 4) ที่เหลือรันเมื่อต้องการสืบสาเหตุ
k6 run stress.js
k6 run soak.js
k6 run breakpoint.js
```

ชี้ไป staging:

```bash
BASE_URL=https://staging.example.com PE_ALLOW_REMOTE=yes k6 run load.js
```

## ผลที่ได้

ทุก scenario เขียนออก 3 ทาง:

- `results/<name>-summary.json` — ผลดิบของ k6 (ใช้เป็น baseline ได้เลย)
- `results/<name>-report.md` — ตาราง p95/p99 ราย endpoint เทียบ budget, ตารางเวลาต่อ 1 journey,
  drift ตามช่วงเวลา (soak), latency เทียบ arrival rate (breakpoint)
- stdout — สรุปสั้นสำหรับดูสด ๆ

## baseline comparison

วางไฟล์ baseline ไว้ที่ `k6/baseline/<name>-summary.json` แล้วรายงานรอบถัดไปจะมีหัวข้อ
"เทียบ baseline (p95)" ให้อัตโนมัติ พร้อมธง `REGRESSED` เมื่อ p95 แย่ลงเกิน tolerance

```bash
mkdir -p baseline
cp results/load-summary.json baseline/load-summary.json
```

tolerance ตั้งต้น 20% ปรับด้วย `PE_REGRESSION_TOLERANCE` — บนเครื่อง dev ที่มีงานอื่นแย่ง CPU
ความแกว่งระหว่างรันอาจถึง ±40% ทำให้ 20% แจ้ง regression ปลอมได้

## env ที่ปรับได้

### target
| ตัวแปร | default | ความหมาย |
|---|---|---|
| `BASE_URL` / `PE_BASE_URL` | `http://localhost:8000` | ปลายทาง |
| `PE_API_PREFIX` | `/api` | prefix ของ API |
| `PE_ALLOW_REMOTE` | — | ตั้ง `yes` เพื่ออนุญาตให้ยิง target ที่ไม่ใช่ localhost |

### fixture
| ตัวแปร | default | ความหมาย |
|---|---|---|
| `PE_GROUPS` | `20` | จำนวนกลุ่ม |
| `PE_GROUP_SIZE` | `5` | คนต่อกลุ่ม (รวม = 100 นักศึกษา) |
| `PE_ASSIGNMENT_ID` + `PE_CLASSROOM_ID` + `PE_FIXTURE_RUN_ID` | — | ครบทั้ง 3 ตัว = ข้าม setup ใช้ fixture เดิมซ้ำ |
| `PE_SETUP_TIMEOUT` | `10m` | เพดานเวลาของ `setup()` — default ของ k6 คือ 60s ซึ่งไม่พอสำหรับ fixture 100 คน |

การสร้าง fixture ใหม่ (import roster 100 คน + publish สร้าง pair ทั้งหมด) กินเวลาหลายสิบวินาที
ถ้ายิงหลายรอบติดกัน ให้ copy id จากบรรทัด `[fixture] ...` ของรอบแรกมาใส่ env แล้วรอบถัดไปจะข้ามขั้นนี้

### load shape
| ตัวแปร | default | ใช้กับ |
|---|---|---|
| `PE_VUS` | `20` | load, stress |
| `PE_RAMP_UP` / `PE_STEADY` / `PE_RAMP_DOWN` | `30s` / `1m` / `20s` | load, stress |
| `PE_STRESS_PEAK` | `120` | stress |
| `PE_BATCH_SIZE` | `4` | stress — ขนาด batch ของ `draft:batch` |
| `PE_SOAK_VUS` / `PE_SOAK_DURATION` | `8` / `10m` | soak |
| `PE_SOAK_WRITE_RATE` | `6` /นาที | soak — อัตราคนที่เขียนจริง |
| `PE_BP_START_RATE` / `PE_BP_MAX_RATE` / `PE_BP_STEPS` / `PE_BP_STEP` | `1` / `5` / `5` / `40s` | breakpoint |
| `PE_BP_ABORT` | — | ตั้ง `yes` เพื่อหยุดทันทีเมื่อ error rate > 10% (เพดานคือจุดนั้น) |
| `PE_THINK_MIN` / `PE_THINK_MAX` | `0.5` / `2.5` วินาที | think time ของทุก journey |
| `PE_INSTRUCTOR_PAUSE` | `15` (load) / `25` (soak) | ระยะห่างที่อาจารย์เปิดรายงานรอบถัดไป |

### SLO / gate
| ตัวแปร | default | ความหมาย |
|---|---|---|
| `PE_SLO_INTERACTIVE_MS` | `200` | p95 ของ API ที่ผู้ใช้รอคาหน้าจอ |
| `PE_SLO_SCREEN_MS` | `3000` | p95 ของหน้าจอที่ประกอบจากหลาย query |
| `PE_SLO_JOB_MS` | `30000` | p95 ของงาน aggregate/export |
| `PE_SLO_ERROR_RATE` | `0.01` | error budget |
| `PE_SLO_P99_MULT` | `2.5` | เพดาน p99 เทียบ p95 (tail latency ต้องไม่ระเบิด) |

tier ของแต่ละ endpoint อยู่ใน `lib/thresholds.js` (`TIER`) — ถ้าเพิ่ม endpoint ใหม่ต้องจับเข้า tier ด้วย
ไม่งั้นจะถูกเหมาเป็น `job` ซึ่งหลวมเกินกว่าจะจับ regression ได้

## ต่อเข้า CI

`load.js` เป็นตัวที่ควรใช้เป็นด่าน — `stress.js` และ `breakpoint.js` ตั้งใจให้แดงอยู่แล้ว
อย่าเอาไปเป็น gate

```yaml
  performance:
    needs: [lint-and-unit-test, e2e-tests]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7

      - name: Start Backend Services
        run: docker compose up -d api
        
      - name: Wait for API to be ready
        run: |
          echo "Waiting for API..."
          while ! curl -s http://localhost:8000/api/health; do
            sleep 2
          done

      - name: Setup k6
        uses: grafana/setup-k6-action@v1

      - name: k6 load
        working-directory: k6          # handleSummary เขียนลง ./results
        run: k6 run load.js
        env:
          BASE_URL: http://localhost:8000

      - uses: actions/upload-artifact@v7
        if: always()
        with:
          name: k6-results-${{ github.sha }}
          path: k6/results/
```

ทดสอบว่า gate ทำงานจริง: ตั้ง `PE_SLO_INTERACTIVE_MS=1` แล้วรัน — ต้องได้ exit code 99
