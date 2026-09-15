// Prints /story/print to public/pontian-pt.pdf and public/pontian-en.pdf,
// one 1920x1080 page per chapter. Needs a running server.
//   node scripts/export-pdf.mjs [baseUrl] [--png]
// The optional --png flag also writes one PNG per page to /tmp/pontian-pdf/
// so the pages can be eyeballed without opening the PDF.

import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const args = process.argv.slice(2);
const base = args.find((a) => a.startsWith("http")) ?? "http://localhost:3000";
const png = args.includes("--png");

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
const page = await context.newPage();

for (const lang of ["pt", "en"]) {
  await page.goto(`${base}/story/print?lang=${lang}`, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(800);
  await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });

  const buf = await page.pdf({ width: "1920px", height: "1080px", printBackground: true, preferCSSPageSize: true });
  const out = path.resolve("public", `pontian-${lang}.pdf`);
  await writeFile(out, buf);
  console.log(`wrote ${path.relative(process.cwd(), out)} (${(buf.length / 1024).toFixed(0)} KB)`);

  if (png) {
    const dir = `/tmp/pontian-pdf`;
    await mkdir(dir, { recursive: true });
    const pages = await page.locator(".print-page").count();
    for (let i = 0; i < pages; i++) {
      await page.locator(".print-page").nth(i).screenshot({ path: `${dir}/${lang}-${i + 1}.png` });
    }
    console.log(`wrote ${pages} PNGs to ${dir}`);
  }
}

await browser.close();
