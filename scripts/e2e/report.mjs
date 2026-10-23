import { readFileSync, writeFileSync } from 'node:fs';
const raw=JSON.parse(readFileSync('test-results/e2e-summary.json','utf8'));
const cases=[];
function visit(suite) {
  for(const spec of suite.specs??[]) for(const t of spec.tests??[]) {
    cases.push({name:spec.title,status:t.results.at(-1)?.status??'notRun',durationMs:t.results.reduce((sum,r)=>sum+(r.duration??0),0)});
  }
  for(const child of suite.suites??[])visit(child);
}
for(const suite of raw.suites??[])visit(suite);
const report={generatedAt:new Date().toISOString(),environment:'local Supabase Auth/PostgreSQL/Storage + Chromium; no cloud writes',stats:raw.stats,cases};
writeFileSync('test-results/e2e-safe-summary.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({passed:cases.filter(c=>c.status==='passed').length,total:cases.length}));
