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

test("mail apply keeps ambiguous modification unapplied", async ({ page }) => {
  await page.route("**/api/maillogs", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([]),
    });
  });

  await page.route("**/api/mail/analyze", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        mailLogId: "mail-log-e2e",
        summary: "Demande ambiguë sur Carrefour",
        replyDraft: "Merci, je vérifie avant application.",
        modifications: [
          {
            id: "mod-ambiguous-1",
            action: "modify",
            target: "Carrefour",
            field: "remarks",
            oldValue: "",
            newValue: "Passage demandé",
            description: "Mettre à jour la remarque",
            applied: false,
          },
        ],
      }),
    });
  });

  let applyPayload: unknown = null;
  await page.route("**/api/mail/apply", async (route) => {
    applyPayload = route.request().postDataJSON();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        results: [
          {
            id: "mod-ambiguous-1",
            success: false,
            error: "Modification ambiguë: plusieurs visites correspondent. Spécifie une visite unique.",
          },
        ],
      }),
    });
  });

  await page.goto("/mails");
  await page.locator("textarea").first().fill("Merci de déplacer Carrefour.");
  await page.getByRole("button", { name: /Analyser avec l'IA/i }).click();

  await expect(page.getByText("Actions détectées (1)")).toBeVisible();
  await page.getByRole("button", { name: /Appliquer 1 modification\(s\) sélectionnée\(s\)/i }).click();

  await expect.poll(() => applyPayload).toEqual({ modificationIds: ["mod-ambiguous-1"] });
  await expect(page.getByRole("button", { name: /Toutes les modifications appliquées/i })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Appliquer 1 modification\(s\) sélectionnée\(s\)/i })).toBeVisible();
});
