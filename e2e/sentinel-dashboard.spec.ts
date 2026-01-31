import { test, expect } from '@playwright/test';

test.describe('SENTINEL Dashboard', () => {
  test('loads dashboard and displays stats', async ({ page }) => {
    await page.goto('/sentineldashboard');
    await page.waitForLoadState('networkidle');

    // Page title visible
    await expect(page.getByText('EU AI Act Compliance')).toBeVisible();

    // Stats section loads
    await expect(page.getByText('AI Systems')).toBeVisible();
    await expect(page.getByText('High-Risk')).toBeVisible();
    await expect(page.getByText('Compliant')).toBeVisible();
    await expect(page.getByText('In Progress')).toBeVisible();

    // Compliance score gauge renders
    await expect(page.getByText('Compliance Score')).toBeVisible();

    // Workflow stepper renders
    await expect(page.getByText('Register')).toBeVisible();
    await expect(page.getByText('Classify')).toBeVisible();
    await expect(page.getByText('Plan')).toBeVisible();
    await expect(page.getByText('Document')).toBeVisible();
  });

  test('navigates to AI System Inventory', async ({ page }) => {
    await page.goto('/sentineldashboard');
    await page.waitForLoadState('networkidle');

    // Click "Register AI System" button
    await page.getByText('Register AI System').click();
    await page.waitForLoadState('networkidle');

    // Should be on inventory page
    await expect(page).toHaveURL(/aisysteminventory/i);
    await expect(page.getByText('AI System Inventory')).toBeVisible();
  });

  test('displays risk classification breakdown', async ({ page }) => {
    await page.goto('/sentineldashboard');
    await page.waitForLoadState('networkidle');

    // Risk classification section
    await expect(page.getByText('Risk Classification')).toBeVisible();

    // Classification badges visible
    await expect(page.getByText('PROHIBITED')).toBeVisible();
    await expect(page.getByText('HIGH RISK')).toBeVisible();
    await expect(page.getByText('GPAI')).toBeVisible();
    await expect(page.getByText('MINIMAL RISK')).toBeVisible();
  });

  test('displays compliance status breakdown', async ({ page }) => {
    await page.goto('/sentineldashboard');
    await page.waitForLoadState('networkidle');

    await expect(page.getByText('Compliance Status')).toBeVisible();
    await expect(page.getByText('Not Started')).toBeVisible();
  });
});
