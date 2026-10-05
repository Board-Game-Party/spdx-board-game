/**
 * k6/stress.js
 * ----------------------------------------------------------------------------
 * stress test — ดันเกินกำลังเพื่อดูว่าระบบ "พังอย่างไร" ไม่ใช่ "พังที่เท่าไร"
 *
 * ประเภทไฟล์: test script / exploratory — **ไม่ใช่ด่าน CI**
 *
 * lecture.md §4: คุณค่าของ stress test อยู่ที่รูปแบบความล้มเหลว
 *   - 429 / 503            = ปฏิเสธอย่างสุภาพ ผู้ใช้รู้ว่าต้องลองใหม่  (ยอมรับได้)
 *   - 500 / timeout / 0    = ล้ม ผู้ใช้เห็นหน้าขาวหรือค้าง             (ยอมรับไม่ได้)
 * threshold ราย endpoint ในนี้จึงคาดว่าจะแดง — สิ่งที่ต้องอ่านคือ pe_degraded_responses
 * เทียบ pe_hard_failures ในรายงาน
 *
 * โหมด batch: ใช้ POST /evaluations/draft:batch แทน autosave ทีละข้อ
 * เพื่ออัดคำตอบจำนวนมากต่อ request — ดันคอขวดไปอยู่ที่ฝั่งเขียน DB ไม่ใช่ฝั่งจำนวน request
 *
 * รัน:
 *   cd k6 && k6 run stress.js
 *   cd k6 && PE_STRESS_PEAK=200 k6 run stress.js
 */
import exec from 'k6/execution';
import { sleep } from 'k6';
import { assertSafeTarget, LOAD, SUMMARY_TREND_STATS, SETUP_TIMEOUT, thinkTime } from './lib/config.js';
import { EP } from './lib/api.js';
import { buildThresholds } from './lib/thresholds.js';
import { provisionFixture, describeFixture } from './lib/fixture.js';
import { sessionFor, studentJourney, instructorReportJourney } from './lib/journeys.js';
import { makeHandleSummary } from './lib/summary.js';

const ENDPOINTS = [
  EP.LOGIN, EP.NOTIFICATIONS,
  EP.WORKSHEET, EP.DRAFT_BATCH, EP.SUBMIT,
  EP.REPORT_GROUP, EP.REPORT_INDIVIDUAL, EP.REPORT_COVERAGE, EP.REPORT_QUALITY, EP.AUDIT,
];

const FLOWS = ['student_journey', 'evaluate_GROUP', 'evaluate_INDIVIDUAL', 'instructor_reports'];

function flowThresholds() {
  const out = {};
  for (const f of FLOWS) out[`pe_flow_duration{flow:${f}}`] = ['max>=0'];
  return out;
}

const BATCH_SIZE = Number(__ENV.PE_BATCH_SIZE || 4);

export const options = {
  scenarios: {
    // ขึ้นเป็นขั้น: ระดับปกติ -> 2 เท่า -> peak แล้วตัดลงทันที
    // การตัดลงเร็วมีประโยชน์: ดูว่าระบบ "ฟื้น" ได้ไหมหลังโหลดหาย หรือค้างต่อ
    students: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: LOAD.rampUp, target: LOAD.vus },
        { duration: LOAD.rampUp, target: LOAD.vus * 2 },
        { duration: LOAD.steady, target: LOAD.stressPeak },
        { duration: LOAD.rampDown, target: 0 },
      ],
      exec: 'students',
      gracefulRampDown: '30s',
    },
    instructor: {
      executor: 'constant-vus',
      vus: 1,
      duration: '30s',
      startTime: LOAD.rampUp,   // เข้ามาตอนโหลดเริ่มสูงแล้ว
      exec: 'instructor',
      gracefulStop: '60s',
    },
  },
  thresholds: buildThresholds(ENDPOINTS, Object.assign({
    // 2 เส้นนี้คือสิ่งที่ "ห้ามพัง" แม้ตอนโหลดเกิน — ปฏิเสธได้ แต่ห้ามล้ม
    pe_hard_failures: ['count<1'],
    pe_submit_success: ['rate>0.95'],
  }, flowThresholds())),
  summaryTrendStats: SUMMARY_TREND_STATS,
  setupTimeout: SETUP_TIMEOUT,
  tags: { suite: 'paireval', scenario: 'stress' },
};

export function setup() {
  assertSafeTarget();
  const fx = provisionFixture();
  describeFixture(fx);
  return fx;
}

function studentFor(fx) {
  return fx.students[exec.scenario.iterationInTest % fx.students.length];
}

export function students(fx) {
  studentJourney(studentFor(fx), fx.assignmentId, {
    batchSize: BATCH_SIZE,
    think: true,
    checkScore: false,   // /my-score รัน scoring engine ใหม่ทั้งชุด — เปิดตอน stress จะกลายเป็นวัด endpoint เดียว
  });
}

export function instructor(fx) {
  const owner = sessionFor(fx.ownerEmail) || { token: fx.ownerToken };
  instructorReportJourney(owner.token, fx);
  sleep(thinkTime());
}

export const handleSummary = makeHandleSummary('stress');
