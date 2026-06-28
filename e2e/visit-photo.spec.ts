import { test, expect } from "@playwright/test";

test("visit detail page redirects when not authenticated", async ({ page }) => {
  await page.goto("/planning/any-id");
  await expect(page).toHaveURL(/\/login/);
});
