import { test, expect } from "@playwright/test";

test.describe("løperuter UI", () => {
  test("viser kontrollpanel med alternativer", async ({ page }) => {
    await page.goto("/");

    await expect(
      page.getByRole("button", { name: "Generér ruter" }),
    ).toBeVisible({ timeout: 20000 });
    await expect(page.getByRole("button", { name: "Maksimer" })).toBeVisible({
      timeout: 20000,
    });
  });
});
