import { chromium } from '@playwright/test';
import fs from 'node:fs';

/**
 * Prova de que só o design mudou.
 *
 * Extrai o texto visível de cada rota no build novo e na produção atual (que
 * ainda serve o design antigo) e compara. O resultado esperado é vazio.
 *
 * Normaliza espaços e ignora o texto que o SplitText fragmenta, lendo o
 * textContent do elemento e não dos wrappers de linha.
 */
const LOCAL = 'http://127.0.0.1:3000';
const PROD = 'https://agoramoz.vercel.app';
const ROUTES = ['/', '/mz', '/mz/energia-mineracao', '/solucoes/automacao-de-processos',
                '/solucoes/agentes-ia', '/diagnostico', '/sobre', '/contactos',
                '/como-trabalhamos', '/solucoes'];

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});

async function textOf(base, route) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  try {
    await page.goto(base + route, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(700);
    const t = await page.evaluate(() => {
      const main = document.body;
      // Remover o que é decorativo e não existe nos dois designs.
      main.querySelectorAll('[aria-hidden="true"], script, style, svg').forEach((n) => n.remove());
      return (main.innerText || '')
        .split('\n')
        .map((l) => l.replace(/\s+/g, ' ').trim())
        .filter(Boolean);
    });
    return t;
  } catch (e) {
    return [`__ERRO__ ${String(e).slice(0, 80)}`];
  } finally {
    await ctx.close();
  }
}

const report = [];
let totalDiff = 0;

for (const r of ROUTES) {
  const [a, b] = await Promise.all([textOf(PROD, r), textOf(LOCAL, r)]);
  const setA = new Set(a);
  const setB = new Set(b);
  const removed = a.filter((l) => !setB.has(l));
  const added = b.filter((l) => !setA.has(l));
  totalDiff += removed.length + added.length;
  report.push({ route: r, prodLines: a.length, localLines: b.length, removed, added });
}

await browser.close();
fs.writeFileSync('.qa/copy-diff.json', JSON.stringify(report, null, 2));

for (const r of report) {
  const status = r.removed.length + r.added.length === 0 ? 'IDÊNTICO' : 'DIFERE';
  console.log(`${status.padEnd(9)} ${r.route.padEnd(36)} prod=${r.prodLines} novo=${r.localLines}`);
  for (const l of r.removed.slice(0, 6)) console.log(`   − ${l.slice(0, 110)}`);
  for (const l of r.added.slice(0, 6)) console.log(`   + ${l.slice(0, 110)}`);
}
console.log(totalDiff === 0 ? '\nCopy idêntico em todas as rotas.' : `\n${totalDiff} linhas de diferença — rever acima.`);
