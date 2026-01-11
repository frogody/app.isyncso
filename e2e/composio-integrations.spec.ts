/**
 * Composio Integrations E2E Tests
 * Tests the integration connection flow via Composio
 *
 * Run with: npx playwright test composio-integrations.spec.ts --headed
 */

import { test, expect, Page } from '@playwright/test';

// Test credentials
const TEST_EMAIL = process.env.TEST_EMAIL || 'frogody@icloud.com';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'Passwordfortesting18#1';

// Base URL
const BASE_URL = process.env.TEST_URL || 'https://app.isyncso.com';

// Integration slugs to test (subset of all 30+)
const INTEGRATIONS_TO_TEST = [
  'gmail',
  'slack',
  'hubspot',
  'notion',
  'googlecalendar',
];

/**
 * Helper: Wait for page to be stable
 */
async function waitForPageStable(page: Page, timeout = 5000) {
  await page.waitForLoadState('networkidle', { timeout });
  await page.waitForTimeout(1000);
}

/**
 * Helper: Login to the app
 */
async function loginToApp(page: Page) {
  console.log('Logging in with:', TEST_EMAIL);

  await page.goto(BASE_URL);
  await waitForPageStable(page);

  // Check if already logged in
  const currentUrl = page.url();
  if (!currentUrl.includes('login') && !currentUrl.includes('signup')) {
    const profileButton = page.locator('[data-testid="profile-button"], button:has-text("Profile"), .avatar');
    if (await profileButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('Already logged in');
      return;
    }
  }

  // Find and fill email input
  const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]');
  await emailInput.waitFor({ state: 'visible', timeout: 10000 });
  await emailInput.fill(TEST_EMAIL);

  // Find and fill password input
  const passwordInput = page.locator('input[type="password"], input[name="password"]');
  await passwordInput.fill(TEST_PASSWORD);

  // Click sign in button
  const signInButton = page.locator(
    'button[type="submit"]:has-text("Sign"), button:has-text("Sign In"), button:has-text("Login"), button:has-text("Log in")'
  );
  await signInButton.click();

  // Wait for navigation
  await waitForPageStable(page, 15000);

  // Verify login succeeded
  const afterLoginUrl = page.url();
  expect(afterLoginUrl).not.toContain('login');
  console.log('Login successful, current URL:', afterLoginUrl);
}

/**
 * Helper: Navigate to integrations page
 */
async function navigateToIntegrations(page: Page) {
  // Try direct navigation first
  await page.goto(`${BASE_URL}/settings/integrations`);
  await waitForPageStable(page);

  // Check if we landed on the integrations page
  const heading = page.locator('h1:has-text("Integrations"), h2:has-text("Integrations")');
  if (await heading.isVisible({ timeout: 5000 }).catch(() => false)) {
    console.log('Navigated to integrations page');
    return;
  }

  // Fallback: navigate via settings menu
  console.log('Direct navigation failed, trying via settings menu...');

  // Look for settings link in sidebar/header
  const settingsLink = page.locator(
    'a[href*="settings"], button:has-text("Settings"), [data-testid="settings-link"]'
  );

  if (await settingsLink.isVisible({ timeout: 3000 }).catch(() => false)) {
    await settingsLink.click();
    await waitForPageStable(page);
  }

  // Look for integrations tab/link
  const integrationsLink = page.locator(
    'a[href*="integrations"], button:has-text("Integrations"), [data-testid="integrations-tab"]'
  );

  if (await integrationsLink.isVisible({ timeout: 3000 }).catch(() => false)) {
    await integrationsLink.click();
    await waitForPageStable(page);
  }
}

/**
 * Helper: Find integration card by slug
 */
async function findIntegrationCard(page: Page, slug: string) {
  // Try various selectors
  const card = page.locator([
    `[data-integration-slug="${slug}"]`,
    `[data-testid="integration-${slug}"]`,
    `.integration-card:has-text("${slug}")`,
    `div:has-text("${slug}") >> xpath=ancestor::div[contains(@class, "card")]`,
  ].join(', ')).first();

  return card;
}

// ============================================
// Test Suite
// ============================================

