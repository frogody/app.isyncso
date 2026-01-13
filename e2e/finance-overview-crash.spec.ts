import { test, expect, Page, ConsoleMessage } from '@playwright/test';

// Test configuration - will run in headed mode
test.describe('Finance Overview Page Crash Investigation', () => {

  interface CapturedError {
    type: string;
    text: string;
    location?: { url: string; lineNumber: number; columnNumber: number };
    stack?: string;
    timestamp: Date;
  }

  let consoleMessages: CapturedError[] = [];
  let pageErrors: CapturedError[] = [];
  let networkErrors: { url: string; failure: string | null }[] = [];

  test.beforeEach(async ({ page }) => {
    // Reset captured data
    consoleMessages = [];
    pageErrors = [];
    networkErrors = [];

    // Capture all console output
    page.on('console', (msg: ConsoleMessage) => {
      consoleMessages.push({
        type: msg.type(),
        text: msg.text(),
        location: msg.location(),
        timestamp: new Date()
      });

      // Log important messages immediately
      if (msg.type() === 'error' || msg.type() === 'warning') {
        console.log(`[${msg.type().toUpperCase()}] ${msg.text()}`);
      }
    });

    // Capture page errors (uncaught exceptions)
    page.on('pageerror', (error: Error) => {
      pageErrors.push({
        type: 'pageerror',
        text: error.message,
        stack: error.stack,
        timestamp: new Date()
      });
      console.log(`[PAGE ERROR] ${error.message}`);
      console.log(`[STACK] ${error.stack}`);
    });

    // Capture failed network requests
    page.on('requestfailed', (request) => {
      networkErrors.push({
        url: request.url(),
        failure: request.failure()?.errorText || null
      });
      console.log(`[NETWORK FAILURE] ${request.url()}: ${request.failure()?.errorText}`);
    });
  });

  test('Click all sidebar icons top to bottom to reproduce crash', async ({ page }) => {
    console.log('\n========================================');
    console.log('SIDEBAR SEQUENTIAL CLICK TEST');
    console.log('========================================\n');

    // Navigate to initial page
    console.log('Step 1: Navigate to Dashboard...');
    await page.goto('https://app.isyncso.com/Dashboard', { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(2000);

    // Get all sidebar navigation links
    console.log('\nStep 2: Finding all sidebar icons...');
    const sidebarLinks = await page.$$('nav a[href]');
    console.log(`Found ${sidebarLinks.length} sidebar links`);

    // Click each one from top to bottom
    for (let i = 0; i < sidebarLinks.length; i++) {
      // Re-query links as DOM may have changed
      const currentLinks = await page.$$('nav a[href]');
      if (i >= currentLinks.length) {
        console.log(`Link ${i+1} no longer exists, skipping`);
        continue;
      }

      const link = currentLinks[i];
      const href = await link.getAttribute('href');
      console.log(`\n--- Clicking sidebar item ${i + 1}/${sidebarLinks.length}: ${href} ---`);

      try {
        await link.click();
        await page.waitForTimeout(1500); // Wait for page transition

        // Check for errors after each click
        const errorBoundary = await page.$('text="Something went wrong"');
        const unexpectedError = await page.$('text="unexpected error"');

        if (errorBoundary || unexpectedError) {
          console.log(`\n!!! ERROR DETECTED after clicking ${href} !!!`);
          await page.screenshot({
            path: `e2e/screenshots/crash-after-${i+1}.png`,
            fullPage: true
          });

          // Report all captured errors
          console.log('\n--- Console Errors ---');
          const errors = consoleMessages.filter(m => m.type === 'error');
          errors.forEach((e, idx) => console.log(`Error ${idx + 1}: ${e.text}`));

          console.log('\n--- Page Errors ---');
          pageErrors.forEach((e, idx) => console.log(`Page Error ${idx + 1}: ${e.text}\n${e.stack}`));

          expect(errorBoundary, `Error boundary appeared after clicking ${href}`).toBeFalsy();
        } else {
          console.log(`✓ Page loaded successfully: ${href}`);
        }
      } catch (err) {
        console.log(`Error clicking link ${i+1}: ${err.message}`);
      }
    }

    console.log('\n========================================');
    console.log('ALL SIDEBAR ITEMS CLICKED');
    console.log('========================================\n');

    // Final error check
    expect(pageErrors.length, 'No page errors should occur').toBe(0);
  });

  test('Navigate to Finance Overview via sidebar and capture crash details', async ({ page }) => {
    console.log('\n========================================');
    console.log('FINANCE OVERVIEW CRASH INVESTIGATION');
    console.log('========================================\n');

    // Run multiple navigation cycles to catch intermittent issues
    for (let iteration = 1; iteration <= 3; iteration++) {
      console.log(`\n--- Iteration ${iteration} of 3 ---\n`);

    // Step 1: Navigate to Dashboard first
    console.log('Step 1: Navigating to Dashboard...');
    await page.goto('https://app.isyncso.com/Dashboard', { waitUntil: 'networkidle', timeout: 60000 });

    // Wait for initial load
    await page.waitForTimeout(3000);

    // Take screenshot of dashboard
    await page.screenshot({ path: 'e2e/screenshots/dashboard-before-nav.png', fullPage: true });
    console.log('Dashboard loaded, screenshot saved');

    // Step 2: Navigate to Finance Overview via SIDEBAR click (not direct URL)
    console.log('\nStep 2: Clicking Finance icon in sidebar...');

    // Find the dollar sign icon link in sidebar - it's the Finance Overview link
    // The sidebar shows icons that map to different pages
    const financeLink = await page.$('a[href*="FinanceOverview"], a[href*="financeoverview"]');

    if (financeLink) {
      console.log('Found Finance Overview link');
      await financeLink.click();
    } else {
      // Try clicking based on text content or specific position
      console.log('Looking for dollar sign icon in nav...');

      // The sidebar has multiple nav links - Finance Overview uses DollarSign icon
      // Look for the link that contains the dollar sign SVG
      const dollarLink = await page.$('nav a:has(svg[class*="dollar"]), nav a:has(svg.lucide-dollar-sign)');

      if (dollarLink) {
        console.log('Found dollar icon link');
        await dollarLink.click();
      } else {
        // Click on the nav item by position - Finance is typically 7th item after Dashboard icons
        // Direct navigation as fallback
        console.log('Sidebar click failed, using direct navigation...');
        await page.goto('https://app.isyncso.com/FinanceOverview', {
          waitUntil: 'domcontentloaded',
          timeout: 30000
        });
      }
    }

    // Step 3: Wait and observe
    console.log('\nStep 3: Waiting for page to settle (5 seconds)...');
    await page.waitForTimeout(5000);

    // Take screenshot
    await page.screenshot({
      path: 'e2e/screenshots/finance-overview-state.png',
      fullPage: true
    });
    console.log('Screenshot saved to e2e/screenshots/finance-overview-state.png');

    // Step 4: Check for error boundary
    console.log('\nStep 4: Checking for error state...');

    const errorBoundary = await page.$('text="Something went wrong"');
    const unexpectedError = await page.$('text="unexpected error"');
    const tryAgain = await page.$('text="Try Again"');

    if (errorBoundary || unexpectedError || tryAgain) {
      console.log('\n========================================');
      console.log('ERROR BOUNDARY DETECTED!');
      console.log('========================================');

      // Capture error details
      const errorText = await page.textContent('body');
      console.log('\nVisible error text on page:');
      console.log(errorText?.substring(0, 500) || 'No text found');

      // Take error screenshot
      await page.screenshot({
        path: 'e2e/screenshots/finance-overview-error.png',
        fullPage: true
      });
    } else {
      console.log('No visible error boundary found');
    }

    // Step 5: Report all captured errors
    console.log('\n========================================');
    console.log('CAPTURED ERRORS SUMMARY');
    console.log('========================================');

    console.log('\n--- Console Errors ---');
    const errors = consoleMessages.filter(m => m.type === 'error');
    if (errors.length === 0) {
      console.log('No console errors captured');
    } else {
      errors.forEach((e, i) => {
        console.log(`\nError ${i + 1}:`);
        console.log(`  Text: ${e.text}`);
        if (e.location) {
          console.log(`  Location: ${e.location.url}:${e.location.lineNumber}:${e.location.columnNumber}`);
        }
      });
    }

    console.log('\n--- Page Errors (Uncaught Exceptions) ---');
    if (pageErrors.length === 0) {
      console.log('No page errors captured');
    } else {
      pageErrors.forEach((e, i) => {
        console.log(`\nPage Error ${i + 1}:`);
        console.log(`  Message: ${e.text}`);
        console.log(`  Stack: ${e.stack?.substring(0, 500)}`);
      });
    }

    console.log('\n--- Network Errors ---');
    if (networkErrors.length === 0) {
      console.log('No network errors captured');
    } else {
      networkErrors.forEach((e, i) => {
        console.log(`\nNetwork Error ${i + 1}:`);
        console.log(`  URL: ${e.url}`);
        console.log(`  Failure: ${e.failure}`);
      });
    }

    console.log('\n--- All Console Messages ---');
    consoleMessages.forEach((m, i) => {
      if (m.type !== 'log' && m.type !== 'info') {
        console.log(`[${m.type}] ${m.text.substring(0, 200)}`);
      }
    });

    // Determine if test passed for this iteration
    const hasErrors = pageErrors.length > 0 || errors.length > 0 || errorBoundary || unexpectedError;

    console.log('\n========================================');
    console.log(hasErrors ? `ITERATION ${iteration}: ERRORS FOUND - NEEDS FIX` : `ITERATION ${iteration}: PAGE LOADED SUCCESSFULLY`);
    console.log('========================================\n');

    // If errors found in any iteration, fail immediately
    if (hasErrors) {
      expect(pageErrors.length, 'Page should not have uncaught exceptions').toBe(0);
      expect(errorBoundary, 'Error boundary should not be visible').toBeFalsy();
    }

    // Navigate away before next iteration
    if (iteration < 3) {
      console.log('Navigating away for next iteration...');
      await page.goto('https://app.isyncso.com/SentinelDashboard', { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(2000);
    }
    } // End iteration loop

    // Final assertion
    expect(pageErrors.length, 'Page should not have uncaught exceptions').toBe(0);
  });

  test.afterEach(async ({ page }, testInfo) => {
    // Save detailed report
    const report = {
      timestamp: new Date().toISOString(),
      testName: testInfo.title,
      status: testInfo.status,
      consoleMessages,
      pageErrors,
      networkErrors
    };

    console.log('\n--- Test Report ---');
    console.log(JSON.stringify(report, null, 2));
  });
});
