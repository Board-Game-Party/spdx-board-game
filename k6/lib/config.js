export const BASE_URL = __ENV.PE_BASE_URL || __ENV.BASE_URL || 'http://localhost:8000';
export const API_PREFIX = __ENV.PE_API_PREFIX || '/api';

export const LOAD = {
  vus: Number(__ENV.PE_VUS || 20),
  rampUp: __ENV.PE_RAMP_UP || '30s',
  steady: __ENV.PE_STEADY || '1m',
  rampDown: __ENV.PE_RAMP_DOWN || '20s',
};

export const SUMMARY_TREND_STATS = ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'];
export const SETUP_TIMEOUT = __ENV.PE_SETUP_TIMEOUT || '10m';

export function assertSafeTarget() {
  const allowRemote = __ENV.PE_ALLOW_REMOTE === 'yes';
  const isLocal = BASE_URL.includes('localhost') || BASE_URL.includes('127.0.0.1');
  if (!isLocal && !allowRemote) {
    throw new Error('Unsafe target detected! Set PE_ALLOW_REMOTE=yes to run against non-localhost');
  }
}

export function parseDuration(d) {
  if (!d) return 0;
  const match = d.match(/(\d+)(s|m|h)/);
  if (!match) return parseInt(d, 10);
  const val = parseInt(match[1], 10);
  if (match[2] === 's') return val * 1000;
  if (match[2] === 'm') return val * 60000;
  if (match[2] === 'h') return val * 3600000;
  return val;
}

export function totalDuration(...durations) {
  return durations.reduce((acc, d) => acc + parseDuration(d), 0) + 'ms';
}

export function thinkTime(min = 0.5, max = 2.5) {
  const tMin = Number(__ENV.PE_THINK_MIN || min);
  const tMax = Number(__ENV.PE_THINK_MAX || max);
  const ms = tMin + Math.random() * (tMax - tMin);
  return ms;
}

export function phaseTag(elapsedMs, totalMs) {
  if (elapsedMs < totalMs * 0.2) return 'warmup';
  if (elapsedMs > totalMs * 0.8) return 'cooldown';
  return 'steady';
}
