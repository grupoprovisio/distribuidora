import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { randomUUID } from 'node:crypto';
import { BASE_URL, LOCAL_PASSWORD, localConfig } from './local-env.mjs';
import { totp } from './totp.mjs';

const MAILPIT_URL = 'http://127.0.0.1:54324';
// Public, disposable fixture, never a hosted account's password.
const NEW_PASSWORD = 'Only-Local-E2E-Recovered-MFA-2026!';
const INVALID_CODE_MESSAGE = 'Código incorreto ou expirado. Confira o autenticador e tente novamente.';
const blockedRequests = new WeakMap();

function safeRequest(request) {
  const url = new URL(request.url());
  return { origin: url.origin, path: url.pathname, method: request.method(), kind: request.resourceType() };
}

function recoveryDiagnostics(page, authUrl) {
  const errors = [], requests = [];
  page.on('pageerror', error => {
    // Runtime error text only: strip every URL, JWT and credential-shaped field.
    const message = error.message.replace(/https?:\/\/[^\s"'<>]+/g, '[URL omitted]')
      .replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '[JWT omitted]')
      .replace(/(password|secret|access_token|refresh_token|code_verifier)\s*[=:]\s*\S+/gi, '$1=[omitted]')
      .slice(0, 300);
    if (errors.length < 10) errors.push({ name: error.name, message });
  });
  page.on('response', response => {
    const request = response.request();
    const safe = safeRequest(request);
    if (requests.length < 40 && (safe.origin === authUrl || safe.kind === 'script' && !response.ok())) {
      requests.push({ ...safe, status: response.status() });
    }
  });
  page.on('requestfailed', request => {
    if (requests.length < 40) requests.push({ ...safeRequest(request), failed: true });
  });
  return async () => {
    const dom = await page.evaluate(() => {
      const first = document.getElementById('reset-first');
      const submit = document.querySelector('button[type="submit"]');
      return {
        readyState: document.readyState,
        passwordInputPresent: Boolean(first),
        reactInputAttached: Boolean(first && Object.keys(first).some(key => key.startsWith('__reactProps$'))),
        checkingMfa: document.body.textContent.includes('Verificando a proteção da sua conta...'),
        mfaInputPresent: Boolean(document.getElementById('reset-mfa-code')),
        submitDisabled: submit?.disabled ?? null,
      };
    }).catch(() => ({ unavailable: true }));
    console.log('Local recovery diagnostics:', JSON.stringify({
      origin: new URL(page.url()).origin, path: new URL(page.url()).pathname, dom, errors, requests,
      blocked: blockedRequests.get(page.context()) ?? [],
    }));
  };
}

async function mailpitJson(path) {
  const url = new URL(path, MAILPIT_URL);
  if (url.origin !== MAILPIT_URL || !url.pathname.startsWith('/api/v1/')) {
    throw new Error('Only the fixed local Mailpit API is allowed.');
  }
  const response = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(5_000) });
  if (!response.ok) throw new Error(`Local Mailpit returned HTTP ${response.status}.`);
  return response.json();
}

