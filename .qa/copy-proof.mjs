import { chromium } from '@playwright/test';
import fs from 'node:fs';

/**
 * Prova de que só o design mudou.
 *
 * Compara MULTICONJUNTOS DE PALAVRAS por rota, não linhas. Onde as linhas
 * quebram é exatamente o que um redesign muda: comparar linha a linha dá
 * falsos positivos em massa e esconde as perdas reais no meio deles.
 *
 * Três armadilhas já apanhadas neste projeto, e como são evitadas aqui:
 *   1. `cloneNode(true)` devolve um nó destacado, sem layout — `innerText`
 *      colapsa. Lê-se o DOM vivo.
 *   2. Remover `[aria-hidden="true"]` apagaria todas as linhas do SplitText.
 *      Mantêm-se.
 *   3. `[data-animate]` por revelar é invisível, e `innerText` ignora o que
 *      está invisível. Força-se a visibilidade antes de ler.
 */
const A = process.env.BASE_A ?? 'http://127.0.0.1:3001';
const B = process.env.BASE_B ?? 'http://127.0.0.1:3000';

const ROUTES = [
  '/', '/mz', '/pt', '/br', '/mz/energia-mineracao',
  '/solucoes', '/solucoes/websites-avancados', '/solucoes/software-empresarial',
  '/solucoes/automacao-de-processos', '/solucoes/agentes-ia',
  '/solucoes/infraestrutura-digital',
  '/diagnostico', '/sobre', '/contactos', '/como-trabalhamos', '/privacidade',
];

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});

async function wordsOf(base, route) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  try {
    await page.goto(base + route, { waitUntil: 'networkidle', timeout: 60000 });
    // Percorrer a página revela tudo o que depende de ScrollTrigger.
    await page.evaluate(async () => {
      const step = window.innerHeight * 0.8;
      for (let y = 0; y < document.body.scrollHeight; y += step) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 90));
      }
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(600);
    const text = await page.evaluate(() => {
      document.querySelectorAll('[data-animate], [data-hero-title]').forEach((n) => {
        n.style.visibility = 'visible';
        n.style.opacity = '1';
      });
      document.querySelectorAll('script, style, noscript').forEach((n) => n.remove());
      return document.body.innerText || '';
    });
    return text
      .toLowerCase()
      .replace(/[‐-―]/g, '-')
      .split(/[^\p{L}\p{N}%+@./-]+/u)
      .map((w) => w.replace(/^[./-]+|[./-]+$/g, ''))
      .filter((w) => w.length > 0);
  } catch (e) {
    return [`__erro__${String(e).slice(0, 60)}`];
  } finally {
    await ctx.close();
  }
}

const bag = (ws) => ws.reduce((m, w) => m.set(w, (m.get(w) ?? 0) + 1), new Map());

const report = [];
let lost = 0;
let gained = 0;

for (const r of ROUTES) {
  const [wa, wb] = [await wordsOf(A, r), await wordsOf(B, r)];
  const ba = bag(wa);
  const bb = bag(wb);
  const removed = [];
  const added = [];
  for (const [w, n] of ba) {
    const d = n - (bb.get(w) ?? 0);
    if (d > 0) removed.push([w, d]);
  }
  for (const [w, n] of bb) {
    const d = n - (ba.get(w) ?? 0);
    if (d > 0) added.push([w, d]);
  }
  lost += removed.reduce((s, [, n]) => s + n, 0);
  gained += added.reduce((s, [, n]) => s + n, 0);
  report.push({ route: r, a: wa.length, b: wb.length, removed, added });
  const tag = removed.length === 0 && added.length === 0 ? 'IDÊNTICO' : 'DIFERE';
  console.log(`${tag.padEnd(9)} ${r.padEnd(38)} antes=${wa.length} depois=${wb.length}`);
  for (const [w, n] of removed.slice(0, 12)) console.log(`   − ${w} ×${n}`);
  for (const [w, n] of added.slice(0, 12)) console.log(`   + ${w} ×${n}`);
}

await browser.close();
fs.writeFileSync('.qa/copy-proof.json', JSON.stringify(report, null, 2));
console.log(`\nPalavras perdidas: ${lost} · palavras acrescentadas: ${gained}`);
