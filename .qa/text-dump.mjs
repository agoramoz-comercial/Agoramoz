import { chromium } from '@playwright/test';
import fs from 'node:fs';

const BASE = process.argv[2];
const OUT = process.argv[3];
const ROUTES = ['/', '/mz', '/pt', '/br', '/mz/energia-mineracao',
                '/solucoes', '/solucoes/automacao-de-processos', '/solucoes/agentes-ia',
                '/solucoes/websites-avancados', '/solucoes/software-empresarial',
                '/solucoes/infraestrutura-digital', '/diagnostico', '/sobre',
                '/contactos', '/como-trabalhamos', '/privacidade'];

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});
const ctx = await browser.newContext({ viewport: { width: 1440, height: 2400 } });
const page = await ctx.newPage();
const dump = {};

for (const r of ROUTES) {
  await page.goto(BASE + r, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(600);

  // Percorrer a página para disparar as revelações: innerText não devolve o
  // texto de elementos com visibility:hidden, e [data-animate] arranca assim.
  await page.evaluate(async () => {
    const step = Math.round(window.innerHeight * 0.75);
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 90));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(900);

  dump[r] = await page.evaluate(() => {
    // Só script/style/svg. NÃO remover [aria-hidden]: é o que o SplitText põe
    // em cada linha dividida, e removê-lo apagaria todos os títulos.
    document.querySelectorAll('script, style, svg').forEach((n) => n.remove());
    // Forçar visível o que ficou por revelar, para não perder texto real.
    document.querySelectorAll('[data-animate]').forEach((n) => {
      n.style.visibility = 'visible';
      n.style.opacity = '1';
    });
    return (document.body.innerText || '')
      .split('\n')
      .map((l) => l.replace(/\s+/g, ' ').trim())
      .filter(Boolean);
  });
}
await browser.close();
fs.writeFileSync(OUT, JSON.stringify(dump, null, 1));
console.log(`${Object.keys(dump).length} rotas, ${Object.values(dump).flat().length} linhas → ${OUT}`);
