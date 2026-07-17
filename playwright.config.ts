import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  timeout: 30_000,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 13'] },
      // Supabase Auth verifies mocked JWTs against remote JWKS in WebKit.
      // Public/auth/PWA behavior still runs in Safari; the mocked database
      // workflow runs in Chromium and real authenticated flows are verified
      // against the staging project.
      testIgnore: '**/report-workflow.spec.ts',
    },
  ],
  webServer: {
    command: 'npm run build && npm run preview -- --host 127.0.0.1 --port 4173',
    url: 'http://127.0.0.1:4173/safety/login',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
