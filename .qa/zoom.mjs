import { chromium } from '@playwright/test';
const [sel, w, h, out] = process.argv.slice(2);
const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});
const ctx = await browser.newContext({ viewport: { width: +w, height: +h }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
await page.goto('http://127.0.0.1:3000/', { waitUntil: 'networkidle' });
await page.evaluate(async () => {
  const step = Math.round(window.innerHeight * 0.75);
  for (let y = 0; y < document.body.scrollHeight; y += step) {
    window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 90));
  }
});
await page.waitForTimeout(600);
await page.locator(sel).scrollIntoViewIfNeeded();
await page.waitForTimeout(1000);
await page.locator(sel).screenshot({ path: out });
await browser.close();
console.log(out);
