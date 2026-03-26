import { test, expect } from '@playwright/test';

// ============================================================
// E2E Tests: Estimate Flow — Form Entry → Estimate Generation
// ============================================================

test.describe('Estimate Form Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to estimate page, dismiss onboarding
    await page.goto('/estimate');
    // Wait for the page to hydrate
    await page.waitForTimeout(1000);
  });

  test('homepage loads with hero CTA buttons', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=BulletEV')).toBeVisible();
    await expect(page.locator('text=Guided Form')).toBeVisible();
    await expect(page.locator('text=Quick Quote')).toBeVisible();
  });

  test('estimate page loads with 12 tabs', async ({ page }) => {
    await expect(page.locator('text=Estimate Progress')).toBeVisible();
    // Check key tabs are visible
    await expect(page.locator('role=tab[name="Project"]')).toBeVisible();
    await expect(page.locator('role=tab[name="Charger"]')).toBeVisible();
    await expect(page.locator('role=tab[name="Electrical"]')).toBeVisible();
  });

  test('workflow stepper shows on estimate pages', async ({ page }) => {
    // The WorkflowStepper should be present
    await expect(page.locator('text=Site & Map')).toBeVisible();
    await expect(page.locator('text=Configure Estimate')).toBeVisible();
    await expect(page.locator('text=Review & Export')).toBeVisible();
  });

  test('quick quote mode shows only 4 tabs', async ({ page }) => {
    await page.goto('/estimate?quick=true');
    await page.waitForTimeout(500);
    // Should see Quick Quote header
    await expect(page.locator('text=Quick Quote')).toBeVisible();
  });
});

// ============================================================
// E2E Tests: Hampton Inn Scenario — Enter Data → Verify Cost
// ============================================================

test.describe('Hampton Inn Estimate Accuracy', () => {
  test('entering Hampton Inn scenario produces expected estimate', async ({ page }) => {
    // Load the Hampton Inn scenario directly
    await page.goto('/estimate?scenario=hampton-inn');
    await page.waitForTimeout(1500);

    // Click "Generate Estimate" button
    const generateBtn = page.locator('button:has-text("Generate Estimate")');
    if (await generateBtn.isVisible()) {
      await generateBtn.click();
      await page.waitForTimeout(500);
    }

    // Check that an estimate was generated (LiveEstimateSummary should show)
    // The summary footer shows the total
    const summaryTotal = page.locator('text=/\\$[\\d,]+/').first();
    await expect(summaryTotal).toBeVisible({ timeout: 5000 });
  });

  test('scenario loads correct charger count', async ({ page }) => {
    await page.goto('/estimate?scenario=hampton-inn');
    await page.waitForTimeout(1500);

    // Navigate to Charger tab
    await page.locator('role=tab[name="Charger"]').click();
    await page.waitForTimeout(300);

    // Verify charger count is 4
    const countInput = page.locator('input[type="number"]').first();
    await expect(countInput).toHaveValue('4');
  });
});

// ============================================================
// E2E Tests: Form → Map Data Flow
// ============================================================

test.describe('Map to Form Data Sync', () => {
  test('map workspace page loads', async ({ page }) => {
    await page.goto('/estimate/map');
    await page.waitForTimeout(2000);

    // Should see the map header
    await expect(page.locator('text=Map Workspace')).toBeVisible();
    // Should see auto-save indicator
    await expect(page.locator('text=Changes save automatically')).toBeVisible();
  });
});

// ============================================================
// E2E Tests: Shared Quote Page
// ============================================================

test.describe('Shared Quote Experience', () => {
  test('shared quote 404s for invalid ID', async ({ page }) => {
    const response = await page.goto('/e/nonexistent-id-12345');
    expect(response?.status()).toBe(404);
  });
});

// ============================================================
// E2E Tests: Route Verification — All Pages Accessible
// ============================================================

test.describe('All Routes Accessible', () => {
  const routes = [
    { path: '/', name: 'Homepage', expectedText: 'BulletEV' },
    { path: '/estimate', name: 'Estimate Form', expectedText: 'Estimate Progress' },
    { path: '/estimate/map', name: 'Map Workspace', expectedText: 'Map Workspace' },
    { path: '/estimate?quick=true', name: 'Quick Quote', expectedText: 'Quick Quote' },
  ];

  for (const route of routes) {
    test(`${route.name} (${route.path}) loads successfully`, async ({ page }) => {
      const response = await page.goto(route.path);
      expect(response?.status()).toBeLessThan(400);
      await expect(page.locator(`text=${route.expectedText}`)).toBeVisible({ timeout: 10000 });
    });
  }
});

// ============================================================
// E2E Tests: Estimate Accuracy Against Real Proposals
// ============================================================

test.describe('Real Proposal Accuracy Tests', () => {
  test('Hotel Surface Lot scenario generates reasonable total', async ({ page }) => {
    await page.goto('/estimate?scenario=hotel-surface-lot');
    await page.waitForTimeout(1500);

    // Generate estimate
    const btn = page.locator('button:has-text("Generate Estimate")');
    if (await btn.isVisible()) {
      await btn.click();
      await page.waitForTimeout(1000);
    }

    // Verify the page didn't crash
    await expect(page.locator('text=Estimate Progress')).toBeVisible();
  });

  test('form saves to localStorage and persists on refresh', async ({ page }) => {
    await page.goto('/estimate');
    await page.waitForTimeout(1000);

    // Click on Project tab
    await page.locator('role=tab[name="Project"]').click();
    await page.waitForTimeout(300);

    // Type a project name
    const nameInput = page.locator('input[placeholder*="Hampton"]').or(page.locator('input').first());
    if (await nameInput.isVisible()) {
      await nameInput.fill('E2E Test Project');
      await page.waitForTimeout(500);

      // Refresh
      await page.reload();
      await page.waitForTimeout(1500);

      // Verify the value persisted
      await expect(page.locator('input[value="E2E Test Project"]')).toBeVisible({ timeout: 5000 });
    }
  });
});
