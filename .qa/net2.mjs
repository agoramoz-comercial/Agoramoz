import { chromium } from '@playwright/test';
const ROUTES = ['/', '/mz', '/mz/energia-mineracao', '/solucoes/automacao-de-processos', '/diagnostico', '/sobre', '/contactos'];
const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});
let fails = 0;
for (const r of ROUTES) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  page.on('requestfailed', (req) => { fails++; console.log(r, '→', req.failure()?.errorText, req.url().slice(0, 120)); });
  page.on('console', (m) => { if (m.type() === 'error') console.log(r, '→ console:', m.text().slice(0, 120)); });
  await page.goto('http://127.0.0.1:3000' + r, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await ctx.close();
}
await browser.close();
console.log(fails === 0 ? 'OK — nenhum pedido falhado em nenhuma rota' : `${fails} pedidos falhados`);
