import { chromium } from '@playwright/test';
const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
await page.goto('http://127.0.0.1:3000/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);

const report = async (label) => {
  const r = await page.evaluate(() => {
    const els = [...document.querySelectorAll('[data-animate]')];
    const hidden = els.filter((el) => {
      const s = getComputedStyle(el);
      return s.visibility === 'hidden' || Number(s.opacity) < 0.05;
    });
    return {
      total: els.length,
      hidden: hidden.length,
      sample: hidden.slice(0, 4).map((el) => (el.className || el.tagName).toString().slice(0, 60)),
    };
  });
  console.log(label, JSON.stringify(r));
};

await report('ao carregar (topo):   ');
// Scroll progressivo como um utilizador real
const h = await page.evaluate(() => document.body.scrollHeight);
for (let y = 0; y < h; y += 700) {
  await page.evaluate((v) => window.scrollTo(0, v), y);
  await page.waitForTimeout(160);
}
await page.waitForTimeout(1200);
await report('após scroll completo: ');

// O seletor do hero está visível?
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(600);
const sel = await page.evaluate(() => {
  const el = document.querySelector('[role="radiogroup"]');
  if (!el) return 'NÃO ENCONTRADO';
  const box = el.getBoundingClientRect();
  const s = getComputedStyle(el.closest('[data-animate]') ?? el);
  return { visible: s.visibility, opacity: s.opacity, w: Math.round(box.width), h: Math.round(box.height) };
});
console.log('seletor do hero:      ', JSON.stringify(sel));
await browser.close();
