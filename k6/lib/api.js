import http from 'k6/http';
import { BASE_URL, API_PREFIX } from './config.js';

export const EP = {
  LOGIN: 'auth/google',
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
  const payload = JSON.stringify({ token: `mock_token_for_${email}`, role: email.includes('instructor') ? 'instructor' : 'student' });
  const params = { headers: { 'Content-Type': 'application/json' }, tags: { name: EP.LOGIN } };
  const res = http.post(url, payload, params);
  
  if (res.status === 200) {
      try { return res.json().access_token; } catch(e) { return 'fake-token'; }
  }
  return 'fake-token';
}

export function get(endpoint, token) {
  const url = `${BASE_URL}${API_PREFIX}/${endpoint}`;
  const params = {
    headers: { 'Authorization': `Bearer ${token}` },
    tags: { name: endpoint.split('?')[0].split('/')[0] } 
  };
  return http.get(url, params);
}

export function post(endpoint, payload, token) {
  const url = `${BASE_URL}${API_PREFIX}/${endpoint}`;
  const params = {
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    tags: { name: endpoint.split('?')[0].split('/')[0] } 
  };
  return http.post(url, JSON.stringify(payload), params);
}
