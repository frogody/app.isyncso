import { test, expect } from '@playwright/test';

test.describe('AI System Registration Flow', () => {
  test('registers a new AI system from inventory page', async ({ page }) => {
    await page.goto('/aisysteminventory');
    await page.waitForLoadState('networkidle');

    // Page loads
    await expect(page.getByText('AI System Inventory')).toBeVisible();

    // Click register button
    await page.getByText('Register AI System').click();

    // Modal opens — research step visible
    await expect(page.getByText('Register New AI System')).toBeVisible();
    await expect(page.getByText('Research with CIDE')).toBeVisible();

    // Skip to manual entry
    await page.getByText('skip to manual entry').click();

    // Form step visible
    await expect(page.getByText('System Name *')).toBeVisible();

    // Fill form
    await page.getByPlaceholder('e.g., Customer Support Chatbot').fill('E2E Test AI System');
    await page.getByPlaceholder('What does this AI system do?').fill('Automated customer service via chatbot');
    await page.getByPlaceholder('Detailed description of the system').fill('AI chatbot for handling customer queries');

    // Select AI technique
    await page.getByText('Natural Language Processing').click();

    // Submit
    await page.getByText('Save & Continue to Assessment').click();

    // Should navigate to risk assessment
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('AI-Powered Risk Assessment').or(page.getByText('Risk Assessment'))).toBeVisible({ timeout: 10000 });
  });

  test('completes risk assessment wizard', async ({ page }) => {
    // Navigate to risk assessment for an existing system
    await page.goto('/aisysteminventory');
    await page.waitForLoadState('networkidle');

    // Check if there are any system cards with "Assess" button
    const assessButton = page.getByText('Assess').first();
    if (await assessButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await assessButton.click();
      await page.waitForLoadState('networkidle');

      // Should see the wizard
      await expect(page.getByText('AI-Powered Risk Assessment').or(page.getByText('Step 1: Prohibited Practices Check'))).toBeVisible({ timeout: 10000 });

      // Skip AI assessment if on step 0
      const skipLink = page.getByText('skip to manual assessment');
      if (await skipLink.isVisible({ timeout: 2000 }).catch(() => false)) {
        await skipLink.click();
      }

      // Step 1: Skip through prohibited (answer No to all or leave empty)
      await expect(page.getByText('Step 1: Prohibited Practices Check')).toBeVisible();
      await page.getByText('Continue to High-Risk Check').click();

      // Step 2: Skip through high-risk
      await expect(page.getByText('Step 2: High-Risk Categories')).toBeVisible();
      await page.getByText('Continue to GPAI Check').click();

      // Step 3: Skip through GPAI
      await expect(page.getByText('Step 3: General-Purpose AI Check')).toBeVisible();
      await page.getByText('Continue to Transparency Check').click();

      // Step 4: Complete
      await expect(page.getByText('Step 4: Transparency Requirements')).toBeVisible();
      await page.getByText('Complete Assessment').click();

      // Step 5: Results
      await expect(page.getByText('Assessment Complete')).toBeVisible({ timeout: 10000 });
      await expect(page.getByText('MINIMAL RISK')).toBeVisible();
    }
  });

  test('navigates to document generator from dashboard', async ({ page }) => {
    await page.goto('/sentineldashboard');
    await page.waitForLoadState('networkidle');

    // Look for document generation link in quick actions
    const docLink = page.getByText('Generate Docs').or(page.getByText('Document'));
    if (await docLink.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await docLink.first().click();
      await page.waitForLoadState('networkidle');
      await expect(page.getByText('Document Generator')).toBeVisible({ timeout: 10000 });
    }
  });

  test('filters systems in inventory', async ({ page }) => {
    await page.goto('/aisysteminventory');
    await page.waitForLoadState('networkidle');

    // Search input visible
    const searchInput = page.getByPlaceholder('Search AI systems...');
    await expect(searchInput).toBeVisible();

    // Type search term
    await searchInput.fill('nonexistent-system-xyz');
    await page.waitForTimeout(500);

    // Should show empty state or no results
    await expect(
      page.getByText('No Systems Found').or(page.getByText('Register Your First AI System'))
    ).toBeVisible({ timeout: 5000 });
  });
});
