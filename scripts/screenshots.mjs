// Nimmt UI-Screenshots der lokalen App auf (Login, Wizard, Tour, Design-Editor).
// Voraussetzung: dev-Server läuft auf http://localhost:3000, APP_PASSWORD gesetzt.
// Aufruf: node scripts/screenshots.mjs
import { chromium } from "playwright";
import fs from "node:fs";

const BASE = "http://localhost:3000";
const PW = process.env.APP_PASSWORD || "scaling-champions";
const OUT = "docs/screenshots";
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ channel: "chrome" });
const page = await browser.newPage({ viewport: { width: 1280, height: 1024 }, deviceScaleFactor: 2 });

// 1) Login-Seite
await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/app-login.png` });
console.log("✓ app-login.png");

// einloggen
await page.fill("input[type=password]", PW);
await page.click("button[type=submit]");
await page.waitForURL(`${BASE}/`, { timeout: 15000 }).catch(() => {});
await page.waitForTimeout(2000); // Tour erscheint nach ~700ms

// 2) Onboarding-Tour (Welcome-Popover sichtbar)
await page.screenshot({ path: `${OUT}/app-tour.png` });
console.log("✓ app-tour.png");

// Tour schließen
await page.keyboard.press("Escape").catch(() => {});
await page.waitForTimeout(600);

// 3) Wizard-Übersicht (oben)
await page.screenshot({ path: `${OUT}/app-wizard.png` });
console.log("✓ app-wizard.png");

// 4) Design-Schritt mit Live-Vorschau
const design = await page.$("#step-design");
if (design) {
  await design.scrollIntoViewIfNeeded();
  await page.waitForTimeout(3500); // Preview-Debounce + Render abwarten
  await design.screenshot({ path: `${OUT}/app-design.png` });
  console.log("✓ app-design.png");
}

await browser.close();
console.log("fertig.");
