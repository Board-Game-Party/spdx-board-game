import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.2/index.js';

export function makeHandleSummary(filenamePrefix) {
  return function(data) {
    const jsonFile = `./results/${filenamePrefix}-summary.json`;
    const mdFile = `./results/${filenamePrefix}-report.md`;
    
    // Extract totals
    const totalRequests = data.metrics.http_reqs ? data.metrics.http_reqs.values.count : 0;
    const totalErrors = data.metrics.http_req_failed ? data.metrics.http_req_failed.values.passes : 0;
    const totalSuccess = totalRequests - totalErrors;
    
    // Simple output matching k6's default theme
    const customStdout = `
     total_requests...................: ${totalRequests}
     total_success....................: ${totalSuccess}
     total_errors.....................: ${totalErrors}
`;
    
    // Quick Markdown generator
    let md = `# Performance Report: ${filenamePrefix}\n\n`;
    md += `## Overall Status\n`;
    md += `- **Total Requests:** ${totalRequests}\n`;
    md += `- **Total Success:** ${totalSuccess}\n`;
    md += `- **Total Errors:** ${totalErrors}\n\n`;
    md += `## Metrics\n\n`;
    md += `| Metric | p90 | p95 | p99 | avg | max |\n`;
    md += `|---|---|---|---|---|---|\n`;
    
    for (const [key, metric] of Object.entries(data.metrics)) {
      if (metric.type === 'trend' && key.startsWith('http_req_duration{name:')) {
        const name = key.match(/name:(.+)}/)[1];
        md += `| ${name} | ${(metric.values['p(90)'] || 0).toFixed(2)} | ${(metric.values['p(95)'] || 0).toFixed(2)} | ${(metric.values['p(99)'] || 0).toFixed(2)} | ${(metric.values.avg || 0).toFixed(2)} | ${(metric.values.max || 0).toFixed(2)} |\n`;
      }
    }
    
    return {
      'stdout': textSummary(data, { indent: ' ', enableColors: true }) + customStdout,
      [jsonFile]: JSON.stringify(data, null, 2),
      [mdFile]: md,
    };
  };
}
