export function buildThresholds(endpoints, additionalThresholds = {}) {
  const t = {
    'http_req_failed': ['rate<0.01'],
    ...additionalThresholds
  };
  
  endpoints.forEach(ep => {
    if (!ep) return;
    
    // Determine tier
    let tier = 'job';
    if (ep.includes('auth') || ep.includes('notifications') || ep.includes('draft')) {
      tier = 'interactive';
    } else if (ep.includes('reports') || ep.includes('evaluations') || ep.includes('submit')) {
      tier = 'screen';
    }

    let p95 = 30000;
    if (tier === 'interactive') p95 = 200;
    else if (tier === 'screen') p95 = 3000;
    
    // Create tags mapping for k6 thresholds
    const baseName = ep.split('?')[0].split('/')[0];
    t[`http_req_duration{name:${baseName}}`] = [`p(95)<${p95}`];
  });
  
  return t;
}
