import { test, expect } from "@playwright/test";

const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL || "admin@marsmerch.com";
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD || "change-me-in-production";

test.beforeEach(async ({ page }) => {
  await page.goto("/login");
  await page.waitForSelector("input#email", { timeout: 10000 });
  await page.locator("input#email").fill(ADMIN_EMAIL);
  await page.locator("input#password").fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: /se connecter/i }).click();
  await page.waitForURL(/\/(planning|dashboard|)/, { timeout: 10000 });
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
  await page.goto("/stores");
  await page.waitForSelector("button[aria-label='Ajouter magasin']", { timeout: 10000 });
  await page.click("button[aria-label='Ajouter magasin']");
  await page.getByLabel("ID magasin").fill("E2E-TEST-001");
  await page.getByLabel("Nom").fill("Magasin E2E");
  await page.getByLabel("Adresse").fill("Rue de Test 1");
  await page.getByLabel("Code postal").fill("1000");
  await page.getByLabel("Ville").fill("Bruxelles");
  await page.getByRole("button", { name: "Créer" }).click();
  await expect(page.locator("body")).toContainText("Magasin E2E", { timeout: 10000 });

  await page.getByRole("button", { name: "Planifier" }).first().click();
  const dateInput = page.locator("input[type='date']").first();
  await dateInput.fill(new Date().toISOString().split("T")[0]);
  await page.getByRole("button", { name: "Planifier" }).nth(1).click();
  await page.goto("/planning");
  await expect(page.locator("body")).toContainText(/Magasin E2E|Planning|Aucune visite/i, { timeout: 10000 });
});
