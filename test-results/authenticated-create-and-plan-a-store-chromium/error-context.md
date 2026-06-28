# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: authenticated.spec.ts >> create and plan a store
- Location: e2e\authenticated.spec.ts:30:5

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: 'Ajouter magasin' })

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - link "Aller au contenu principal" [ref=e2] [cursor=pointer]:
    - /url: "#main-content"
  - button "Assistant IA" [ref=e3]:
    - img [ref=e4]
  - banner [ref=e6]:
    - link "CPM Mars" [ref=e7] [cursor=pointer]:
      - /url: /
      - img "CPM Mars" [ref=e8]
    - link "Dashboard" [ref=e9] [cursor=pointer]:
      - /url: /
      - img [ref=e10]
      - text: Dashboard
    - link "Planning" [ref=e15] [cursor=pointer]:
      - /url: /planning
      - img [ref=e16]
      - text: Planning
    - link "Magasins" [ref=e18] [cursor=pointer]:
      - /url: /stores
      - img [ref=e19]
      - text: Magasins
    - link "Contacts" [ref=e23] [cursor=pointer]:
      - /url: /contacts
      - img [ref=e24]
      - text: Contacts
    - link "Mails" [ref=e29] [cursor=pointer]:
      - /url: /mails
      - img [ref=e30]
      - text: Mails
    - link "Analytics" [ref=e33] [cursor=pointer]:
      - /url: /analytics
      - img [ref=e34]
      - text: Analytics
    - link "Guide" [ref=e36] [cursor=pointer]:
      - /url: /guide
      - img [ref=e37]
      - text: Guide
    - link "Réglages" [ref=e39] [cursor=pointer]:
      - /url: /settings
      - img [ref=e40]
      - text: Réglages
    - button "Passer en mode sombre" [ref=e44]:
      - img [ref=e45]
  - main [ref=e47]:
    - generic [ref=e49]:
      - generic [ref=e50]:
        - img [ref=e52]
        - heading "CPM Mars" [level=3] [ref=e55]
        - paragraph [ref=e56]: Connectez-vous pour accéder à votre planning
      - generic [ref=e58]:
        - generic [ref=e59]:
          - generic [ref=e60]: Email
          - textbox "Email" [ref=e61]:
            - /placeholder: votre@email.com
        - generic [ref=e62]:
          - generic [ref=e63]: Mot de passe
          - textbox "Mot de passe" [ref=e64]:
            - /placeholder: ••••••••
        - button "Se connecter" [ref=e65]
  - generic [ref=e70] [cursor=pointer]:
    - button "Open Next.js Dev Tools" [ref=e71]:
      - img [ref=e72]
    - generic [ref=e75]:
      - button "Open issues overlay" [ref=e76]:
        - generic [ref=e77]:
          - generic [ref=e78]: "0"
          - generic [ref=e79]: "1"
        - generic [ref=e80]: Issue
      - button "Collapse issues badge" [ref=e81]:
        - img [ref=e82]
  - alert [ref=e84]
```

# Test source

```ts
  1  | import { test, expect } from "@playwright/test";
  2  | 
  3  | const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL || "admin@marsmerch.com";
  4  | const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD || "change-me-in-production";
  5  | 
  6  | test.beforeEach(async ({ page }) => {
  7  |   await page.goto("/login");
  8  |   await page.waitForSelector("input#email", { timeout: 10000 });
  9  |   await page.locator("input#email").fill(ADMIN_EMAIL);
  10 |   await page.locator("input#password").fill(ADMIN_PASSWORD);
  11 |   await page.getByRole("button", { name: /se connecter/i }).click();
  12 |   await page.waitForURL(/\/(planning|dashboard|)/, { timeout: 10000 });
  13 | });
  14 | 
  15 | test("dashboard loads after login", async ({ page }) => {
  16 |   await page.goto("/");
  17 |   await expect(page.locator("body")).toContainText(/CPM Mars|Planning|Magasins|Dashboard/i, { timeout: 10000 });
  18 | });
  19 | 
  20 | test("planning page loads and shows week selector", async ({ page }) => {
  21 |   await page.goto("/planning");
  22 |   await expect(page.locator("body")).toContainText(/Planning/i, { timeout: 10000 });
  23 | });
  24 | 
  25 | test("export page loads", async ({ page }) => {
  26 |   await page.goto("/export");
  27 |   await expect(page.locator("body")).toContainText(/Export|PDF|Excel|planning|dashboard|login|Se connecter/i, { timeout: 10000 });
  28 | });
  29 | 
  30 | test("create and plan a store", async ({ page }) => {
  31 |   await page.goto("/stores");
> 32 |   await page.getByRole("button", { name: "Ajouter magasin" }).click();
     |                                                               ^ Error: locator.click: Test timeout of 30000ms exceeded.
  33 |   await page.getByLabel("ID magasin").fill("E2E-TEST-001");
  34 |   await page.getByLabel("Nom").fill("Magasin E2E");
  35 |   await page.getByLabel("Adresse").fill("Rue de Test 1");
  36 |   await page.getByLabel("Code postal").fill("1000");
  37 |   await page.getByLabel("Ville").fill("Bruxelles");
  38 |   await page.getByRole("button", { name: "Créer" }).click();
  39 |   await expect(page.locator("body")).toContainText("Magasin E2E", { timeout: 10000 });
  40 | 
  41 |   await page.getByRole("button", { name: "Planifier" }).first().click();
  42 |   const dateInput = page.locator("input[type='date']").first();
  43 |   await dateInput.fill(new Date().toISOString().split("T")[0]);
  44 |   await page.getByRole("button", { name: "Planifier" }).nth(1).click();
  45 |   await page.goto("/planning");
  46 |   await expect(page.locator("body")).toContainText(/Magasin E2E|Planning|Aucune visite/i, { timeout: 10000 });
  47 | });
  48 | 
```