async function receivedRecoveryLink(email, authUrl) {
  let messageId;
  await expect.poll(async () => {
    const inbox = await mailpitJson(`/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`);
    messageId = inbox.messages?.find(message => message.To?.some(to => to.Address === email))?.ID;
    return Boolean(messageId);
  }, { message: 'The real recovery email must reach local Mailpit', timeout: 30_000 }).toBe(true);
  const message = await mailpitJson(`/api/v1/message/${encodeURIComponent(messageId)}`);
  expect(message.To?.some(to => to.Address === email), 'Recovery email recipient matches the local fixture').toBe(true);
  const links = [...String(message.HTML ?? '').matchAll(/href\s*=\s*["']([^"']+)["']/gi)]
    .map(match => match[1].replace(/&amp;|&#38;|&#x26;/gi, '&'));
  // Parse without fetching the one-time link; reject hosted Auth and redirects.
  const link = links.find(value => {
    try {
      const url = new URL(value);
      return url.origin === authUrl && url.pathname === '/auth/v1/verify'
        && url.searchParams.get('type') === 'recovery'
        && url.searchParams.get('redirect_to') === `${BASE_URL}/auth/callback?flow=recovery`;
    } catch { return false; }
  });
  expect(Boolean(link), 'Email must contain the exact local recovery/PKCE callback').toBe(true);
  return link;
}

async function recoverySession(context, cfg) {
  // Read the actual browser cookies through the same SSR adapter as the app.
  // Never export storageState, cookies, tokens or the code verifier to evidence.
  const cookies = await context.cookies(BASE_URL);
  return createServerClient(cfg.url, cfg.key, {
    cookies: {
      getAll: () => cookies,
      setAll: () => { throw new Error('Recovery assertions must not replace browser cookies.'); },
    },
  });
}

async function requestRecovery(page, email) {
  // Client-side navigation after a real interaction avoids filling unhydrated
  // SSR fields and accidentally sending multiple recovery emails.
  await page.goto('/entrar');
  await expect(async () => {
    await page.getByRole('button', { name: 'Link por e-mail', exact: true }).click();
    await expect(page.getByLabel('Senha', { exact: true })).toHaveCount(0, { timeout: 1_000 });
  }).toPass({ timeout: 15_000 });
  await page.getByRole('link', { name: 'Esqueci minha senha', exact: true }).click();
  await page.getByLabel('E-mail', { exact: true }).fill(email);
  const response = page.waitForResponse(result =>
    new URL(result.url()).pathname === '/auth/v1/recover' && result.request().method() === 'POST');
  await page.getByRole('button', { name: 'Enviar instruções', exact: true }).click();
  expect((await response).status()).toBe(200);
  await expect(page.getByRole('status')).toContainText('Verifique seu e-mail');
  expect((await page.context().cookies(BASE_URL)).some(cookie => /-code-verifier(?:\.\d+)?$/.test(cookie.name)),
    'The initiating browser must retain its PKCE verifier').toBe(true);
}

async function isolatedContext(browser, authUrl) {
  const context = await browser.newContext({ baseURL: BASE_URL, locale: 'pt-BR', reducedMotion: 'reduce' });
  blockedRequests.set(context, []);
  await context.route('**/*', route => {
    const url = new URL(route.request().url());
    if ([BASE_URL, authUrl].includes(url.origin) || url.protocol === 'data:') return route.continue();
    const blocked = blockedRequests.get(context);
    if (blocked.length < 10) blocked.push(safeRequest(route.request()));
    return route.abort();
  });
  return context;
}

function incorrectTotp(secret) {
  // Avoid accidentally choosing a valid code in a neighbouring time window.
  const now = Date.now();
  const valid = new Set(Array.from({ length: 7 }, (_, i) => totp(secret, now + (i - 3) * 30_000)));
  for (let n = 0; n < 1_000_000; n++) {
    const candidate = String(n).padStart(6, '0');
    if (!valid.has(candidate)) return candidate;
  }
  throw new Error('Could not prepare an invalid local TOTP.');
}

test('20 - recuperação PKCE por e-mail local exige MFA existente e preserva o fator após trocar a senha', async ({ browser }) => {
  test.setTimeout(180_000);
  // Does not reset the DB or reuse the eight marketplace identities. This spec
  // can also run alone against the disposable local stack.
  const cfg = localConfig();
  const options = { auth: { persistSession: false, autoRefreshToken: false } };
  const bootstrap = createClient(cfg.url, cfg.adminKey, options);
  const fixture = createClient(cfg.url, cfg.key, options);
  const verifier = createClient(cfg.url, cfg.key, options);
  const email = `e2e-recovery-mfa-${randomUUID()}@example.invalid`;
  let userId;
  let context;
  let diagnose;
  try {
    // Administrative access is used only to create/delete this local fixture.
    // The recovery link is emitted by the public UI, never admin.generateLink.
    const created = await bootstrap.auth.admin.createUser({ email, password: LOCAL_PASSWORD, email_confirm: true });
    expect(created.error?.code ?? null, 'Create disposable local identity').toBeNull();
    userId = created.data.user.id;
    const signed = await fixture.auth.signInWithPassword({ email, password: LOCAL_PASSWORD });
    expect(signed.error?.code ?? null).toBeNull();
    const enrolled = await fixture.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'Local recovery regression' });
    expect(enrolled.error?.code ?? null).toBeNull();
    const factorId = enrolled.data.id;
    const secret = enrolled.data.totp.secret;
    const enrolledCounter = Math.floor(Date.now() / 30_000);
    const verified = await fixture.auth.mfa.challengeAndVerify({ factorId, code: totp(secret) });
    expect(verified.error?.code ?? null, 'The fixture must already have verified MFA').toBeNull();
    expect((await fixture.auth.signOut({ scope: 'local' })).error?.code ?? null).toBeNull();

    context = await isolatedContext(browser, cfg.url);
    const page = await context.newPage();
    diagnose = recoveryDiagnostics(page, cfg.url);
    await requestRecovery(page, email);

    const link = await receivedRecoveryLink(email, cfg.url);
    let sawPkceCallback = false;
    const passwordWrites = [];
    page.on('request', request => {
      const url = new URL(request.url());
      if (url.origin === BASE_URL && url.pathname === '/auth/callback') {
        sawPkceCallback = url.searchParams.has('code') && url.searchParams.get('flow') === 'recovery';
      }
      if (url.origin === cfg.url && url.pathname === '/auth/v1/user' && request.method() === 'PUT') {
        // Retain only non-secret evidence, never the bearer token/body/password.
        try {
          const token = request.headers().authorization?.replace(/^Bearer\s+/i, '');
          const claims = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());
          passwordWrites.push({ aal: claims.aal, correctUser: claims.sub === userId });
        } catch { passwordWrites.push({ aal: 'unreadable', correctUser: false }); }
      }
    });
    try { await page.goto(link); }
    catch { throw new Error('Could not open the local recovery email in its initiating browser.'); }
    expect(new URL(page.url()).origin, 'Recovery callback must preserve the initiating app origin').toBe(BASE_URL);
    await expect.poll(() => new URL(page.url()).pathname).toBe('/redefinir-senha');
    expect(sawPkceCallback, 'Actual email verification must return an authorization code').toBe(true);
    const session = await recoverySession(context, cfg);
    const aal = await session.auth.mfa.getAuthenticatorAssuranceLevel();
    expect(aal.error?.code ?? null).toBeNull();
    expect(aal.data?.currentLevel).toBe('aal1');
    expect(aal.data?.nextLevel).toBe('aal2');
    // Real Auth rejection establishes that this regression exercises the exact
    // production failure; no interception or elevated administrative update.
    const denied = await session.auth.updateUser({ password: NEW_PASSWORD });
    expect(denied.error?.status).toBe(401);
    expect(denied.error?.code).toBe('insufficient_aal');

    const first = page.getByLabel('Nova senha', { exact: true });
    const second = page.getByLabel('Confirmar senha', { exact: true });
    const code = page.getByLabel('Código do autenticador', { exact: true });
    const submit = page.getByRole('button', { name: 'Salvar nova senha', exact: true });
    await expect(code).toBeVisible();
    await expect(submit).toBeEnabled();
    await first.fill(NEW_PASSWORD);
    await second.fill(NEW_PASSWORD);
    const invalidCode = incorrectTotp(secret);
    await code.fill(invalidCode);
    const invalidResponse = page.waitForResponse(response =>
      /\/auth\/v1\/factors\/[^/]+\/verify$/.test(new URL(response.url()).pathname)
      && response.request().method() === 'POST');
    await submit.click();
    const invalidResult = await invalidResponse;
    expect(invalidResult.ok()).toBe(false);
    expect((await invalidResult.json()).code).toBe('mfa_verification_failed');
    await expect(page.locator('form').getByRole('alert')).toHaveText(INVALID_CODE_MESSAGE);
    expect(await first.inputValue() === NEW_PASSWORD, 'Keep the new password after invalid MFA').toBe(true);
    expect(await second.inputValue() === NEW_PASSWORD, 'Keep password confirmation after invalid MFA').toBe(true);
    expect(await code.inputValue() === invalidCode, 'Keep the entered MFA code after invalid MFA').toBe(true);
    expect(passwordWrites, 'Invalid MFA must not attempt a password update').toEqual([]);
    expect((await (await recoverySession(context, cfg)).auth.mfa.getAuthenticatorAssuranceLevel()).data?.currentLevel).toBe('aal1');
    const unchanged = await verifier.auth.signInWithPassword({ email, password: LOCAL_PASSWORD });
    expect(unchanged.error?.code ?? null, 'The old password must still work after invalid MFA').toBeNull();
    expect((await verifier.auth.signOut({ scope: 'local' })).error?.code ?? null).toBeNull();

    // Do not reuse the TOTP consumed during fixture enrollment, even when the
    // whole browser flow finishes within the same 30-second time step.
    await expect.poll(() => Math.floor(Date.now() / 30_000), { timeout: 35_000, intervals: [250] })
      .toBeGreaterThan(enrolledCounter);
    await code.fill(totp(secret));
    const updateResponse = page.waitForResponse(response =>
      new URL(response.url()).pathname === '/auth/v1/user' && response.request().method() === 'PUT');
    await submit.click();
    expect((await updateResponse).status()).toBe(200);
    expect(passwordWrites).toEqual([{ aal: 'aal2', correctUser: true }]);
    await expect.poll(() => new URL(page.url()).pathname).toBe('/entrar');

    const previous = await verifier.auth.signInWithPassword({ email, password: LOCAL_PASSWORD });
    expect(previous.error?.code, 'The replaced password must be rejected').toBe('invalid_credentials');
    const renewed = await verifier.auth.signInWithPassword({ email, password: NEW_PASSWORD });
    expect(renewed.error?.code ?? null, 'The new password must authenticate').toBeNull();
    expect(renewed.data.user?.id === userId, 'Recovery must keep the same identity').toBe(true);
    const factors = await verifier.auth.mfa.listFactors();
    expect(factors.error?.code ?? null).toBeNull();
    expect(factors.data.totp.map(factor => ({ id: factor.id, status: factor.status })))
      .toEqual([{ id: factorId, status: 'verified' }]);
    const nextLogin = await verifier.auth.mfa.getAuthenticatorAssuranceLevel();
    expect(nextLogin.data?.currentLevel).toBe('aal1');
    expect(nextLogin.data?.nextLevel).toBe('aal2');
  } catch (error) {
    await diagnose?.();
    throw error;
  } finally {
    await Promise.allSettled([
      fixture.auth.signOut({ scope: 'local' }), verifier.auth.signOut({ scope: 'local' }),
      context?.close(),
    ]);
    if (userId) {
      const removed = await bootstrap.auth.admin.deleteUser(userId);
      expect(removed.error?.code ?? null, 'Delete only the disposable recovery fixture').toBeNull();
    }
  }
});

