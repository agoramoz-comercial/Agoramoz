/**
 * QA do curso «IA para Transporte e Logística em Moçambique» (publicado do
 * repositório): página pública, documento A4 e PDF.
 * node .qa/curso-ia.mjs http://127.0.0.1:3111 [pasta-das-capturas]
 */
import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const BASE = process.argv[2] ?? 'http://127.0.0.1:3111';
const SAIDA = process.argv[3];
const SLUG = 'ia-transporte-logistica-mocambique';
let falhas = 0;
const ok = (c, m) => {
  console.log(`${c ? 'ok  ' : 'FALHA'} ${m}`);
  if (!c) falhas += 1;
};
const graves = (r) => r.violations.filter((v) => ['serious', 'critical'].includes(v.impact));
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 } });
const p = await ctx.newPage();
const erros = [];
p.on('console', (m) => m.type() === 'error' && !/upgrade-insecure|status of 404/.test(m.text()) && erros.push(m.text()));

await p.goto(`${BASE}/cursos`);
ok(/IA para Transporte e Logística em Moçambique/.test(await p.locator('main').innerText()), 'índice: o curso aparece em /cursos');

await p.goto(`${BASE}/cursos/${SLUG}`);
const t = await p.locator('main').innerText();
ok(/O que vai\s+aprender/i.test(t) && /13 exercícios práticos/i.test(t), 'página: resultados e 13 exercícios práticos');
ok(/Camiões por dia nos corredores/i.test(t), 'página: gráfico com dados reais');
ok(/Original em inglês; passagens traduzidas/.test(t), 'página: fontes com nota de tradução');
ok((await p.locator('a[href^="https://www.portmaputo.com"]').count()) === 1, 'página: ligação à fonte do MPDC');
ok((await p.locator('h1').count()) === 1, 'página: um h1');
const ld = await p.locator('script[type="application/ld+json"]').allInnerTexts();
ok(
  ld.some((x) => x.includes('"@type":"Course"')),
  'página: dados estruturados Course',
);
const axe = await new AxeBuilder({ page: p }).analyze();
ok(
  graves(axe).length === 0,
  `axe página ${graves(axe)
    .map((v) => `${v.id}(${v.nodes.length})`)
    .join(',')}`,
);
if (SAIDA) await p.screenshot({ path: `${SAIDA}/curso-ia-pagina.png`, fullPage: true });
await p.setViewportSize({ width: 390, height: 844 });
const larg = await p.evaluate(() => document.documentElement.scrollWidth);
ok(larg <= 390, `página: sem scroll horizontal no telemóvel (${larg})`);
if (SAIDA) await p.screenshot({ path: `${SAIDA}/curso-ia-telemovel.png`, fullPage: false });
await p.setViewportSize({ width: 1440, height: 1000 });

await p.goto(`${BASE}/cursos/${SLUG}/documento`);
const d = await p.locator('[data-curso-documento]').innerText();
for (const s of [
  'Prática',
  'Dados de treino',
  'Soluções da prática',
  'Esquema',
  'Camiões por dia nos corredores',
  'comercial@agoramoz.com',
])
  ok(d.toLowerCase().includes(s.toLowerCase()), `documento: ${s}`);
const transborda = await p.evaluate(() =>
  [...document.querySelectorAll('[data-curso-documento] > section')]
    .filter((s) => s.className.includes('cheia'))
    .filter((s) => {
      const fundo = s.getBoundingClientRect().bottom;
      return [...s.querySelectorAll('*')].some((e) => !e.closest('[aria-hidden="true"]') && e.getBoundingClientRect().bottom > fundo + 1);
    })
    .map((s) => s.getAttribute('aria-label')),
);
ok(transborda.length === 0, `documento: folhas cheias sem transbordar ${transborda.join(', ')}`);
const axe2 = await new AxeBuilder({ page: p }).analyze();
ok(
  graves(axe2).length === 0,
  `axe documento ${graves(axe2)
    .map((v) => `${v.id}(${v.nodes.length})`)
    .join(',')}`,
);
if (SAIDA) {
  await p.emulateMedia({ media: 'print' });
  await p.pdf({ path: `${SAIDA}/curso-ia-transporte-logistica.pdf`, preferCSSPageSize: true, printBackground: true });
}
ok(erros.length === 0, `sem erros na consola ${erros.join(' | ')}`);
await b.close();
console.log(falhas ? `\n${falhas} falha(s).` : '\nTudo certo.');
process.exit(falhas ? 1 : 0);
