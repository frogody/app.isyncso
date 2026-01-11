import { test as setup, expect } from '@playwright/test';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const authFile = path.join(__dirname, '../playwright/.auth/user.json');

// Test credentials from environment variables
const TEST_EMAIL = process.env.TEST_EMAIL || 'frogody@icloud.com';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'Passwordfortesting18#1';

setup('authenticate', async ({ page }) => {
  console.log('Setting up authentication...');
  console.log('Test email:', TEST_EMAIL);

  // Navigate to homepage
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);

  // Check if we're already on a logged-in page (not login/signup)
  const currentUrl = page.url();
  console.log('Current URL:', currentUrl);

  // Look for email input to determine if we're on login page
  const emailInput = page.locator('input[type="email"], input[name="email"]');
  const isLoginPage = await emailInput.isVisible().catch(() => false);

  if (!isLoginPage) {
    console.log('Already authenticated - no login form found');
    await page.context().storageState({ path: authFile });
    return;
  }

  // We're on login page - perform login
  console.log('Login page detected - performing authentication...');

  // Check if we're on signup page instead
  const isSignupPage = currentUrl.toLowerCase().includes('signup') ||
                       await page.locator('text=/create.*account/i').isVisible().catch(() => false);

  if (isSignupPage) {
    console.log('On signup page, clicking "Sign in" link...');
    const signinLink = page.locator('a:has-text("Sign in"), button:has-text("Sign in"), a:has-text("Already have an account")');
    await signinLink.click();
    await page.waitForTimeout(1000);
  }

  // Fill in login form
  console.log('Filling login credentials...');
  await emailInput.fill(TEST_EMAIL);

  const passwordInput = page.locator('input[type="password"], input[name="password"]');
  await passwordInput.fill(TEST_PASSWORD);

  // Click login button
  console.log('Clicking login button...');
  const loginButton = page.locator('button[type="submit"]:has-text("Sign In"), button:has-text("Sign In"), button:has-text("Login")');
  await loginButton.click();

  // Wait for navigation after login
  console.log('Waiting for authentication to complete...');
  await page.waitForLoadState('networkidle', { timeout: 15000 });
  await page.waitForTimeout(2000);

  // Verify we're logged in by checking URL changed
  const afterLoginUrl = page.url();
  console.log('After login URL:', afterLoginUrl);

  if (afterLoginUrl.toLowerCase().includes('login')) {
    throw new Error('Login failed - still on login page');
  }

  console.log('Authentication successful!');

  // Save authentication state
  await page.context().storageState({ path: authFile });
  console.log('Auth state saved to:', authFile);
});
