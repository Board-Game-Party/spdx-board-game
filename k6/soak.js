/**
 * k6/soak.js
 * ----------------------------------------------------------------------------
 * soak test — โหลดระดับ "ปกติ" แต่ลากยาว เพื่อหาสิ่งที่โผล่เฉพาะเมื่อเวลาผ่านไป
 *
 * ประเภทไฟล์: test script
 *
 * สิ่งที่ load test 2 นาทีมองไม่เห็น แต่ soak เห็น: memory leak, connection pool ที่
 * ไม่ถูกคืน, ตารางที่โตขึ้นจนคิวรีช้าลง, cache ที่ค่อย ๆ เสื่อม
 *
 * กลไกที่ใช้จับ: tag ทุก metric ของ VU ด้วยช่วงเวลา early / mid / late
 * (`exec.vu.tags` ติดไปกับทุก metric ที่ VU นั้นปล่อยออกมา) แล้วให้รายงานเทียบ p95
 * ของช่วงท้ายกับช่วงต้น — ถ้าโหลดเท่ากันแต่ p95 ไต่ขึ้น นั่นคือสัญญาณ resource leak
 *
 * รัน:
 *   cd k6 && k6 run soak.js
 *   cd k6 && PE_SOAK_DURATION=30m PE_SOAK_VUS=12 k6 run soak.js
 */
import exec from 'k6/execution';
import { sleep } from 'k6';
import {
  assertSafeTarget, LOAD, SUMMARY_TREND_STATS, SETUP_TIMEOUT, parseDuration, phaseTag, thinkTime,
} from './lib/config.js';
import { EP } from './lib/api.js';
import { buildThresholds } from './lib/thresholds.js';
import { provisionFixture, describeFixture } from './lib/fixture.js';
import {
  sessionFor, studentReadOnlyJourney, evaluateSide, instructorReportJourney,
} from './lib/journeys.js';
import { makeHandleSummary } from './lib/summary.js';

const ENDPOINTS = [
  EP.LOGIN, EP.ME, EP.NOTIFICATIONS,
  EP.WORKSHEET, EP.DRAFT, EP.SUBMIT, EP.MY_SCORE,
  EP.REPORT_GROUP, EP.REPORT_INDIVIDUAL, EP.REPORT_COVERAGE, EP.REPORT_QUALITY, EP.AUDIT,
];

const FLOWS = ['student_readonly', 'evaluate_GROUP', 'instructor_reports'];
const PHASES = ['early', 'mid', 'late'];

function extraThresholds() {
  const out = { pe_submit_success: ['rate>0.99'] };
  for (const f of FLOWS) out[`pe_flow_duration{flow:${f}}`] = ['max>=0'];
  // submetric ของ tag จะโผล่ในผลสรุปเฉพาะเมื่อมี threshold อ้างถึง — 3 เส้นนี้คือตัวเปิดตาราง drift
  for (const p of PHASES) out[`http_req_duration{phase:${p}}`] = ['max>=0'];
  return out;
}

const DURATION = LOAD.soakDuration;
const TOTAL_MS = parseDuration(DURATION);
// อาจารย์เปิดรายงานเป็นระยะ ไม่ได้นั่งรีเฟรชทั้งวัน
const INSTRUCTOR_PAUSE = Number(__ENV.PE_INSTRUCTOR_PAUSE || 25);

export const options = {
  scenarios: {
    // คนส่วนใหญ่แค่เข้ามาดู — โหลดอ่านคงที่คือสภาพปกติของระบบนี้
    readers: {
      executor: 'constant-vus',
      vus: LOAD.soakVus,
      duration: DURATION,
      exec: 'readers',
      gracefulStop: '30s',
    },
    // คนส่วนน้อยเขียนจริง — arrival rate คงที่ทำให้ปริมาณงานเขียนไม่แกว่งตามความช้าของระบบ
    writers: {
      executor: 'constant-arrival-rate',
      rate: Number(__ENV.PE_SOAK_WRITE_RATE || 6),
      timeUnit: '1m',
      duration: DURATION,
      preAllocatedVUs: 4,
      maxVUs: 20,
      exec: 'writers',
      gracefulStop: '60s',
    },
    instructor: {
      executor: 'constant-vus',
      vus: 1,
      duration: DURATION,
      exec: 'instructor',
      gracefulStop: '60s',
    },
  },
  thresholds: buildThresholds(ENDPOINTS, extraThresholds()),
  summaryTrendStats: SUMMARY_TREND_STATS,
  setupTimeout: SETUP_TIMEOUT,
  tags: { suite: 'paireval', scenario: 'soak' },
};

export function setup() {
  assertSafeTarget();
  const fx = provisionFixture();
  describeFixture(fx);
  return fx;
}

/** เวลาที่ผ่านไปนับจาก scenario เริ่ม — ไม่นับเวลาที่ setup() ใช้สร้าง fixture */
function elapsedMs() {
  try {
    const t = exec.scenario.startTime;
    if (t) return Date.now() - t;
  } catch (e) { /* ไม่มี scenario context */ }
  return 0;
}

/** ติด tag ช่วงเวลาให้ทุก metric ของ VU นี้ในรอบนี้ */
function markPhase() {
  exec.vu.tags.phase = phaseTag(elapsedMs(), TOTAL_MS);
}

function studentFor(fx, offset) {
  const n = fx.students.length;
  return fx.students[(exec.scenario.iterationInTest + (offset || 0)) % n];
}

export function readers(fx) {
  markPhase();
  // /my-score แพงกว่า endpoint อื่นมาก (รัน scoring engine ใหม่ทั้ง assignment)
  // เปิดแค่ 1 ใน 4 รอบ ไม่งั้น soak จะกลายเป็น overload test
  const checkScore = exec.scenario.iterationInTest % 4 === 0;
  studentReadOnlyJourney(studentFor(fx, 0), fx.assignmentId, { checkScore: checkScore });
}

export function writers(fx) {
  markPhase();
  // เลือกจากท้าย roster เพื่อไม่ให้ชนกับ readers ที่ไล่จากหัว
  const email = studentFor(fx, Math.floor(fx.students.length / 2));
  const s = sessionFor(email);
  if (!s) return;
  evaluateSide(s.token, fx.assignmentId, 'GROUP', { batchSize: 1, think: true });
}

export function instructor(fx) {
  markPhase();
  const owner = sessionFor(fx.ownerEmail) || { token: fx.ownerToken };
  instructorReportJourney(owner.token, fx);
  sleep(INSTRUCTOR_PAUSE + thinkTime());
}

export const handleSummary = makeHandleSummary('soak');
