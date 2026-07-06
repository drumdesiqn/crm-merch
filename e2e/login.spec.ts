import { test, expect } from "@playwright/test";

test("login page renders", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("button", { name: /se connecter/i })).toBeVisible();
});

test("dashboard requires auth", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login/);
});

test("login shows backend error on invalid credentials", async ({ page }) => {
  await page.route("**/api/auth/login", async (route) => {
    await route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({ error: "Email ou mot de passe incorrect" }),
    });
  });

  await page.goto("/login");
  await page.locator("input#email").fill("wrong@example.com");
  await page.locator("input#password").fill("wrong-password");
  await page.getByRole("button", { name: /se connecter/i }).click();

  await expect(page.getByText("Email ou mot de passe incorrect")).toBeVisible();
  await expect(page).toHaveURL(/\/login/);
});
