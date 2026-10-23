import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const { NextRequest } = require('next/server');
const source = readFileSync(new URL('../lib/supabase/auth-redirect.ts', import.meta.url), 'utf8');
const js = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const loaded = { exports: {} };
// Execute the production helper with NextResponse itself, not a response mock.
new Function('module', 'exports', 'require', js)(loaded, loaded.exports, require);
const { authRedirect } = loaded.exports;

test('authentication destinations return relative, private, uncached redirects', () => {
  for (const destination of ['/entrar', '/entrar?erro=confirmacao', '/redefinir-senha', '/app']) {
    const response = authRedirect(destination);
    assert.equal(response.status, 307);
    assert.equal(response.headers.get('location'), destination);
    assert.equal(response.headers.get('cache-control'), 'private, no-store');
    assert.equal(response.body, null);
  }
});

test('runtime allowlist rejects external, protocol-relative and unlisted destinations', () => {
  for (const destination of [
    undefined, null, '', '//attacker.invalid', 'https://attacker.invalid',
    '/\\attacker.invalid', '/%2f%2fattacker.invalid', '/admin/marketplace',
    '/entrar?next=https://attacker.invalid', '/app#unlisted',
  ]) {
    assert.throws(() => authRedirect(destination), /Destino de autenticação inválido/);
  }
});

test('relative Location retains browser origin despite Next loopback normalization', () => {
  const browserUrl = 'http://127.0.0.1:3210/auth/callback?flow=recovery';
  const request = new NextRequest(browserUrl, {
    headers: { host: '127.0.0.1:3210', 'x-forwarded-host': 'attacker.invalid' },
  });
  assert.equal(new URL(request.url).hostname, 'localhost');
  const location = authRedirect('/redefinir-senha').headers.get('location');
  for (const origin of ['http://127.0.0.1:3210', 'https://grupoprovisio.com']) {
    const target = new URL(location, `${origin}/auth/callback`);
    assert.equal(target.origin, origin);
    assert.equal(target.pathname, '/redefinir-senha');
  }
});
