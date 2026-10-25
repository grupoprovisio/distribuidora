import { existsSync, readFileSync, writeFileSync } from 'node:fs';

// This is a redacted summary only. No JWTs, credentials, cookies or screenshots.
const sources = [
  {name: 'standard-local', file: '.e2e-summaries/e2e-summary.json'},
  {name: 'qa-scoped-local', file: '.e2e-summaries/e2e-qa-summary.json'},
];
const present = sources.filter(source => existsSync(source.file));
if (!present.length) throw new Error('No Playwright JSON report available');
const cases = [];
const summary = [];
const stats = {expected: 0, unexpected: 0, flaky: 0, skipped: 0, duration: 0};

for (const source of present) {
  const raw = JSON.parse(readFileSync(source.file, 'utf8'));
  function visit(suite) {
    for (const spec of suite.specs ?? []) for (const t of spec.tests ?? []) {
      cases.push({
        scope: source.name,
        name: spec.title,
        status: t.results.at(-1)?.status ?? 'notRun',
        durationMs: t.results.reduce((sum, result) => sum + (result.duration ?? 0), 0),
      });
    }
    for (const child of suite.suites ?? []) visit(child);
  }
  for (const suite of raw.suites ?? []) visit(suite);
  for (const key of Object.keys(stats)) {
    stats[key] += Number(raw.stats?.[key] ?? 0) || 0;
  }
  summary.push({
    scope: source.name,
    passed: cases.filter(c => c.scope === source.name && c.status === 'passed').length,
    total: cases.filter(c => c.scope === source.name).length,
  });
}
const report = {
  generatedAt: new Date().toISOString(),
  environment: 'local Supabase Auth/PostgreSQL/Storage + Chromium; no cloud writes',
  qaSuiteExecuted: present.some(source => source.name === 'qa-scoped-local'),
  suites: summary,
  stats,
  cases,
};
writeFileSync('test-results/e2e-safe-summary.json', JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({passed: cases.filter(c => c.status === 'passed').length,
  total: cases.length, qaSuiteExecuted: report.qaSuiteExecuted, suites: summary}));
