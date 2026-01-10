import { test as setup, expect } from '@playwright/test';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const authFile = path.join(__dirname, '../playwright/.auth/user.json');

// Test credentials from environment variables
const TEST_EMAIL = process.env.TEST_EMAIL || 'test@isyncso.com';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'testpassword123';

setup('authenticate', async ({ page }) => {
  console.log('Setting up authentication...');
  console.log('Test email:', TEST_EMAIL);

  // Navigate to login page
  await page.goto('/');

  // Check if already authenticated (redirect to dashboard)
  await page.waitForTimeout(2000);
  const url = page.url();

  if (!url.includes('login') && !url.includes('Login')) {
    console.log('Already authenticated');
    await page.context().storageState({ path: authFile });
    return;
  }

  // Fill in login form
  console.log('Filling login form...');
  await page.fill('input[type="email"], input[name="email"]', TEST_EMAIL);
  await page.fill('input[type="password"], input[name="password"]', TEST_PASSWORD);

  // Click login button
  const loginButton = page.locator('button[type="submit"], button:has-text("Sign In"), button:has-text("Login")');
  await loginButton.click();

  // Wait for successful login (redirect to dashboard or home)
  await page.waitForURL(url => !url.includes('login') && !url.includes('Login'), {
    timeout: 10000
  });

  console.log('Authentication successful');

  // Save authentication state
  await page.context().storageState({ path: authFile });
});
