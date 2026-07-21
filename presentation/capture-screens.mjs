import { chromium } from "playwright";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "screenshots");
fs.mkdirSync(outDir, { recursive: true });

const BASE = process.env.CAPTURE_BASE || "http://localhost:3000";
const EMAIL = process.env.CAPTURE_EMAIL || "";
const PASSWORD = process.env.CAPTURE_PASSWORD || "";

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
});
const page = await ctx.newPage();

// Login
await page.goto(`${BASE}/login`);
await page.fill("#email", EMAIL);
await page.fill("#password", PASSWORD);
await page.click("button[type=submit]");
await page.waitForURL((url) => !url.pathname.includes("login"), { timeout: 15000 });
console.log("Logged in");

const targets = [
  { url: "/", name: "dashboard", wait: 2500 },
  { url: "/planning", name: "planning", wait: 2500 },
  { url: "/stores", name: "magasins", wait: 2500 },
  { url: "/expenses", name: "notes-de-frais", wait: 2500 },
  { url: "/photos", name: "photos", wait: 3000 },
];

for (const t of targets) {
  await page.goto(`${BASE}${t.url}`);
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(t.wait);
  await page.screenshot({ path: path.join(outDir, `${t.name}.png`) });
  console.log("Captured:", t.name);
}

await browser.close();
console.log("Done. Screenshots in", outDir);
