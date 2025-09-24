import { test, expect } from '@playwright/test';

test.describe('Løperuter planner', () => {
  test('generates alternatives for point to point longer than baseline', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Punkt til punkt' }).click();
    await page.getByPlaceholder('Start lat').fill('59.91');
    await page.getByPlaceholder('Start lng').fill('10.75');
    await page.getByPlaceholder('Slutt lat').fill('59.94');
    await page.getByPlaceholder('Slutt lng').fill('10.80');
    const targetInput = await page.getByLabel('Måldistanse (km)');
    await targetInput.fill('10');
    await page.getByRole('button', { name: 'Planlegg ruter' }).click();
    const altButtons = page.locator('button:has-text("Alternativ")');
    await expect(altButtons.first()).toBeVisible({ timeout: 10_000 });
    await page.waitForTimeout(200);
    const count = await altButtons.count();
    expect(count).toBeGreaterThan(1);
    await altButtons.nth(1).click();
    await expect(page.getByText('Høydeprofil')).toBeVisible();
  });
});
