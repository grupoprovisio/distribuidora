import { rmSync } from 'node:fs';
// Reports are disposable local test evidence, never credentials.
rmSync('.e2e-summaries', { recursive: true, force: true });
