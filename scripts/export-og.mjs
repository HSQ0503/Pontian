// Screenshots the homepage at 1200x630 into public/og.png for link previews.
//   node scripts/export-og.mjs [baseUrl]
// Needs a running server. Re-run after the Shouqi Serif files land so the
// preview carries the real wordmark.

import { chromium } from "playwright";
import path from "node:path";

const base = process.argv[2] ?? "http://localhost:3000";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
await page.goto(`${base}/?lang=en`, { waitUntil: "networkidle" });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(2600);
await page.addStyleTag({ content: "header, footer, nextjs-portal { display: none !important; }" });
const out = path.resolve("public", "og.png");
await page.screenshot({ path: out });
console.log(`wrote ${path.relative(process.cwd(), out)}`);
await browser.close();