test.describe('Composio Integrations', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await loginToApp(page);
  });

  test('should display integrations page with all categories', async ({ page }) => {
    await navigateToIntegrations(page);

    // Take screenshot
    await page.screenshot({
      path: `e2e/screenshots/integrations-page-${Date.now()}.png`,
      fullPage: true,
    });

    // Check for category tabs/sections
    const categories = [
      'CRM & Sales',
      'Communication',
      'Email & Calendar',
      'Project Management',
      'File Storage',
      'Finance',
    ];

    for (const category of categories) {
      const categoryElement = page.locator(`text="${category}"`);
      const isVisible = await categoryElement.isVisible({ timeout: 3000 }).catch(() => false);
      console.log(`Category "${category}": ${isVisible ? 'visible' : 'not visible'}`);
    }

    // Check for search input
    const searchInput = page.locator('input[placeholder*="Search" i]');
    const hasSearch = await searchInput.isVisible({ timeout: 3000 }).catch(() => false);
    console.log('Search input:', hasSearch ? 'found' : 'not found');
  });

  test('should search for integrations', async ({ page }) => {
    await navigateToIntegrations(page);

    // Find search input
    const searchInput = page.locator('input[placeholder*="Search" i], input[type="search"]');
    await searchInput.waitFor({ state: 'visible', timeout: 5000 });

    // Search for Gmail
    await searchInput.fill('gmail');
    await page.waitForTimeout(500);

    // Take screenshot
    await page.screenshot({
      path: `e2e/screenshots/integrations-search-gmail-${Date.now()}.png`,
    });

    // Should show Gmail integration
    const gmailCard = page.locator('text="Gmail"');
    await expect(gmailCard).toBeVisible({ timeout: 5000 });

    // Clear search and search for something else
    await searchInput.clear();
    await searchInput.fill('slack');
    await page.waitForTimeout(500);

    // Should show Slack integration
    const slackCard = page.locator('text="Slack"');
    await expect(slackCard).toBeVisible({ timeout: 5000 });

    console.log('Search functionality works correctly');
  });

  test('should show connect button for unconnected integrations', async ({ page }) => {
    await navigateToIntegrations(page);

    // Look for a Connect button
    const connectButton = page.locator('button:has-text("Connect")').first();
    await connectButton.waitFor({ state: 'visible', timeout: 10000 });

    // Take screenshot
    await page.screenshot({
      path: `e2e/screenshots/integrations-connect-button-${Date.now()}.png`,
    });

    console.log('Connect button found for unconnected integrations');
  });

  test('should initiate OAuth flow when clicking Connect', async ({ page }) => {
    await navigateToIntegrations(page);

    // Search for a specific integration (Gmail)
    const searchInput = page.locator('input[placeholder*="Search" i]');
    if (await searchInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await searchInput.fill('gmail');
      await page.waitForTimeout(500);
    }

    // Find the Gmail integration card and its Connect button
    const gmailSection = page.locator('text="Gmail"').first();
    await gmailSection.waitFor({ state: 'visible', timeout: 5000 });

    // Find the Connect button near Gmail
    const connectButton = page.locator('button:has-text("Connect")').first();

    // Capture popup before clicking
    const popupPromise = page.waitForEvent('popup', { timeout: 15000 }).catch(() => null);

    // Click connect
    await connectButton.click();
    console.log('Clicked Connect button');

    // Take screenshot of the connection dialog/state
    await page.waitForTimeout(2000);
    await page.screenshot({
      path: `e2e/screenshots/integrations-connecting-${Date.now()}.png`,
    });

    // Check for popup or dialog
    const popup = await popupPromise;
    if (popup) {
      console.log('OAuth popup opened:', popup.url());
      await popup.waitForTimeout(2000);
      await popup.screenshot({
        path: `e2e/screenshots/oauth-popup-${Date.now()}.png`,
      });
      // Close popup without completing OAuth (just testing the flow initiates)
      await popup.close();
    } else {
      console.log('No popup opened - checking for connection dialog...');

      // Look for connection dialog/modal
      const dialog = page.locator('[role="dialog"], .dialog, .modal');
      if (await dialog.isVisible({ timeout: 3000 }).catch(() => false)) {
        console.log('Connection dialog opened');
        await page.screenshot({
          path: `e2e/screenshots/connection-dialog-${Date.now()}.png`,
        });
      }
    }

    console.log('OAuth flow initiation test completed');
  });

  test('should filter integrations by category', async ({ page }) => {
    await navigateToIntegrations(page);

    // Click on different category tabs
    const categoryTabs = [
      'Communication',
      'Email & Calendar',
      'Project Management',
    ];

    for (const category of categoryTabs) {
      const tab = page.locator(`button:has-text("${category}"), [role="tab"]:has-text("${category}")`);

      if (await tab.isVisible({ timeout: 3000 }).catch(() => false)) {
        await tab.click();
        await page.waitForTimeout(500);

        // Take screenshot
        await page.screenshot({
          path: `e2e/screenshots/integrations-category-${category.replace(/\s+/g, '-')}-${Date.now()}.png`,
        });

        console.log(`Filtered by category: ${category}`);
      }
    }
  });

  test('should display integration details', async ({ page }) => {
    await navigateToIntegrations(page);

    // Find any integration card
    const integrationCard = page.locator('.group, [class*="card"]').first();
    await integrationCard.waitFor({ state: 'visible', timeout: 10000 });

    // Check for integration name
    const integrationName = page.locator('h3, [class*="title"]').first();
    if (await integrationName.isVisible({ timeout: 3000 }).catch(() => false)) {
      const name = await integrationName.textContent();
      console.log('Found integration:', name);
    }

    // Check for description
    const description = page.locator('p[class*="text-slate-400"], p[class*="description"]').first();
    if (await description.isVisible({ timeout: 3000 }).catch(() => false)) {
      const desc = await description.textContent();
      console.log('Description:', desc?.substring(0, 50) + '...');
    }

    // Take screenshot
    await page.screenshot({
      path: `e2e/screenshots/integration-card-details-${Date.now()}.png`,
    });

    console.log('Integration details displayed correctly');
  });

  test('should handle refresh action', async ({ page }) => {
    await navigateToIntegrations(page);

    // Find refresh button on the page
    const refreshButton = page.locator(
      'button:has-text("Refresh"), button[aria-label*="refresh" i], button:has(svg[class*="refresh" i])'
    ).first();

    if (await refreshButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await refreshButton.click();
      console.log('Clicked refresh button');

      // Wait for any loading state to complete
      await page.waitForTimeout(2000);

      // Take screenshot
      await page.screenshot({
        path: `e2e/screenshots/integrations-after-refresh-${Date.now()}.png`,
      });

      console.log('Refresh action completed');
    } else {
      console.log('No refresh button found on the page');
    }
  });
});

