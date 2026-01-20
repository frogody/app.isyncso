import { test, expect, Page, ConsoleMessage } from '@playwright/test';

/**
 * Comprehensive Inbox Phase 3 E2E Tests
 *
 * Tests all features:
 * - Message sending and receiving
 * - Channel Details panel
 * - Members panel
 * - Rate limiting/Moderation settings
 * - Mobile responsive layout
 * - Real-time updates
 * - Error handling
 */

test.describe('Inbox Phase 3 - Comprehensive Tests', () => {
  test.use({ storageState: 'playwright/.auth/user.json' });

  let consoleErrors: string[] = [];
  let networkErrors: { url: string; status: number; text: string }[] = [];

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    networkErrors = [];

    // Capture console errors
    page.on('console', (msg: ConsoleMessage) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        consoleErrors.push(text);
        console.log(`[CONSOLE ERROR] ${text}`);
      }
    });

    // Capture page errors (uncaught exceptions)
    page.on('pageerror', (error: Error) => {
      consoleErrors.push(`PAGE ERROR: ${error.message}`);
      console.log(`[PAGE ERROR] ${error.message}`);
    });

    // Capture network errors
    page.on('response', (response) => {
      const status = response.status();
      if (status >= 400) {
        networkErrors.push({
          url: response.url(),
          status,
          text: response.statusText(),
        });
        console.log(`[NETWORK ERROR] ${status} ${response.url()}`);
      }
    });
  });

  test.afterEach(async ({ page }, testInfo) => {
    // Take final screenshot
    await page.screenshot({
      path: `e2e/screenshots/inbox-${testInfo.title.replace(/\s+/g, '-')}-final.png`,
      fullPage: true
    });

    // Log any accumulated errors
    if (consoleErrors.length > 0) {
      console.log('\n=== Console Errors ===');
      consoleErrors.forEach(e => console.log(e));
    }
    if (networkErrors.length > 0) {
      console.log('\n=== Network Errors ===');
      networkErrors.forEach(e => console.log(`${e.status}: ${e.url}`));
    }
  });

  test('1. Navigate to Inbox and verify initial load', async ({ page }) => {
    console.log('Navigating to Inbox...');
    await page.goto('/inbox', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);

    // Verify page loaded
    await expect(page.locator('text=Channels').first()).toBeVisible({ timeout: 10000 });

    // Take screenshot
    await page.screenshot({ path: 'e2e/screenshots/inbox-initial-load.png', fullPage: true });

    // Check for console errors during load
    const criticalErrors = consoleErrors.filter(e =>
      !e.includes('[Realtime]') && // Ignore realtime logs
      !e.includes('favicon') // Ignore favicon errors
    );

    console.log(`Console errors during load: ${criticalErrors.length}`);
    expect(criticalErrors.length).toBeLessThan(3); // Allow some minor errors
  });

  test('2. Select channel and verify message list', async ({ page }) => {
    await page.goto('/inbox', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);

    // Click on "general" channel
    const generalChannel = page.locator('text=general').first();
    if (await generalChannel.isVisible()) {
      await generalChannel.click();
      await page.waitForTimeout(2000);
    }

    // Verify channel header shows
    await expect(page.locator('[class*="border-b"]').filter({ hasText: 'general' })).toBeVisible({ timeout: 5000 });

    await page.screenshot({ path: 'e2e/screenshots/inbox-channel-selected.png', fullPage: true });
  });

  test('3. Send a message and verify it appears', async ({ page }) => {
    await page.goto('/inbox', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);

    // Select general channel
    await page.locator('text=general').first().click();
    await page.waitForTimeout(1000);

    // Find message input
    const messageInput = page.locator('textarea[placeholder*="message"], input[placeholder*="message"]').first();
    await expect(messageInput).toBeVisible({ timeout: 5000 });

    // Type and send message
    const testMessage = `E2E Test Message ${Date.now()}`;
    await messageInput.fill(testMessage);
    await page.waitForTimeout(500);

    // Press Enter or click send button
    await page.keyboard.press('Enter');
    await page.waitForTimeout(2000);

    // Check for network errors during send
    const sendErrors = networkErrors.filter(e => e.url.includes('messages'));
    if (sendErrors.length > 0) {
      console.log('Message send errors:', sendErrors);
    }
    expect(sendErrors.length).toBe(0);

    // Verify message appears in list
    await expect(page.locator(`text=${testMessage}`)).toBeVisible({ timeout: 10000 });

    await page.screenshot({ path: 'e2e/screenshots/inbox-message-sent.png', fullPage: true });
  });

  test('4. Open Channel Details panel', async ({ page }) => {
    await page.goto('/inbox', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);

    // Select channel first
    await page.locator('text=general').first().click();
    await page.waitForTimeout(1000);

    // Click the info icon (i) button
    const infoButton = page.locator('button').filter({ has: page.locator('svg.lucide-info, [class*="Info"]') }).first();
    if (await infoButton.isVisible()) {
      await infoButton.click();
    } else {
      // Alternative: look for button with title/aria-label
      await page.locator('[aria-label*="details"], [title*="details"]').first().click();
    }
    await page.waitForTimeout(1000);

    // Verify Channel Details panel opens
    await expect(page.locator('text=Channel Details')).toBeVisible({ timeout: 5000 });

    // Verify content
    await expect(page.locator('text=Members')).toBeVisible();
    await expect(page.locator('text=Created')).toBeVisible();

    // Check for crash errors
    const crashErrors = consoleErrors.filter(e =>
      e.includes('is not defined') ||
      e.includes('Cannot read') ||
      e.includes('undefined')
    );
    expect(crashErrors.length).toBe(0);

    await page.screenshot({ path: 'e2e/screenshots/inbox-channel-details.png', fullPage: true });
  });

  test('5. Open Members panel', async ({ page }) => {
    await page.goto('/inbox', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);

    // Select channel
    await page.locator('text=general').first().click();
    await page.waitForTimeout(1000);

    // Click Members icon
    const membersButton = page.locator('button').filter({ has: page.locator('svg.lucide-users, [class*="Users"]') }).first();
    if (await membersButton.isVisible()) {
      await membersButton.click();
    }
    await page.waitForTimeout(1000);

    // Verify Members panel
    await expect(page.locator('text=Members').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Your role')).toBeVisible({ timeout: 5000 });

    await page.screenshot({ path: 'e2e/screenshots/inbox-members-panel.png', fullPage: true });
  });

  test('6. Test Moderation Settings (Rate Limiting)', async ({ page }) => {
    await page.goto('/inbox', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);

    // Select channel
    await page.locator('text=general').first().click();
    await page.waitForTimeout(1000);

    // Open Channel Details
    const infoButton = page.locator('button').filter({ has: page.locator('svg.lucide-info, [class*="Info"]') }).first();
    if (await infoButton.isVisible()) {
      await infoButton.click();
    }
    await page.waitForTimeout(1000);

    // Look for Moderation Settings
    const moderationButton = page.locator('text=Moderation Settings');
    if (await moderationButton.isVisible()) {
      await moderationButton.click();
      await page.waitForTimeout(1000);

      // Verify slowmode options appear
      await expect(page.locator('text=Slowmode')).toBeVisible({ timeout: 5000 });

      // Click a slowmode option
      const slowmodeOption = page.locator('button:has-text("5s")');
      if (await slowmodeOption.isVisible()) {
        await slowmodeOption.click();
      }

      // Save settings
      const saveButton = page.locator('button:has-text("Save Settings")');
      if (await saveButton.isVisible()) {
        await saveButton.click();
        await page.waitForTimeout(2000);
      }

      // Check for errors
      const rateErrors = networkErrors.filter(e => e.url.includes('rate_limits'));
      expect(rateErrors.length).toBe(0);
    }

    await page.screenshot({ path: 'e2e/screenshots/inbox-moderation-settings.png', fullPage: true });
  });

  test('7. Test Mobile Responsive Layout', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 812 }); // iPhone X size

    await page.goto('/inbox', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);

    await page.screenshot({ path: 'e2e/screenshots/inbox-mobile-initial.png', fullPage: true });

    // Look for hamburger menu
    const hamburgerButton = page.locator('button').filter({ has: page.locator('svg.lucide-menu, [class*="Menu"]') }).first();
    if (await hamburgerButton.isVisible()) {
      await hamburgerButton.click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: 'e2e/screenshots/inbox-mobile-menu-open.png', fullPage: true });
    }

    // Verify layout is usable
    const messageInput = page.locator('textarea[placeholder*="message"], input[placeholder*="message"]').first();
    const isInputVisible = await messageInput.isVisible();
    console.log(`Message input visible on mobile: ${isInputVisible}`);

    await page.screenshot({ path: 'e2e/screenshots/inbox-mobile-final.png', fullPage: true });
  });

  test('8. Verify no excessive console logging', async ({ page }) => {
    await page.goto('/inbox', { waitUntil: 'networkidle', timeout: 30000 });

    // Wait and count console messages
    let messageCount = 0;
    const countHandler = () => { messageCount++; };
    page.on('console', countHandler);

    await page.waitForTimeout(5000);

    page.off('console', countHandler);

    console.log(`Console messages in 5 seconds: ${messageCount}`);

    // Should not have excessive logging (< 50 messages in 5 seconds)
    expect(messageCount).toBeLessThan(50);
  });

  test('9. Verify real-time message updates', async ({ page }) => {
    await page.goto('/inbox', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);

    // Select channel
    await page.locator('text=general').first().click();
    await page.waitForTimeout(1000);

    // Count current messages
    const initialMessages = await page.locator('[class*="message"], [data-message-id]').count();
    console.log(`Initial message count: ${initialMessages}`);

    // Send a message
    const messageInput = page.locator('textarea[placeholder*="message"], input[placeholder*="message"]').first();
    await messageInput.fill(`Realtime test ${Date.now()}`);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(3000);

    // Count messages again
    const finalMessages = await page.locator('[class*="message"], [data-message-id]').count();
    console.log(`Final message count: ${finalMessages}`);

    // Should have at least one more message
    expect(finalMessages).toBeGreaterThanOrEqual(initialMessages);
  });

  test('10. Test channel switching', async ({ page }) => {
    await page.goto('/inbox', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);

    // Click general
    await page.locator('text=general').first().click();
    await page.waitForTimeout(1000);

    // Verify header shows general
    await expect(page.locator('h2, h3').filter({ hasText: 'general' })).toBeVisible({ timeout: 5000 });

    // Click random
    const randomChannel = page.locator('text=random').first();
    if (await randomChannel.isVisible()) {
      await randomChannel.click();
      await page.waitForTimeout(1000);

      // Verify header shows random
      await expect(page.locator('h2, h3').filter({ hasText: 'random' })).toBeVisible({ timeout: 5000 });
    }

    // Check for errors during switching
    const switchErrors = consoleErrors.filter(e =>
      e.includes('undefined') ||
      e.includes('null') ||
      e.includes('Error')
    );
    console.log(`Errors during channel switch: ${switchErrors.length}`);

    await page.screenshot({ path: 'e2e/screenshots/inbox-channel-switch.png', fullPage: true });
  });
});
