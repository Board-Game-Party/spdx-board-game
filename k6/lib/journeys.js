import { check, sleep } from 'k6';
import { Rate, Counter, Trend } from 'k6/metrics';
import { login, get, post, EP } from './api.js';
import { thinkTime } from './config.js';

export const submitSuccessRate = new Rate('pe_submit_success');
export const businessErrors = new Counter('pe_business_errors');
export const hardFailures = new Counter('pe_hard_failures');
export const flowDuration = new Trend('pe_flow_duration');

export function sessionFor(email) {
  const token = login(email);
  return { email, token };
}

export function studentJourney(email, assignmentId, options = {}) {
  const start = Date.now();
  const token = login(email);
  
  const notifRes = get('notifications', token);
  check(notifRes, { 'notif 200': (r) => r.status === 200 }) || businessErrors.add(1);
  if (options.think !== false) sleep(thinkTime(1, 2));

  const wsUrl = `assignments/${assignmentId}/evaluations`;
  const wsRes = get(wsUrl, token);
  check(wsRes, { 'worksheet 200': (r) => r.status === 200 }) || businessErrors.add(1);
  if (options.think !== false) sleep(thinkTime(2, 4));

  // Get pair_assignment_id from worksheet
  let pairId = 'mock-id';
  try {
    const ws = wsRes.json();
    if (ws.sections && ws.sections.length > 0 && ws.sections[0].comparisons.length > 0) {
      pairId = ws.sections[0].comparisons[0].pair_assignment_id;
    }
  } catch(e) {}

  const draftUrl = `evaluations/draft`;
  const draftRes = post(draftUrl, { pair_assignment_id: pairId, choice: 5, time_on_task_ms: 1000 }, token);
  check(draftRes, { 'draft 200/201': (r) => r.status === 200 || r.status === 201 }) || businessErrors.add(1);
  if (options.think !== false) sleep(thinkTime(1, 2));

  const submitUrl = `assignments/${assignmentId}/evaluations:submit`;
  const submitRes = post(submitUrl, { side: "GROUP", confirm_incomplete: true }, token);
  const success = check(submitRes, { 'submit 200': (r) => r.status === 200 });
  submitSuccessRate.add(success);
  if (!success) businessErrors.add(1);
  
  if (options.think !== false) sleep(thinkTime(2, 4));
  get(`assignments/${assignmentId}/my-score`, EP.MY_SCORE, token);
  
  flowDuration.add(Date.now() - start, { flow: 'student_journey' });
}

export function studentReadOnlyJourney(email, assignmentId, options = {}) {
  const start = Date.now();
  const token = login(email);
  
  get('auth/me', token);
  if (options.think !== false) sleep(thinkTime());

  get('notifications', token);
  if (options.think !== false) sleep(thinkTime());
  
  get(`assignments/${assignmentId}/evaluations`, "evaluations", token);
  if (options.checkScore !== false) {
    get(`assignments/${assignmentId}/my-score`, EP.MY_SCORE, token);
  }
  
  flowDuration.add(Date.now() - start, { flow: 'student_readonly' });
}

export function instructorReportJourney(token, fx) {
  const start = Date.now();
  const rGroup = get(`assignments/${fx.assignmentId}/reports/group`, EP.REPORT_GROUP, token);
  check(rGroup, { 'report group 200': (r) => r.status === 200 }) || businessErrors.add(1);
  sleep(thinkTime(2, 3));

  const rQual = get(`assignments/${fx.assignmentId}/reports/coverage`, EP.REPORT_COVERAGE, token);
  check(rQual, { 'report quality 200': (r) => r.status === 200 }) || businessErrors.add(1);
  sleep(thinkTime(2, 3));
  
  flowDuration.add(Date.now() - start, { flow: 'instructor_reports' });
}

export function exportJourney(token, fx) {
  const start = Date.now();
  const exCsv = get(`assignments/${fx.assignmentId}/export/csv`, EP.EXPORT_CSV, token);
  check(exCsv, { 'export csv 200': (r) => r.status === 200 }) || businessErrors.add(1);
  sleep(thinkTime());
  flowDuration.add(Date.now() - start, { flow: 'export' });
}

export function recomputeJourney(token, fx) {
  const start = Date.now();
  const recomp = post(`assignments/${fx.assignmentId}:recompute`, {}, EP.RECOMPUTE, token);
  check(recomp, { 'recompute 200': (r) => r.status === 200 }) || businessErrors.add(1);
  flowDuration.add(Date.now() - start, { flow: 'recompute' });
}

export function evaluateSide(email, assignmentId, options = {}) {
  const start = Date.now();
  const token = login(email);
  post(`evaluations/draft`, { pair_assignment_id: 'mock', choice: 4, time_on_task_ms: 1000 }, token);
  flowDuration.add(Date.now() - start, { flow: 'evaluate_GROUP' });
}
