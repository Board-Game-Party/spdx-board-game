import { check } from 'k6';
import { login, get, post, EP } from './api.js';
import { thinkTime } from './config.js';
import { sleep } from 'k6';

export function sessionFor(email) {
  const token = login(email);
  return { email, token };
}

export function studentJourney(fx, session) {
  // 1. Check notifications
  const notifRes = get(EP.NOTIFICATIONS, session.token);
  check(notifRes, { 'notif 200': (r) => r.status === 200 });
  sleep(thinkTime(1, 2));

  // 2. Get assignment details/worksheet
  const wsUrl = `${EP.WORKSHEET}?assignment_id=${fx.assignmentId}`;
  const wsRes = get(wsUrl, session.token);
  check(wsRes, { 'worksheet 200': (r) => r.status === 200 });
  sleep(thinkTime(2, 4));

  // 3. Draft evaluation
  const draftUrl = `${EP.DRAFT}?assignment_id=${fx.assignmentId}`;
  const draftPayload = { scores: { 'criteria-1': 5 } };
  const draftRes = post(draftUrl, draftPayload, session.token);
  check(draftRes, { 'draft 200/201': (r) => r.status === 200 || r.status === 201 });
  sleep(thinkTime(1, 2));

  // 4. Submit evaluation
  const submitUrl = `${EP.SUBMIT}?assignment_id=${fx.assignmentId}`;
  const submitRes = post(submitUrl, { final: true }, session.token);
  check(submitRes, { 'submit 200': (r) => r.status === 200 });
  
  // 5. My score (some time later)
  sleep(thinkTime(2, 4));
  get(`${EP.MY_SCORE}?assignment_id=${fx.assignmentId}`, session.token);
}

export function instructorReportJourney(fx, session) {
  // 1. Group report
  const rGroup = get(`${EP.REPORT_GROUP}?assignment_id=${fx.assignmentId}`, session.token);
  check(rGroup, { 'report group 200': (r) => r.status === 200 });
  sleep(thinkTime(2, 3));

  // 2. Quality report
  const rQual = get(`${EP.REPORT_QUALITY}?assignment_id=${fx.assignmentId}`, session.token);
  check(rQual, { 'report quality 200': (r) => r.status === 200 });
  sleep(thinkTime(2, 3));
}

export function exportJourney(fx, session) {
  const exCsv = get(`${EP.EXPORT_CSV}?assignment_id=${fx.assignmentId}`, session.token);
  check(exCsv, { 'export csv 200': (r) => r.status === 200 });
  sleep(thinkTime());
}

export function recomputeJourney(fx, session) {
  const recomp = post(`${EP.RECOMPUTE}?assignment_id=${fx.assignmentId}`, {}, session.token);
  check(recomp, { 'recompute 200': (r) => r.status === 200 });
}

// For soak.js
export function studentReadOnlyJourney(fx, session) {
  get(EP.NOTIFICATIONS, session.token);
  sleep(thinkTime());
  get(`${EP.WORKSHEET}?assignment_id=${fx.assignmentId}`, session.token);
}

export function evaluateSide(fx, session) {
  post(`${EP.DRAFT}?assignment_id=${fx.assignmentId}`, { scores: { 'criteria-1': 4 } }, session.token);
}
