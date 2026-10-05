/**
 * k6/smoke.js
 * ----------------------------------------------------------------------------
 * smoke test — 1 VU, 1 iteration, เดินครบทุก journey ของระบบหนึ่งรอบ
 *
 * ประเภทไฟล์: test script
 *
 * จุดประสงค์ไม่ใช่การวัดภาระ แต่คือ "ยืนยันว่าสคริปต์ยิงติดและ contract ยังไม่เปลี่ยน"
 * (lecture.md §4) — ถ้า smoke แดง อย่าเสียเวลารัน load ต่อ เพราะเลขที่ได้จะอ่านไม่ได้อยู่ดี
 *
 * รัน:
 *   cd k6 && k6 run smoke.js
 */
import { assertSafeTarget, SUMMARY_TREND_STATS, SETUP_TIMEOUT } from './lib/config.js';
import { EP } from './lib/api.js';
import { buildThresholds } from './lib/thresholds.js';
import { provisionFixture, describeFixture } from './lib/fixture.js';
import {
  sessionFor, studentJourney, studentReadOnlyJourney,
  instructorReportJourney, exportJourney, recomputeJourney,
} from './lib/journeys.js';
import { makeHandleSummary } from './lib/summary.js';

/** endpoint ที่ scenario นี้ยิงจริง — ใช้ตั้ง threshold ราย endpoint และ "เปิด" submetric ให้รายงาน */
const ENDPOINTS = [
  EP.LOGIN, EP.ME, EP.NOTIFICATIONS,
  EP.WORKSHEET, EP.DRAFT, EP.SUBMIT, EP.MY_SCORE,
  EP.REPORT_GROUP, EP.REPORT_INDIVIDUAL, EP.REPORT_COVERAGE, EP.REPORT_QUALITY, EP.AUDIT,
  EP.EXPORT_CSV, EP.EXPORT_XLSX, EP.RECOMPUTE,
];

/** flow ที่อยากเห็นในตาราง "เวลาต่อ 1 user journey" — k6 โชว์ submetric เฉพาะที่มี threshold อ้างถึง */
const FLOWS = [
  'student_journey', 'student_readonly', 'evaluate_GROUP', 'evaluate_INDIVIDUAL',
  'instructor_reports', 'export', 'recompute',
];

function flowThresholds() {
  const out = {};
  // threshold หลวม ๆ ตั้งใจให้ผ่านเสมอ — หน้าที่ของมันคือเปิด submetric ไม่ใช่เป็นด่าน
  for (const f of FLOWS) out[`pe_flow_duration{flow:${f}}`] = ['max>=0'];
  return out;
}

export const options = {
  scenarios: {
    smoke: {
      executor: 'shared-iterations',
      vus: 1,
      iterations: 1,
      maxDuration: '15m',   // export/recompute ของ fixture 100 คนกินเวลาหลายวินาที
    },
  },
  thresholds: buildThresholds(ENDPOINTS, Object.assign({
    pe_submit_success: ['rate>0.99'],
    pe_business_errors: ['count<1'],   // smoke ต้องสะอาด ไม่มี error แม้แต่รายการเดียว
  }, flowThresholds())),
  summaryTrendStats: SUMMARY_TREND_STATS,
  setupTimeout: SETUP_TIMEOUT,
  // tag ติดทุก metric เพื่อแยกผลของ k6 ออกจาก traffic อื่นเวลาส่งเข้า Grafana/Prometheus
  tags: { suite: 'paireval', scenario: 'smoke' },
};

export function setup() {
  assertSafeTarget();
  const fx = provisionFixture();
  describeFixture(fx);
  return fx;
}

export default function (fx) {
  const student = fx.students[0];
  const second = fx.students[1] || student;

  // 1) นักศึกษาคนหนึ่งทำแบบประเมินครบทั้งสองฝั่ง แล้วเช็คคะแนนตัวเอง
  studentJourney(student, fx.assignmentId, { batchSize: 1, think: false });

  // 2) นักศึกษาอีกคนแค่เข้ามาดู — ครอบ /auth/me ที่ journey แบบเต็มไม่ได้ยิง
  studentReadOnlyJourney(second, fx.assignmentId, { checkScore: false });

  // 3) ฝั่งอาจารย์: รายงาน 4 ชุด + audit, recompute, แล้ว export
  //    ใช้ token ของ owner จาก setup() เส้นเดียว (คนเดียว login ครั้งเดียว)
  const owner = sessionFor(fx.ownerEmail) || { token: fx.ownerToken };
  instructorReportJourney(owner.token, fx);
  recomputeJourney(owner.token, fx);
  exportJourney(owner.token, fx);
}

export const handleSummary = makeHandleSummary('smoke');
