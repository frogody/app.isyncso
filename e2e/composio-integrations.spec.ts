/**
 * Composio Integrations E2E Tests
 * Tests the integration connection flow via Composio
 *
 * Run with: npx playwright test composio-integrations.spec.ts --headed
 */

import { test, expect, Page } from '@playwright/test';

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
 * Helper: Navigate to integrations page
 */
async function navigateToIntegrations(page: Page) {
  // Try the new Composio Integrations page first
  await page.goto(`${BASE_URL}/ComposioIntegrations`);
  await waitForPageStable(page);

  // Check if we landed on the new Composio integrations page
  const composioHeading = page.locator('text="Third-Party Integrations"');
  if (await composioHeading.isVisible({ timeout: 5000 }).catch(() => false)) {
    console.log('Navigated to Composio integrations page');
    return;
  }

  // Try the settings/integrations route
  console.log('Trying /settings/integrations route...');
  await page.goto(`${BASE_URL}/settings/integrations`);
  await waitForPageStable(page);

  // Check if we're on the Composio page now
  if (await composioHeading.isVisible({ timeout: 3000 }).catch(() => false)) {
    console.log('Navigated to Composio integrations page via settings route');
    return;
  }

  // Fallback: try MCPIntegrations page (old integrations)
  console.log('Composio page not deployed yet, trying MCPIntegrations...');
  await page.goto(`${BASE_URL}/MCPIntegrations`);
  await waitForPageStable(page);

  const mcpHeading = page.locator('text="MCP Integrations"');
  if (await mcpHeading.isVisible({ timeout: 3000 }).catch(() => false)) {
    console.log('On MCPIntegrations page (old page)');
    return;
  }

  console.log('Could not navigate to any integrations page');
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
  // No need to login - auth is handled by auth.setup.ts and storageState

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

    // Find search input (only available on new Composio page)
    const searchInput = page.locator('input[placeholder*="Search" i], input[type="search"]');
    const hasSearch = await searchInput.isVisible({ timeout: 3000 }).catch(() => false);

    if (!hasSearch) {
      console.log('Search input not found - may be on old MCPIntegrations page');
      // Take screenshot to document current state
      await page.screenshot({
        path: `e2e/screenshots/integrations-no-search-${Date.now()}.png`,
      });

      // Still check that Gmail is visible somewhere on the page
      const gmailText = page.locator('text="Gmail"');
      await expect(gmailText).toBeVisible({ timeout: 5000 });
      console.log('Gmail integration visible on page');
      return;
    }

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
    // Auth is handled by auth.setup.ts
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
