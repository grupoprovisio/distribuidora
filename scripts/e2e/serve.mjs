import { spawn } from 'node:child_process';
import { localConfig, ORGS } from '../../tests/e2e/local-env.mjs';
const { url, key } = localConfig();
const scopedQa = process.env.PROVISIO_E2E_QA_SCOPE === 'true';
const child = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '--webpack', '--hostname', '127.0.0.1', '--port', '3210'], {
  stdio: 'inherit',
  env: { ...process.env, NODE_ENV: 'development',
    NEXT_PUBLIC_PROVISIO_LOCAL_E2E: 'true', NEXT_PUBLIC_SUPABASE_URL: url,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: key, MARKETPLACE_AUTH_ENABLED: 'true',
    MARKETPLACE_TRANSACTIONS_ENABLED: scopedQa ? 'false' : 'true', MARKETPLACE_CATALOG_ENABLED: 'true',
    MARKETPLACE_QA_TRANSACTIONS_ENABLED: scopedQa ? 'true' : 'false',
    MARKETPLACE_QA_BUYER_ORG_ID: scopedQa ? ORGS.buyerA : '',
    MARKETPLACE_QA_SUPPLIER_ORG_IDS: scopedQa ? `${ORGS.supplierA},${ORGS.supplierB}` : '',
    NEXT_TELEMETRY_DISABLED: '1' },
});
for (const event of ['SIGTERM', 'SIGINT']) process.on(event, () => child.kill(event));
child.on('exit', code => process.exit(code ?? 0));