test('21 - recuperação PKCE por e-mail local continua funcionando para conta sem MFA', async ({ browser }) => {
  const cfg = localConfig();
  const options = { auth: { persistSession: false, autoRefreshToken: false } };
  const bootstrap = createClient(cfg.url, cfg.adminKey, options);
  const verifier = createClient(cfg.url, cfg.key, options);
  const email = `e2e-recovery-password-${randomUUID()}@example.invalid`;
  let userId;
  let context;
  let diagnose;
  try {
    const created = await bootstrap.auth.admin.createUser({ email, password: LOCAL_PASSWORD, email_confirm: true });
    expect(created.error?.code ?? null, 'Create separate local identity without MFA').toBeNull();
    userId = created.data.user.id;
    context = await isolatedContext(browser, cfg.url);
    const page = await context.newPage();
    diagnose = recoveryDiagnostics(page, cfg.url);
    await requestRecovery(page, email);
    const link = await receivedRecoveryLink(email, cfg.url);
    try { await page.goto(link); }
    catch { throw new Error('Could not open the local recovery email in its initiating browser.'); }
    expect(new URL(page.url()).origin, 'Recovery callback must preserve the initiating app origin').toBe(BASE_URL);
    await expect.poll(() => new URL(page.url()).pathname).toBe('/redefinir-senha');
    const session = await recoverySession(context, cfg);
    const aal = await session.auth.mfa.getAuthenticatorAssuranceLevel();
    expect(aal.error?.code ?? null).toBeNull();
    expect(aal.data?.currentLevel).toBe('aal1');
    expect(aal.data?.nextLevel).toBe('aal1');
    const submit = page.getByRole('button', { name: 'Salvar nova senha', exact: true });
    await expect(submit).toBeEnabled();
    await expect(page.getByLabel('Código do autenticador', { exact: true })).toHaveCount(0);
    await page.getByLabel('Nova senha', { exact: true }).fill(NEW_PASSWORD);
    await page.getByLabel('Confirmar senha', { exact: true }).fill(NEW_PASSWORD);
    const updateResponse = page.waitForResponse(response =>
      new URL(response.url()).pathname === '/auth/v1/user' && response.request().method() === 'PUT');
    await submit.click();
    expect((await updateResponse).status()).toBe(200);
    await expect.poll(() => new URL(page.url()).pathname).toBe('/entrar');
    const previous = await verifier.auth.signInWithPassword({ email, password: LOCAL_PASSWORD });
    expect(previous.error?.code).toBe('invalid_credentials');
    const renewed = await verifier.auth.signInWithPassword({ email, password: NEW_PASSWORD });
    expect(renewed.error?.code ?? null).toBeNull();
    expect(renewed.data.user?.id === userId).toBe(true);
    const factors = await verifier.auth.mfa.listFactors();
    expect(factors.error?.code ?? null).toBeNull();
    expect(factors.data.all).toEqual([]);
  } catch (error) {
    await diagnose?.();
    throw error;
  } finally {
    await Promise.allSettled([verifier.auth.signOut({ scope: 'local' }), context?.close()]);
    if (userId) {
      const removed = await bootstrap.auth.admin.deleteUser(userId);
      expect(removed.error?.code ?? null, 'Delete only the disposable non-MFA recovery fixture').toBeNull();
    }
  }
});
