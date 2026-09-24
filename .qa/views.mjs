import { chromium } from '@playwright/test';
const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();

async function shot(name, path, scrollTo) {
  await page.goto('http://127.0.0.1:3000' + path, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  if (scrollTo) {
    await page.evaluate((s) => document.querySelector(s)?.scrollIntoView({ block: 'start' }), scrollTo);
    await page.waitForTimeout(1400);
  }
  await page.screenshot({ path: `.qa/view-${name}.png` });
}

await shot('hero', '/');
await shot('problemas', '/', '#problemas');
await shot('fluxo', '/', '#solucoes');
await shot('setores', '/', '#setores');
await shot('oferta', '/', '#diagnostico');
await shot('setor-hero', '/mz/energia-mineracao');
await shot('form', '/diagnostico');
await browser.close();
