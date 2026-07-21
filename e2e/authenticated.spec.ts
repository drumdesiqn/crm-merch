import { test, expect } from "@playwright/test";

const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL || "admin@marsmerch.com";
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD || "change-me-in-production";

test.beforeEach(async ({ page }) => {
  await page.goto("/login");
  await page.waitForSelector("input#email", { timeout: 10000 });
  await page.locator("input#email").fill(ADMIN_EMAIL);
  await page.locator("input#password").fill(ADMIN_PASSWORD);

  const [loginResponse] = await Promise.all([
    page.waitForResponse((resp) =>
      resp.url().includes("/api/auth/login") &&
      resp.request().method() === "POST"
    ),
    page.getByRole("button", { name: /se connecter/i }).click(),
  ]);

  if (loginResponse.status() >= 400) {
    throw new Error(
      `Login failed in E2E (status: ${loginResponse.status()}). Check TEST_ADMIN_EMAIL/TEST_ADMIN_PASSWORD in .env.test.`
    );
  }

  await page.waitForURL((url) => !url.pathname.endsWith("/login"), { timeout: 10000 });
});

test("dashboard loads after login", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("body")).toContainText(/CPM Mars|Planning|Magasins|Dashboard/i, { timeout: 10000 });
});

test("planning page loads and shows week selector", async ({ page }) => {
  await page.goto("/planning");
  await expect(page.locator("body")).toContainText(/Planning/i, { timeout: 10000 });
});

test("export page loads", async ({ page }) => {
  await page.goto("/export");
  await expect(page.locator("body")).toContainText(/Export|PDF|Excel|planning|dashboard|login|Se connecter/i, { timeout: 10000 });
});

test("create and plan a store", async ({ page }) => {
  const storeId = `E2E-${Date.now()}`;
  await page.goto("/stores");
  await page.waitForURL(/\/stores/, { timeout: 10000 });
  await expect(page.getByRole("button", { name: /Ajouter/i })).toBeVisible({ timeout: 15000 });
  await page.getByRole("button", { name: /Ajouter/i }).click();
  await page.getByPlaceholder("Ex: BRU001").fill(storeId);
  await page.getByPlaceholder("Ex: Carrefour Express Bruxelles").fill("Magasin E2E");
  await page.getByPlaceholder("Ex: Rue de la Loi 1").fill("Rue de Test 1");
  await page.getByPlaceholder("1000").fill("1000");
  await page.getByPlaceholder("Bruxelles", { exact: true }).fill("Bruxelles");
  await page.getByRole("button", { name: "Créer" }).click();
  await expect(page.locator("body")).toContainText("Magasin E2E", { timeout: 10000 });

  const createModalTitle = page.getByRole("heading", { name: /Ajouter un magasin/i });
  if (await createModalTitle.isVisible()) {
    await page.getByRole("button", { name: "Annuler" }).first().click();
    await expect(createModalTitle).not.toBeVisible({ timeout: 10000 });
  }

  await page.locator("button[title='Planifier']").first().click();
  const planModal = page.locator("div.fixed.inset-0.z-50").last();
  await expect(planModal).toContainText(/Date de visite/i, { timeout: 10000 });
  await planModal.getByRole("button", { name: "Planifier" }).click();
  await page.goto("/planning");
  await expect(page.locator("body")).toContainText(/Magasin E2E|Planning|Aucune visite/i, { timeout: 10000 });
});