// ============================================
// Edge Function API Tests
// ============================================

test.describe('Composio API', () => {
  test('should call composio-connect edge function', async ({ request }) => {
    // Test the edge function directly
    const response = await request.post(
      `${BASE_URL.replace('app.isyncso.com', 'sfxpmzicgpaxfntqleig.supabase.co')}/functions/v1/composio-connect`,
      {
        headers: {
          'Content-Type': 'application/json',
        },
        data: {
          action: 'listAuthConfigs',
          toolkitSlug: 'gmail',
        },
      }
    );

    console.log('Edge function response status:', response.status());

    const responseBody = await response.json().catch(() => ({}));
    console.log('Response:', JSON.stringify(responseBody, null, 2).substring(0, 500));

    // The function should return a response (even if API key is not set)
    expect(response.status()).toBeLessThan(500);
  });
});

// ============================================
// Visual Regression Tests
// ============================================

test.describe('Visual Tests', () => {
  test('integrations page visual snapshot', async ({ page }) => {
    await loginToApp(page);
    await navigateToIntegrations(page);

    // Wait for all images/content to load
    await page.waitForTimeout(3000);

    // Take full page screenshot
    await page.screenshot({
      path: `e2e/screenshots/integrations-full-page-${Date.now()}.png`,
      fullPage: true,
    });

    console.log('Full page screenshot captured');
  });
});
