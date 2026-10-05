/**
 * k6/breakpoint.js
 * ----------------------------------------------------------------------------
 * breakpoint test — หา "เพดาน" ของระบบเป็นตัวเลข: รับได้กี่ request ต่อวินาที
 * ก่อนที่ latency จะพุ่งและเริ่มล้ม
 *
 * ประเภทไฟล์: test script / capacity planning — **ไม่ใช่ด่าน CI**
 *
 * ต่างจาก stress test ที่คุมจำนวน "คน" (VU) — ตัวนี้คุมจำนวน "งานที่เข้ามา" (arrival rate)
 * ซึ่งเป็นหน่วยที่วางแผน capacity ได้จริง: ถ้าระบบรับได้ 3 req/s แต่วันส่งงานมี
 * นักศึกษา 100 คนกดพร้อมกัน เราขาดกำลังเท่าไรคำนวณออกมาได้ตรง ๆ
 *
 * ยิงเฉพาะ endpoint หนัก 4 ตัว (recompute / reports / export / my-score) เพราะเพดาน
 * ของระบบถูกกำหนดโดยงาน aggregate พวกนี้ ไม่ใช่โดย autosave ที่เบา
 * ค่า pe_latency_by_rate นับเฉพาะ response 200 — ถ้ารวม error ที่ fail เร็วเข้าไปด้วย
 * ค่า p95 จะ "ดูดีขึ้น" ตอนระบบพัง ซึ่งอ่านผิดทั้งหมด
 *
 * executor นี้มี dropped_iterations: ถ้าระบบรับ rate ที่ตั้งไว้ไม่ทัน k6 จะทิ้ง iteration
 * — เลขนั้นในรายงานคือหลักฐานตรง ๆ ว่าเกินเพดานแล้ว
 *
 * รัน:
 *   cd k6 && k6 run breakpoint.js
 *   cd k6 && PE_BP_START_RATE=1 PE_BP_MAX_RATE=8 PE_BP_STEPS=8 k6 run breakpoint.js
 */
import exec from 'k6/execution';
import { Trend } from 'k6/metrics';
import { assertSafeTarget, LOAD, SUMMARY_TREND_STATS, SETUP_TIMEOUT, parseDuration } from './lib/config.js';
import { EP, get, post, login } from './lib/api.js';
import { buildThresholds } from './lib/thresholds.js';
import { provisionFixture, describeFixture } from './lib/fixture.js';
import { makeHandleSummary } from './lib/summary.js';

const ENDPOINTS = [EP.RECOMPUTE, EP.REPORT_INDIVIDUAL, EP.EXPORT_CSV, EP.MY_SCORE];

/** latency ของ request ที่สำเร็จ แยกตาม arrival rate เป้าหมายของขั้นนั้น */
const latencyByRate = new Trend('pe_latency_by_rate', true);

// ---------------------------------------------------------------- ขั้นของ rate ----
const STEPS = Math.max(2, Number(__ENV.PE_BP_STEPS || 5));
const STEP_MS = parseDuration(LOAD.breakpointStep);
const RAMP = '2s';                            // ไต่เข้าสู่ rate ใหม่เร็ว ๆ แล้วค้างไว้ให้นิ่ง
const RAMP_MS = parseDuration(RAMP);
const SLOT_MS = RAMP_MS + STEP_MS;            // ความยาวจริงของ 1 ขั้น

/** rate เป้าหมายของแต่ละขั้น ไล่เป็นเส้นตรงจาก start ไป max */
const RATES = (function () {
  const out = [];
  const lo = LOAD.breakpointStartRate;
  const hi = LOAD.breakpointMaxRate;
  for (let i = 0; i < STEPS; i++) {
    out.push(Math.max(1, Math.round(lo + ((hi - lo) * i) / (STEPS - 1))));
  }
  return out;
})();

