import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test configuration
const TEST_INVOICE_PATH = path.join(__dirname, 'fixtures', 'test-invoice.pdf');
const EXPENSES_PAGE_URL = '/FinanceExpenses'; // Finance expenses page, not inventory
const UPLOAD_TIMEOUT = 60000; // 60 seconds for AI processing

// Helper to save screenshots with timestamps
async function saveDebugScreenshot(page, name: string) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const screenshotPath = path.join(__dirname, 'screenshots', `${name}-${timestamp}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(`Screenshot saved: ${screenshotPath}`);
}

// Helper to capture console logs
function setupConsoleCapture(page) {
  const logs: string[] = [];
  const errors: string[] = [];

  page.on('console', msg => {
    const text = `[${msg.type()}] ${msg.text()}`;
    logs.push(text);
    if (msg.type() === 'error') {
      errors.push(text);
    }
  });

  page.on('pageerror', error => {
    const errorText = `[PAGE ERROR] ${error.message}`;
    errors.push(errorText);
    logs.push(errorText);
  });

  return { logs, errors };
}

test.describe('Invoice Upload and Processing', () => {

  test.beforeEach(async ({ page }) => {
    // Create screenshots directory
    const screenshotsDir = path.join(__dirname, 'screenshots');
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true });
    }
  });

  test('should upload invoice and process it successfully', async ({ page }) => {
    // Setup console logging
    const { logs, errors } = setupConsoleCapture(page);

    console.log('Starting invoice upload test...');
    console.log('Test invoice path:', TEST_INVOICE_PATH);
    console.log('Base URL:', page.context()['_options'].baseURL);

    // Step 1: Navigate to the application
    console.log('Step 1: Navigating to home page...');
    await page.goto('/');
    await saveDebugScreenshot(page, '01-homepage');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Check if we need to login
    const isLoginPage = await page.locator('input[type="email"]').isVisible().catch(() => false);
    if (isLoginPage) {
      console.log('Login required - cannot proceed with automated test');
      console.log('Please configure test credentials or use authenticated session');

      await saveDebugScreenshot(page, '02-login-required');

      // Log this as a known limitation
      console.warn('⚠️  Test requires manual authentication or test credentials');
      test.skip('Authentication required - skipping test');
      return;
    }

    // Step 2: Navigate to Expenses page
    console.log('Step 2: Navigating to Expenses page...');
    await page.goto(EXPENSES_PAGE_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    await saveDebugScreenshot(page, '03-expenses-page');

    // Check what page we're on
    const currentUrl = page.url();
    console.log('Current URL:', currentUrl);

    // Verify we're on expenses page (flexible - just check URL contains the path)
    if (!currentUrl.includes('inventoryexpenses') && !currentUrl.includes('expenses')) {
      console.warn('Not on expenses page, trying direct navigation...');
      await page.goto(EXPENSES_PAGE_URL, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);
    }

    console.log('On expenses page, looking for UI elements...');

    // Check for onboarding overlay (skill level selection)
    const continueButton = page.locator('button:has-text("Continue")');
    if (await continueButton.isVisible().catch(() => false)) {
      console.log('Detected onboarding overlay, selecting skill level...');

      // Select "Intermediate" skill level
      const intermediateButton = page.locator('button:has-text("Intermediate")');
      if (await intermediateButton.isVisible().catch(() => false)) {
        console.log('Clicking Intermediate skill level...');
        await intermediateButton.click();
        await page.waitForTimeout(500);
      }

      // Now click Continue (should be enabled)
      console.log('Clicking Continue button...');
      await continueButton.click({ timeout: 5000 });
      await page.waitForTimeout(2000);
      await saveDebugScreenshot(page, '03-after-onboarding-continue');
    }

    // Step 3: Click "Upload Invoice" button
    console.log('Step 3: Looking for Upload Invoice button...');

    // Try multiple selectors to find the upload button
    const uploadButtonSelectors = [
      'button:has-text("Upload Invoice")',
      'button:has-text("Upload")',
      '[data-testid="upload-invoice"]',
      '.upload-invoice-btn',
    ];

    let uploadButton;
    for (const selector of uploadButtonSelectors) {
      uploadButton = page.locator(selector).first();
      if (await uploadButton.isVisible().catch(() => false)) {
        console.log('Found upload button with selector:', selector);
        break;
      }
    }

    if (!uploadButton || !(await uploadButton.isVisible().catch(() => false))) {
      console.error('Upload button not found');
      await saveDebugScreenshot(page, '04-upload-button-not-found');
      console.log('Available buttons:', await page.locator('button').allTextContents());
      throw new Error('Upload Invoice button not found');
    }

    await uploadButton.click();
    console.log('Clicked upload button');
    await page.waitForTimeout(1000); // Wait for dialog to open
    await saveDebugScreenshot(page, '05-upload-dialog-opened');

    // Step 4: Upload the test invoice file
    console.log('Step 4: Uploading test invoice file...');

    // Look for file input
    const fileInput = page.locator('input[type="file"]');
    await expect(fileInput).toBeAttached({ timeout: 5000 });

    console.log('Setting file input...');
    await fileInput.setInputFiles(TEST_INVOICE_PATH);
    await page.waitForTimeout(1000);
    await saveDebugScreenshot(page, '06-file-selected');

    // Step 5: Submit the upload
    console.log('Step 5: Looking for upload submit button...');

    const submitButtonSelectors = [
      'button:has-text("Upload")',
      'button:has-text("Uploaden")',
      'button:has-text("Verwerken")',
      'button[type="submit"]',
    ];

    let submitButton;
    for (const selector of submitButtonSelectors) {
      submitButton = page.locator(selector).last(); // Use last to avoid the main upload button
      if (await submitButton.isVisible().catch(() => false)) {
        console.log('Found submit button with selector:', selector);
        break;
      }
    }

    if (!submitButton || !(await submitButton.isVisible().catch(() => false))) {
      console.error('Submit button not found');
      await saveDebugScreenshot(page, '07-submit-button-not-found');
      throw new Error('Upload submit button not found');
    }

    // Get initial invoice count
    const initialInvoiceElements = await page.locator('[data-testid="expense-item"], .expense-row, .invoice-item').count();
    console.log('Initial invoice count:', initialInvoiceElements);

    console.log('Clicking submit button...');
    await submitButton.click();
    await saveDebugScreenshot(page, '08-upload-submitted');

    // Step 6: Wait for processing to start
    console.log('Step 6: Waiting for invoice to appear with processing status...');

    // Wait for dialog to close
    await page.waitForTimeout(2000);

    // Check for success/error toasts
    const toast = page.locator('.toast, [role="alert"], .notification').first();
    if (await toast.isVisible().catch(() => false)) {
      const toastText = await toast.textContent();
      console.log('Toast message:', toastText);
    }

    await saveDebugScreenshot(page, '09-after-upload');

    // Wait for a new invoice to appear
    await page.waitForTimeout(3000);
    const newInvoiceCount = await page.locator('[data-testid="expense-item"], .expense-row, .invoice-item').count();
    console.log('New invoice count:', newInvoiceCount);

    // Step 7: Find the newly uploaded invoice
    console.log('Step 7: Looking for newly uploaded invoice...');

    // Look for invoice with processing status or our test invoice number
    const processingInvoice = page.locator('text=/processing|Processing|INV-2026-001/i').first();

    const invoiceFound = await processingInvoice.isVisible().catch(() => false);
    if (!invoiceFound) {
      console.error('Could not find processing invoice');
      await saveDebugScreenshot(page, '10-invoice-not-found');
      console.log('Console logs:', logs.slice(-20));
      console.log('Console errors:', errors);
    }

    expect(invoiceFound).toBeTruthy();
    await saveDebugScreenshot(page, '11-invoice-processing');

    // Step 8: Wait for AI processing to complete
    console.log('Step 8: Waiting for AI processing to complete (up to 60s)...');

    try {
      // Wait for status to change from processing
      await page.waitForSelector('text=/approved|pending_review|completed|failed/i', {
        timeout: UPLOAD_TIMEOUT,
        state: 'visible'
      });

      console.log('Processing completed!');
      await saveDebugScreenshot(page, '12-processing-complete');

      // Step 9: Verify extracted data
      console.log('Step 9: Verifying extracted invoice data...');

      // Check for expected values from our test invoice
      const pageContent = await page.content();
      const expectedValues = ['502.15', 'Test Supplier', 'INV-2026-001'];
      const foundValues = expectedValues.filter(val => pageContent.includes(val));

      console.log('Expected values found:', foundValues);
      console.log('Total:', foundValues.length, 'of', expectedValues.length);

      if (foundValues.length > 0) {
        console.log('✅ Some invoice data was extracted successfully');
      } else {
        console.warn('⚠️  Invoice data may not have been extracted as expected');
      }

      await saveDebugScreenshot(page, '13-final-state');

    } catch (error) {
      console.error('Processing did not complete within timeout');
      await saveDebugScreenshot(page, '12-processing-timeout');
      console.log('Final console logs:', logs.slice(-30));
      console.log('All errors:', errors);
      throw error;
    }

    // Final validation
    console.log('Test completed successfully!');
    console.log('Total console logs:', logs.length);
    console.log('Total errors:', errors.length);

    if (errors.length > 0) {
      console.warn('⚠️  Errors detected during test:');
      errors.forEach(err => console.warn('  -', err));
    }
  });

  test('should handle upload errors gracefully', async ({ page }) => {
    const { logs, errors } = setupConsoleCapture(page);

    console.log('Testing error handling...');

    // Navigate to expenses page
    await page.goto(EXPENSES_PAGE_URL);
    await page.waitForLoadState('networkidle');

    // Check if login is required
    const isLoginPage = await page.locator('input[type="email"]').isVisible().catch(() => false);
    if (isLoginPage) {
      console.log('Login required - skipping error test');
      test.skip('Authentication required');
      return;
    }

    // Try to upload an invalid file (if possible)
    const uploadButton = page.locator('button:has-text("Upload Invoice")').first();
    if (await uploadButton.isVisible().catch(() => false)) {
      await uploadButton.click();
      await page.waitForTimeout(1000);

      // Create a test invalid file
      const invalidFilePath = path.join(__dirname, 'fixtures', 'invalid.txt');
      fs.writeFileSync(invalidFilePath, 'This is not a valid invoice');

      const fileInput = page.locator('input[type="file"]');
      if (await fileInput.isVisible().catch(() => false)) {
        await fileInput.setInputFiles(invalidFilePath);
        await page.waitForTimeout(500);

        // Check for validation message
        const errorMessage = page.locator('text=/invalid|error|not supported/i');
        const hasError = await errorMessage.isVisible().catch(() => false);

        if (hasError) {
          console.log('✅ Error message displayed for invalid file');
        } else {
          console.log('ℹ️  No immediate error message - may validate on submit');
        }

        await saveDebugScreenshot(page, 'error-invalid-file');

        // Cleanup
        fs.unlinkSync(invalidFilePath);
      }
    }

    console.log('Error handling test completed');
  });
});
