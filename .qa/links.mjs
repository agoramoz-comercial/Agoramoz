import { chromium } from '@playwright/test';

const BASE = 'http://127.0.0.1:3000';
// Todas as páginas que geram navegação. Recolhe-se cada href interno e
// verifica-se o estado — é o defeito que originou este trabalho.
const PAGES = ['/', '/solucoes', '/mz', '/pt', '/br', '/mz/energia-mineracao',
               '/solucoes/automacao-de-processos', '/diagnostico', '/sobre',
               '/contactos', '/como-trabalhamos', '/privacidade'];

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

const found = new Map(); // href -> páginas onde aparece
for (const p of PAGES) {
  await page.goto(BASE + p, { waitUntil: 'networkidle' });
  // Abrir os dois mega-menus para apanhar as ligações que só existem abertos.
  for (const label of ['Soluções', 'Setores']) {
    const btn = page.locator(`button:has-text("${label}")`).first();
    if (await btn.count()) { await btn.click().catch(() => {}); await page.waitForTimeout(200); }
  }
  const hrefs = await page.evaluate(() =>
    [...document.querySelectorAll('a[href]')]
      .map((a) => a.getAttribute('href'))
      .filter((h) => h && h.startsWith('/')),
  );
  for (const h of hrefs) {
    const clean = h.split('#')[0] || '/';
    if (!found.has(clean)) found.set(clean, new Set());
    found.get(clean).add(p);
  }
}
await browser.close();

let dead = 0;
const results = [];
for (const [href, pages] of [...found].sort()) {
  const res = await fetch(BASE + href, { redirect: 'manual' });
  results.push({ href, status: res.status, from: [...pages] });
  if (res.status >= 400) dead++;
}
console.log(`${found.size} ligações internas distintas verificadas\n`);
for (const r of results) {
  const mark = r.status >= 400 ? 'MORTA' : '  ok ';
  console.log(`${mark} ${String(r.status).padEnd(4)} ${r.href}${r.status >= 400 ? '   ← em: ' + r.from.join(', ') : ''}`);
}
console.log(dead === 0 ? '\nNenhuma ligação morta.' : `\n${dead} LIGAÇÕES MORTAS`);
process.exit(dead === 0 ? 0 : 1);
