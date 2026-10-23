import { cli } from '../../tests/e2e/local-env.mjs';
// CLI output contains local test keys; never forward it to CI logs or artifacts.
try {
  cli(['start','--exclude','realtime,imgproxy,postgres-meta,studio,edge-runtime,logflare,vector,supavisor'], {timeout:600_000});
  console.log('Disposable Provisio local Supabase started successfully.');
} catch { console.error('Local Supabase did not start. Check Docker availability and the local CLI configuration.');process.exitCode=1; }
