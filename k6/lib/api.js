import http from 'k6/http';
import { BASE_URL, API_PREFIX } from './config.js';
import { check } from 'k6';

export const EP = {
  LOGIN: 'auth/google',
  ME: 'auth/me',
  NOTIFICATIONS: 'notifications',
  WORKSHEET: 'evaluations/worksheet',
  DRAFT: 'evaluations/draft',
  SUBMIT: 'evaluations/submit',
  MY_SCORE: 'my-score',
  REPORT_GROUP: 'reports/group',
  REPORT_INDIVIDUAL: 'reports/individual',
  REPORT_COVERAGE: 'reports/coverage',
  REPORT_QUALITY: 'reports/quality',
  AUDIT: 'audit/logs',
  EXPORT_CSV: 'export/csv',
  EXPORT_XLSX: 'export/xlsx',
  RECOMPUTE: 'recompute'
};

export function login(email) {
  const url = `${BASE_URL}${API_PREFIX}/${EP.LOGIN}`;
  const payload = JSON.stringify({ email: email });
  const params = { headers: { 'Content-Type': 'application/json' }, tags: { name: EP.LOGIN } };
  const res = http.post(url, payload, params);
  
  if (res.status === 200) {
      try { return res.json().access_token; } catch(e) { return 'fake-token'; }
  }
  return 'fake-token';
}

export function get(endpoint, tagName, token, expectedStatuses) {
  // If tagName is actually token (for backward compatibility with journeys.js)
  if (typeof tagName === 'string' && tagName.length > 50) {
    token = tagName;
    tagName = endpoint.split('?')[0].split('/')[0];
  }

  const url = `${BASE_URL}${API_PREFIX}/${endpoint}`;
  const params = {
    headers: { 'Authorization': `Bearer ${token}` },
    tags: { name: tagName || endpoint.split('?')[0].split('/')[0] } 
  };
  const res = http.get(url, params);
  checkHardFailure(res);
  return res;
}

export function post(endpoint, payload, tagName, token, expectedStatuses) {
  if (typeof tagName === 'string' && tagName.length > 50) {
    token = tagName;
    tagName = endpoint.split('?')[0].split('/')[0];
  }

  const url = `${BASE_URL}${API_PREFIX}/${endpoint}`;
  const params = {
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    tags: { name: tagName || endpoint.split('?')[0].split('/')[0] } 
  };
  const res = http.post(url, JSON.stringify(payload), params);
  checkHardFailure(res);
  return res;
}

import { Counter } from 'k6/metrics';
export const hardFailures = new Counter('pe_hard_failures');

export function checkHardFailure(res) {
  if (res.status >= 500 || res.error) {
    hardFailures.add(1);
  }
}
