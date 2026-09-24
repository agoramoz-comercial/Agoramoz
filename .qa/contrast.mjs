import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
page.on('response', (r) => { if (r.status() === 404) console.log('404 →', r.url()); });
await page.goto('http://127.0.0.1:3000/solucoes/automacao-de-processos', { waitUntil: 'networkidle' });
const scan = await new AxeBuilder({ page }).withRules(['color-contrast']).analyze();
for (const v of scan.violations) {
  const seen = new Set();
  for (const n of v.nodes) {
    const m = n.any[0]?.data;
    const key = `${m?.fgColor}|${m?.bgColor}|${m?.fontSize}`;
    if (seen.has(key)) continue;
    seen.add(key);
    console.log(`fg=${m?.fgColor} bg=${m?.bgColor} ratio=${m?.contrastRatio} needed=${m?.expectedContrastRatio} size=${m?.fontSize} | ${n.html.slice(0, 90)}`);
  }
}
await browser.close();
