import { test as setup, expect } from '@playwright/test';

const authFile = 'playwright/.auth/user.json';

setup('authenticate', async ({ page }) => {
  // Navigate to login page
  await page.goto('/login', { waitUntil: 'networkidle' });

  // Wait for the page to load
  await page.waitForTimeout(2000);

  // Fill in login credentials
  const emailInput = page.locator('input[type="email"], input[name="email"]').first();
  const passwordInput = page.locator('input[type="password"], input[name="password"]').first();

  await emailInput.fill(process.env.TEST_EMAIL || 'gody@isyncso.com');
  await passwordInput.fill(process.env.TEST_PASSWORD || '');

  // Click login button
  const loginButton = page.locator('button[type="submit"], button:has-text("Sign in"), button:has-text("Login")').first();
  await loginButton.click();

  // Wait for redirect to dashboard or inbox
  await page.waitForURL(/\/(dashboard|inbox)/, { timeout: 30000 });

  // Save auth state
  await page.context().storageState({ path: authFile });

  console.log('Auth state saved to', authFile);
});
