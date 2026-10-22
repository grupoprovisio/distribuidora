import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';

export const CLI_VERSION = '2.121.0';
export const PROJECT = 'provisio-local-e2e';
export const CONTAINER = `supabase_db_${PROJECT}`;
export const BASE_URL = 'http://127.0.0.1:3210';
export const WORKDIR = process.env.PROVISIO_E2E_WORKDIR || resolve('tests/e2e/local');
// Public, disposable LOCAL test password; the runner rejects every hosted service.
export const LOCAL_PASSWORD = 'Only-Local-E2E-Not-A-Real-Account-2026!';
export function cli(args, options = {}) {
  return execFileSync('npx', ['--yes', `supabase@${CLI_VERSION}`, ...args, '--workdir', WORKDIR],
    { encoding: 'utf8', timeout: 180_000, stdio: ['pipe', 'pipe', 'pipe'], ...options });
}
export function localConfig() {
  const configText = readFileSync(resolve(WORKDIR, 'supabase/config.toml'), 'utf8');
  assert.match(configText, /^project_id = "provisio-local-e2e"$/m, 'Only the disposable local project is allowed');
  const c = JSON.parse(cli(['status', '--output', 'json']));
  assert.equal(c.API_URL, 'http://127.0.0.1:54321', 'Hosted Supabase is forbidden in E2E');
  const key = c.PUBLISHABLE_KEY;
  assert.match(key || '', /^sb_publishable_/, 'Local publishable key is required');
  return { url: c.API_URL, key, adminKey: c.SERVICE_ROLE_KEY || c.SECRET_KEY };
}
export function sql(query) {
  return execFileSync('docker', ['exec', '-i', CONTAINER, 'psql', '-X', '-q', '-A', '-t', '-v', 'ON_ERROR_STOP=1', '-U', 'postgres', '-d', 'postgres'],
    { input: query, encoding: 'utf8', timeout: 60_000, stdio: ['pipe', 'pipe', 'pipe'] }).trim();
}
export function rows(query) {
  return JSON.parse(sql(`select coalesce(jsonb_agg(x),'[]'::jsonb) from (${query}) x;`));
}
export const ORGS = {
  platform: '8e2e2026-1022-4000-a000-000000000001',
  supplierA: '8e2e2026-1022-4000-a000-000000000002',
  supplierB: '8e2e2026-1022-4000-a000-000000000003',
  buyerA: '8e2e2026-1022-4000-a000-000000000004',
  buyerB: '8e2e2026-1022-4000-a000-000000000005',
};
export const CATEGORY = '8e2e2026-1022-4000-8000-000000000001';
export async function resetAndSeed() {
  const cfg = localConfig();
  // This flag and the fixed project prevent accidental destructive cloud operations.
  cli(['db', 'reset', '--local', '--no-seed', '--yes']);
  for (const f of readdirSync('db/migrations').filter(n => n.endsWith('.sql')).sort()) {
    sql(readFileSync(resolve('db/migrations', f), 'utf8'));
  }
  sql("notify pgrst, 'reload schema';");
  const bootstrap = createClient(cfg.url, cfg.adminKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const users = {};
  for (const name of ['admin', 'supplierA', 'supplierB', 'buyerA', 'buyerB', 'reader', 'dual', 'pending']) {
    const email = `e2e-${name.toLowerCase()}@example.invalid`;
    const r = await bootstrap.auth.admin.createUser({ email, password: LOCAL_PASSWORD, email_confirm: true,
      user_metadata: { full_name: `TESTE LOCAL ${name}` } });
    if (r.error) throw new Error(`Local seed ${name}: ${r.error.message}`);
    users[name] = { id: r.data.user.id, email };
  }
  const orgValues = Object.entries(ORGS).map(([name, id]) => {
    const kind = name === 'platform' ? 'PLATFORM_OPERATOR' : name.startsWith('supplier') ? 'SUPPLIER' : 'BUYER';
    return `('${id}','TESTE LOCAL ${name}','${kind}',${name === 'platform'},'approved')`;
  }).join(',');
  const capabilities = Object.entries(ORGS).map(([name, id]) => `('${id}','${name === 'platform' ? 'PLATFORM_OPERATOR' : name.startsWith('supplier') ? 'SUPPLIER' : 'BUYER'}','approved')`).join(',');
  const members = [
    ['platform','admin','PLATFORM_ADMIN'], ['supplierA','supplierA','SUPPLIER_ADMIN'],
    ['supplierB','supplierB','SUPPLIER_ADMIN'], ['buyerA','buyerA','BUYER'], ['buyerB','buyerB','BUYER'],
    ['buyerA','reader','READER'], ['buyerA','dual','BUYER'], ['supplierB','dual','SUPPLIER_ADMIN'],
    ['buyerA','pending','BUYER'],
  ].map(([org, name, role]) => `('${ORGS[org]}','${users[name].id}','${role}','active')`).join(',');
  sql(`begin;
    update public.profiles set status='active';
    update public.profiles set status='pending' where id='${users.pending.id}';
    insert into public.organizations(id,legal_name,kind,is_platform_owned,status) values ${orgValues};
    insert into public.organization_capabilities(organization_id,capability,status) values ${capabilities};
    insert into public.organization_members(organization_id,user_id,role,status) values ${members};
    insert into public.buyer_delivery_regions(buyer_org_id,region_code) values ('${ORGS.buyerA}','BR-SP'),('${ORGS.buyerB}','BR-RJ');
    insert into public.product_categories(id,name,slug) values ('${CATEGORY}','TESTE LOCAL Alimentos','teste-local-alimentos');
    commit;`);
  return { ...cfg, users };
}
