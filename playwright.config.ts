import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 120000, // 2 minutes per test
  expect: {
    timeout: 15000
  },
  fullyParallel: false,
  retries: 0, // No retries for debugging
  reporter: [['html'], ['list']],
  use: {
    baseURL: process.env.TEST_URL || 'https://app.isyncso.com',
    headless: false, // Always show browser
    trace: 'on',
    screenshot: 'on', // Always capture screenshots
    video: 'on', // Always record video
    viewport: { width: 1920, height: 1080 },
    launchOptions: {
      slowMo: 100, // Slow down for visibility
    },
  },
  projects: [
    {
      name: 'sync-memory-tests',
      testMatch: /sync-memory-system\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
      },
    },
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },
    {
      name: 'chromium',
      testMatch: /^(?!.*sync-memory-system).*\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'playwright/.auth/user.json',
      },
      dependencies: ['setup'],
    },
  ],
  webServer: process.env.TEST_URL?.includes('localhost') ? {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 120000,
  } : undefined,
});
