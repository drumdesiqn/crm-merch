import { chromium } from "playwright";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto("file://" + path.join(__dirname, "presentation-v2.html"));
await page.pdf({
  path: path.join(__dirname, "MERCH-presentation.pdf"),
  format: "A4",
  printBackground: true,
  margin: { top: 0, bottom: 0, left: 0, right: 0 },
});
// Screenshots for visual check
const shotPage = await browser.newPage({ viewport: { width: 794, height: 1122 } });
await shotPage.goto("file://" + path.join(__dirname, "presentation-v2.html"));
const pages = await shotPage.locator(".page").count();
for (let i = 0; i < pages; i++) {
  await shotPage.locator(".page").nth(i).screenshot({ path: path.join(__dirname, "page" + (i + 1) + ".png") });
}

await browser.close();
console.log("PDF written:", path.join(__dirname, "MERCH-presentation.pdf"));