const STAGES = (function () {
  const out = [];
  for (const r of RATES) {
    out.push({ duration: RAMP, target: r });
    out.push({ duration: LOAD.breakpointStep, target: r });
  }
  return out;
})();

function extraThresholds() {
  const out = { pe_hard_failures: ['count<1'] };
  // เปิด submetric ของทุกขั้นเพื่อให้ตาราง "latency เทียบ arrival rate" มีแถวครบ
  for (const r of RATES) out[`pe_latency_by_rate{rate:${r}}`] = ['max>=0'];
  if (__ENV.PE_BP_ABORT === 'yes') {
    // โหมด breakpoint แบบคลาสสิก: พอ error rate เกิน 10% ก็ไม่ต้องยิงต่อ เพดานคือตรงนี้
    out.http_req_failed = [{ threshold: 'rate<0.1', abortOnFail: true, delayAbortEval: '30s' }];
  }
  return out;
}

export const options = {
  scenarios: {
    ladder: {
      executor: 'ramping-arrival-rate',
      startRate: LOAD.breakpointStartRate,
      timeUnit: '1s',
      stages: STAGES,
      // ต้องมี VU พอให้ k6 เปิด request ตาม rate ได้ แม้ตอนแต่ละ request ช้ามาก
      preAllocatedVUs: Math.max(10, LOAD.breakpointMaxRate * 2),
      maxVUs: LOAD.maxVus,
      gracefulStop: '60s',
    },
  },
  thresholds: buildThresholds(ENDPOINTS, extraThresholds()),
  summaryTrendStats: SUMMARY_TREND_STATS,
  setupTimeout: SETUP_TIMEOUT,
  tags: { suite: 'paireval', scenario: 'breakpoint' },
};

export function setup() {
  assertSafeTarget();
  const fx = provisionFixture();
  describeFixture(fx);
  // login ล่วงหน้าทั้งสองบทบาท เพื่อไม่ให้ latency ของ /auth/google ปนเข้ามาในเพดานที่วัด
  const student = login(fx.students[0], 'K6 Breakpoint Student');
  fx.studentToken = student ? student.token : null;
  console.log(`[breakpoint] ไล่ rate: ${RATES.join(' -> ')} req/s (ขั้นละ ${LOAD.breakpointStep})`);
  return fx;
}

/** rate เป้าหมายของขั้นที่กำลังรันอยู่ ใช้เป็น tag */
function currentRate() {
  let elapsed = 0;
  try {
    const t = exec.scenario.startTime;
    if (t) elapsed = Date.now() - t;
  } catch (e) { /* ไม่มี scenario context */ }
  const idx = Math.min(RATES.length - 1, Math.floor(elapsed / SLOT_MS));
  return RATES[idx];
}

function record(res, rate) {
  // นับเฉพาะที่สำเร็จ — error ที่ fail เร็วจะทำให้ p95 ดูดีขึ้นตอนระบบพัง
  if (res.status === 200) latencyByRate.add(res.timings.duration, { rate: String(rate) });
}

export default function (fx) {
  const rate = currentRate();
  const a = fx.assignmentId;

  record(post(`/assignments/${a}:recompute`, {}, EP.RECOMPUTE, fx.ownerToken, [200]), rate);
  record(get(`/assignments/${a}/reports/individual`, EP.REPORT_INDIVIDUAL, fx.ownerToken, [200]), rate);
  record(get(`/assignments/${a}/export/csv?report=raw&mask_identities=true`, EP.EXPORT_CSV, fx.ownerToken, [200]), rate);

  if (fx.studentToken) {
    record(get(`/assignments/${a}/my-score`, EP.MY_SCORE, fx.studentToken, [200]), rate);
  }
  // ไม่มี sleep โดยเจตนา — executor คุมจังหวะด้วย arrival rate อยู่แล้ว
  // ถ้าใส่ think time ที่นี่จะกลายเป็นการจำกัด rate ซ้อนกันสองชั้น
}

export const handleSummary = makeHandleSummary('breakpoint');
