export function makeHandleSummary(filenamePrefix) {
  return function(data) {
    const jsonFile = `./results/${filenamePrefix}-summary.json`;
    const mdFile = `./results/${filenamePrefix}-report.md`;
    
    // Quick Markdown generator
    let md = `# Performance Report: ${filenamePrefix}\n\n`;
    md += `## Metrics\n\n`;
    md += `| Metric | p90 | p95 | p99 | avg | max |\n`;
    md += `|---|---|---|---|---|---|\n`;
    
    for (const [key, metric] of Object.entries(data.metrics)) {
      if (metric.type === 'trend' && key.startsWith('http_req_duration{name:')) {
        const name = key.match(/name:(.+)}/)[1];
        md += `| ${name} | ${metric.values['p(90)'].toFixed(2)} | ${metric.values['p(95)'].toFixed(2)} | ${metric.values['p(99)'].toFixed(2)} | ${metric.values.avg.toFixed(2)} | ${metric.values.max.toFixed(2)} |\n`;
      }
    }
    
    return {
      [jsonFile]: JSON.stringify(data, null, 2),
      [mdFile]: md,
    };
  };
}
