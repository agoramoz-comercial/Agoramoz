import { chromium } from '@playwright/test';
const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
await page.goto('http://127.0.0.1:3000/', { waitUntil: 'domcontentloaded' });

const snap = () =>
  page.evaluate(() =>
    [...document.body.children].map((n) => {
      const r = n.getBoundingClientRect();
      const st = getComputedStyle(n);
      return `${n.tagName}.${(n.className || '').toString().slice(0, 34)} pos=${st.position} y=${Math.round(r.y)} h=${Math.round(r.height)}`;
    }),
  );

const before = await snap();
await page.waitForTimeout(2500);
const after = await snap();

console.log('ANTES DA HIDRATAÇÃO');
before.forEach((l) => console.log('  ' + l));
console.log('\nDEPOIS');
after.forEach((l) => console.log('  ' + l));
await browser.close();
