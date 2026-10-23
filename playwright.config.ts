import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: '**/*.spec.mjs',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 120_000,
  expect: { timeout: 20_000 },
  globalTimeout: 1_200_000,
  reporter: [['list'], ['json', { outputFile: 'test-results/e2e-summary.json' }]],
  use: {
    baseURL: 'http://127.0.0.1:3210',
    browserName: 'chromium',
    ...(process.platform === 'darwin' ? { channel: 'chrome' } : {}),
    headless: true,
    trace: 'off', video: 'off', screenshot: 'off',
  },
  webServer: {
    command: 'node scripts/e2e/serve.mjs',
    url: 'http://127.0.0.1:3210/entrar',
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
