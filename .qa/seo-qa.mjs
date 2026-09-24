import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const BASE = process.env.BASE ?? 'http://127.0.0.1:3124';
const PAGINAS = ['/', '/perfil', '/diagnostico', '/solucoes/agentes-ia', '/mz', '/sobre'];

const falhas = [];
const ok = (cond, msg) => { console.log(`  ${cond ? '✓' : '✗'} ${msg}`); if (!cond) falhas.push(msg); };

const navegador = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });

/* ---------------------------------------------- 1. sem JavaScript ---------- */
console.log('\n=== Sem JavaScript ===');
const semJs = await navegador.newContext({ javaScriptEnabled: false });
for (const rota of PAGINAS) {
  const p = await semJs.newPage();
  const res = await p.goto(BASE + rota, { waitUntil: 'domcontentloaded' });
  const h1 = (await p.locator('h1').first().textContent().catch(() => null))?.trim() ?? '';
  const visivel = await p.locator('h1').first().isVisible().catch(() => false);
  const trilho = rota === '/' ? true : (await p.locator('nav[aria-label="Trilho"]').count()) > 0;
  console.log(` ${rota}`);
  ok(res?.status() === 200, `  200`);
  ok(h1.length > 0, `  h1 presente: "${h1.slice(0, 48)}"`);
  ok(visivel, `  h1 visível sem JS`);
  ok(trilho, `  trilho presente`);
  await p.close();
}
await semJs.close();

/* ------------------------------------------- 2. acessibilidade (axe) ------- */
console.log('\n=== Acessibilidade (axe, wcag2a+wcag2aa) ===');
const ctx = await navegador.newContext();
for (const rota of ['/perfil', '/diagnostico', '/']) {
  const p = await ctx.newPage();
  await p.goto(BASE + rota, { waitUntil: 'networkidle' });
  const r = await new AxeBuilder({ page: p }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  const graves = r.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious');
  console.log(` ${rota}`);
  ok(graves.length === 0, `  sem violações críticas/sérias (${r.violations.length} no total)`);
  for (const v of graves) console.log(`     ! ${v.impact} ${v.id}: ${v.help} (${v.nodes.length})`);
  for (const v of r.violations.filter((x) => !graves.includes(x))) console.log(`     · ${v.impact} ${v.id}`);
  await p.close();
}

/* ------------------------------------------------- 3. móvel, 390px --------- */
console.log('\n=== Móvel (390×844) ===');
const movel = await navegador.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
for (const rota of PAGINAS) {
  const p = await movel.newPage();
  await p.goto(BASE + rota, { waitUntil: 'networkidle' });
  const overflow = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  console.log(` ${rota}`);
  ok(overflow <= 1, `  sem scroll horizontal (excesso: ${overflow}px)`);
  await p.close();
}
await movel.close();

/* --------------------------------------------------- 4. alvos táteis ------- */
/**
 * Dois limiares, porque são duas normas diferentes:
 *   · WCAG 2.2 AA (2.5.8) exige 24×24 — é o que o site tem de cumprir.
 *   · WCAG 2.1 AAA (2.5.5) e os guias de iOS/Android pedem 44×44 — é o
 *     confortável.
 * Falhar só no primeiro. Reportar o segundo, sem chamar-lhe defeito.
 *
 * A ligação «Saltar para o conteúdo» está fora: é invisível até receber foco
 * de teclado e nunca é um alvo de toque. Contá-la fazia a ferramenta gritar
 * por um problema que não existe, que é a forma mais rápida de alguém deixar
 * de olhar para o resultado.
 */
console.log('\n=== Alvos táteis em /perfil ===');
const p = await movel_ctx();
async function movel_ctx() {
  const c = await navegador.newContext({ viewport: { width: 390, height: 844 } });
  return c.newPage();
}
await p.goto(BASE + '/perfil', { waitUntil: 'networkidle' });
const alvos = await p.evaluate(() =>
  [...document.querySelectorAll('a[href], button')]
    .filter((e) => !/saltar para o conte/i.test(e.textContent ?? ''))
    .map((e) => {
      const r = e.getBoundingClientRect();
      return { t: (e.textContent ?? '').trim().slice(0, 32), h: Math.round(r.height), w: Math.round(r.width) };
    })
    .filter((x) => x.h > 0),
);
const abaixoAA = alvos.filter((x) => x.h < 24 || x.w < 24);
const abaixoAAA = alvos.filter((x) => (x.h < 44 || x.w < 44) && !abaixoAA.includes(x));

ok(abaixoAA.length === 0, `  WCAG 2.2 AA (24×24): ${abaixoAA.length} abaixo`);
for (const x of abaixoAA) console.log(`     ! ${x.w}×${x.h} "${x.t}"`);
console.log(`  · WCAG AAA (44×44): ${abaixoAAA.length} abaixo — nota, não defeito`);
for (const x of abaixoAAA.slice(0, 6)) console.log(`     · ${x.w}×${x.h} "${x.t}"`);

await navegador.close();

console.log(`\n${falhas.length === 0 ? 'TUDO PASSA' : `${falhas.length} FALHAS`}`);
process.exit(falhas.length === 0 ? 0 : 1);
