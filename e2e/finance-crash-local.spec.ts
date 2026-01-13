import { test, expect, Page, ConsoleMessage } from '@playwright/test';

// Test against local dev server to get unminified errors
test.describe('Finance Overview Crash - Local Dev', () => {
  // Use the saved auth state
  test.use({ storageState: 'playwright/.auth/user.json' });

  let consoleMessages: { type: string; text: string; location?: any }[] = [];
  let pageErrors: { text: string; stack?: string }[] = [];

  test.beforeEach(async ({ page }) => {
    consoleMessages = [];
    pageErrors = [];

    page.on('console', (msg: ConsoleMessage) => {
      consoleMessages.push({
        type: msg.type(),
        text: msg.text(),
        location: msg.location(),
      });
      if (msg.type() === 'error') {
        console.log(`[CONSOLE ERROR] ${msg.text()}`);
      }
    });

    page.on('pageerror', (error: Error) => {
      pageErrors.push({
        text: error.message,
        stack: error.stack,
      });
      console.log(`[PAGE ERROR] ${error.message}`);
      console.log(`[STACK]\n${error.stack}`);
    });
  });

  test('Click sidebar items sequentially on localhost', async ({ page }) => {
    console.log('Testing against localhost:5174...\n');

    // Navigate to Dashboard (auth state is already loaded)
    console.log('Navigating to Dashboard...');
    await page.goto('http://localhost:5174/dashboard', { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(3000);

    // Take screenshot to see current state
    await page.screenshot({ path: 'e2e/screenshots/localhost-state.png', fullPage: true });
    console.log('Screenshot saved');

    // Check page content
    const pageContent = await page.textContent('body');
    console.log('Page text (first 500 chars):', pageContent?.substring(0, 500));

    // Get all sidebar links
    const sidebarLinks = await page.$$('nav a[href]');
    console.log(`\nFound ${sidebarLinks.length} sidebar links`);

    // Click each one sequentially
    for (let i = 0; i < sidebarLinks.length; i++) {
      const currentLinks = await page.$$('nav a[href]');
      if (i >= currentLinks.length) continue;

      const link = currentLinks[i];
      const href = await link.getAttribute('href');
      console.log(`--- Clicking ${i + 1}/${sidebarLinks.length}: ${href} ---`);

      try {
        await link.click();
        await page.waitForTimeout(1500);

        // Check for errors
        const hasError = await page.$('text="Something went wrong"') || await page.$('text="error"');
        if (hasError) {
          console.log('\n!!! ERROR DETECTED !!!');
          await page.screenshot({ path: `e2e/screenshots/local-crash-${i + 1}.png`, fullPage: true });

          // Report errors
          console.log('\nConsole Errors:');
          consoleMessages.filter(m => m.type === 'error').forEach(e => {
            console.log(`  ${e.text}\n`);
          });

          console.log('Page Errors:');
          pageErrors.forEach(e => {
            console.log(`  ${e.text}`);
            console.log(`  Stack: ${e.stack}`);
          });

          break;
        } else {
          console.log(`  ✓ OK`);
        }
      } catch (err) {
        console.log(`  Error: ${err.message}`);
      }
    }

    console.log('\n--- Summary ---');
    console.log(`Console errors: ${consoleMessages.filter(m => m.type === 'error').length}`);
    console.log(`Page errors: ${pageErrors.length}`);
  });
});
