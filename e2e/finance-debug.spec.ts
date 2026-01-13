import { test, expect, Page, ConsoleMessage } from '@playwright/test';

// Test against production with saved auth state
test.describe('Finance Overview Debug', () => {
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

  test('Click sidebar items sequentially with inline auth', async ({ page }) => {
    console.log('Step 1: Navigate to dashboard...');
    // Use localhost to test the fix before deploying
    const baseUrl = process.env.TEST_BASE_URL || 'http://localhost:5174';
    await page.goto(`${baseUrl}/dashboard`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);

    // Take screenshot to see state
    await page.screenshot({ path: 'e2e/screenshots/prod-dashboard.png', fullPage: true });

    console.log('Step 2: Getting sidebar links...');
    const sidebarLinks = await page.$$('nav a[href]');
    console.log(`Found ${sidebarLinks.length} sidebar links`);

    // Log all hrefs
    for (let i = 0; i < sidebarLinks.length; i++) {
      const href = await sidebarLinks[i].getAttribute('href');
      console.log(`  ${i + 1}. ${href}`);
    }

    // Click each one sequentially
    for (let i = 0; i < sidebarLinks.length; i++) {
      const currentLinks = await page.$$('nav a[href]');
      if (i >= currentLinks.length) continue;

      const link = currentLinks[i];
      const href = await link.getAttribute('href');
      console.log(`\n--- Clicking ${i + 1}/${sidebarLinks.length}: ${href} ---`);

      try {
        await link.click();
        await page.waitForTimeout(1500);

        // Check for errors
        const errorBoundary = await page.$('text="Something went wrong"');
        if (errorBoundary) {
          console.log('\n!!! ERROR BOUNDARY DETECTED !!!');
          await page.screenshot({ path: `e2e/screenshots/crash-${i + 1}.png`, fullPage: true });

          // Report errors
          console.log('\nConsole Errors:');
          consoleMessages.filter(m => m.type === 'error').forEach(e => {
            console.log(`  ${e.text}`);
            if (e.location) {
              console.log(`  Location: ${e.location.url}:${e.location.lineNumber}`);
            }
          });

          console.log('\nPage Errors:');
          pageErrors.forEach(e => {
            console.log(`  ${e.text}`);
            console.log(`  Stack:\n${e.stack}`);
          });

          // Fail the test
          expect(errorBoundary).toBeFalsy();
          break;
        } else {
          console.log(`  ✓ OK`);
        }
      } catch (err: any) {
        console.log(`  Error clicking: ${err.message}`);
      }
    }

    console.log('\n--- Summary ---');
    console.log(`Console errors: ${consoleMessages.filter(m => m.type === 'error').length}`);
    console.log(`Page errors: ${pageErrors.length}`);
  });
});
