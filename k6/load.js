/**
 * k6/load.js
 * ----------------------------------------------------------------------------
 * load test — โหลดระดับ "วันส่งงานจริง" และเป็น **ด่าน pass/fail ของ CI**
 *
 * ประเภทไฟล์: test script / quality gate
 *
 * จำลองสองกลุ่มผู้ใช้ที่เกิดขึ้นพร้อมกันจริง ๆ (lecture.md §4: "ยิง endpoint เดียวรัว ๆ
 * ไม่ใช่ load test") — นักศึกษาหลายสิบคนกรอกแบบประเมินอยู่ ขณะที่อาจารย์เปิดรายงาน
 * และกด export ไปด้วย ความช้าของฝั่งอาจารย์จึงเป็นความช้าที่นักศึกษาต้องรับไปด้วย
 *
 * รัน:
 *   cd k6 && k6 run load.js
 *   cd k6 && PE_VUS=40 PE_STEADY=3m k6 run load.js
 */
import { sleep } from 'k6';
import exec from 'k6/execution';
import {
  assertSafeTarget, LOAD, SUMMARY_TREND_STATS, SETUP_TIMEOUT, totalDuration, thinkTime,
} from './lib/config.js';
import { EP } from './lib/api.js';
import { buildThresholds } from './lib/thresholds.js';
import { provisionFixture, describeFixture } from './lib/fixture.js';
import {
  sessionFor, studentJourney, instructorReportJourney, exportJourney, recomputeJourney,
} from './lib/journeys.js';
import { makeHandleSummary } from './lib/summary.js';

const ENDPOINTS = [
  EP.LOGIN, EP.NOTIFICATIONS,
  EP.WORKSHEET, EP.DRAFT, EP.SUBMIT, EP.MY_SCORE,
  EP.REPORT_GROUP, EP.REPORT_INDIVIDUAL, EP.REPORT_COVERAGE, EP.REPORT_QUALITY, EP.AUDIT,
  EP.EXPORT_CSV, EP.EXPORT_XLSX, EP.RECOMPUTE,
];

const FLOWS = [
  'student_journey', 'evaluate_GROUP', 'evaluate_INDIVIDUAL',
  'instructor_reports', 'export', 'recompute',
];

function flowThresholds() {
  const out = {};
  for (const f of FLOWS) out[`pe_flow_duration{flow:${f}}`] = ['max>=0'];
  return out;
}

const DURATION = totalDuration(LOAD.rampUp, LOAD.steady, LOAD.rampDown);
const INSTRUCTOR_PAUSE = Number(__ENV.PE_INSTRUCTOR_PAUSE || 15);

export const options = {
  scenarios: {
    // นักศึกษา: ไล่ขึ้นถึงเป้า คงที่ แล้วไล่ลง — ramp ช่วยแยก "ช้าเพราะ cold start"
    // ออกจาก "ช้าเพราะโหลด" ได้ เพราะเห็นว่า latency เริ่มไต่ตอน VU เท่าไร
    students: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: LOAD.rampUp, target: LOAD.vus },
        { duration: LOAD.steady, target: LOAD.vus },
        { duration: LOAD.rampDown, target: 0 },
      ],
      exec: 'students',
      gracefulRampDown: '30s',
    },
    // อาจารย์ 1 คนเปิดรายงาน/export อยู่ตลอดการรัน — ไม่ใช่โหลดหลัก แต่เป็นตัวกวนที่มีจริง
    instructor: {
      executor: 'constant-vus',
      vus: 1,
      duration: DURATION,
      exec: 'instructor',
      gracefulStop: '60s',   // export ของ fixture 100 คนอาจยังค้างอยู่ตอนหมดเวลา
    },
  },
  thresholds: buildThresholds(ENDPOINTS, Object.assign({
    pe_submit_success: ['rate>0.99'],
  }, flowThresholds())),
  summaryTrendStats: SUMMARY_TREND_STATS,
  setupTimeout: SETUP_TIMEOUT,
  tags: { suite: 'paireval', scenario: 'load' },
};

export function setup() {
  assertSafeTarget();
  const fx = provisionFixture();
  describeFixture(fx);
  return fx;
}

/**
 * นักศึกษาคนละคนต่อ iteration — ถ้าให้ VU เดียวเป็นคนเดิมซ้ำ ๆ จะได้เปรียบจาก
 * cache/connection ที่อุ่นแล้ว และ submit ซ้ำคนเดิมก็ไม่ใช่พฤติกรรมจริง
 */
function studentFor(fx) {
  const i = exec.scenario.iterationInTest % fx.students.length;
  return fx.students[i];
}

export function students(fx) {
  studentJourney(studentFor(fx), fx.assignmentId, {
    batchSize: 1,       // autosave ทีละข้อ = พฤติกรรมของ UI จริง
    think: true,        // ไม่มี think time เท่ากับวัด bot ไม่ใช่คน
    checkScore: true,
  });
}

export function instructor(fx) {
  const owner = sessionFor(fx.ownerEmail) || { token: fx.ownerToken };
  const iter = exec.scenario.iterationInTest;

  instructorReportJourney(owner.token, fx);

  // recompute ทั้ง assignment ครั้งเดียว — ยิงรัวไม่สะท้อนของจริง (อาจารย์กดไม่กี่ครั้ง)
  if (iter === 0) recomputeJourney(owner.token, fx);

  // export เว้นรอบ — เป็นงานหนักที่เกิดเป็นครั้งคราว ไม่ใช่ทุกครั้งที่เปิดหน้ารายงาน
  if (iter % 2 === 1) exportJourney(owner.token, fx);

  sleep(INSTRUCTOR_PAUSE + thinkTime());
}

export const handleSummary = makeHandleSummary('load');
