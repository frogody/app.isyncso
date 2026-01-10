import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 60000,
  expect: {
    timeout: 10000
  },
  fullyParallel: false,
  retries: 1,
  reporter: [['html'], ['list']],
  use: {
    baseURL: process.env.TEST_URL || 'http://localhost:5173',
    headless: false, // Always show browser
    trace: 'on-first-retry',
    screenshot: 'on', // Always capture screenshots
    video: 'on', // Always record video
  },
  projects: [
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },
    {
      name: 'chromium',
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
