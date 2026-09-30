import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * QA do painel de comando, contra `pnpm start` com `ADMIN_PREVIEW=on`.
 *
 *   ADMIN_PREVIEW=on pnpm start -p 3100
 *   BASE=http://127.0.0.1:3100 node .qa/painel.mjs
 *
 * Visita /qa/painel (números de exemplo, sem sessão nem base). Mede: axe,
 * scroll horizontal, gráfico por teclado, estados «por activar» e «erro».
 */
const BASE = process.env.BASE ?? 'http://127.0.0.1:3000';
const SAIDA = process.env.SAIDA ?? '.qa';
const b = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--no-sandbox'],
});
let falhas = 0;
const falha = (msg) => {
  console.log(`  ✗ ${msg}`);
  falhas++;
};
const ok = (msg) => console.log(`  ✓ ${msg}`);

async function axe(p, rotulo) {
  const r = await new AxeBuilder({ page: p }).analyze();
  const graves = r.violations.filter((v) => ['serious', 'critical'].includes(v.impact));
  if (graves.length) {
    falha(`${rotulo}: axe ${graves.map((v) => `${v.id} (${v.nodes.length})`).join(', ')}`);
    for (const v of graves) for (const n of v.nodes.slice(0, 3)) console.log(`      ${v.id}: ${n.target.join(' ')}`);
  } else ok(`${rotulo}: axe sem violações graves`);
}

for (const largura of [390, 768, 1440]) {
  console.log(`\n${largura} px`);
  const ctx = await b.newContext({ viewport: { width: largura, height: 900 }, reducedMotion: 'reduce', hasTouch: largura < 1024 });
  const p = await ctx.newPage();
  const erros = [];
  p.on('pageerror', (e) => erros.push(e.message));
  // Esperados localmente: o aviso da CSP report-only e os pré-carregamentos de
  // /admin, que respondem 404 porque ADMIN está desligado nesta instância.
  p.on('console', (m) => {
    if (m.type() !== 'error') return;
    if (/report-only/.test(m.text())) return;
    if (/\/admin[?/]|\/admin$/.test(m.location().url ?? '')) return;
    erros.push(`${m.text()} ${m.location().url ?? ''}`);
  });

  const r = await p.goto(`${BASE}/qa/painel?periodo=30`, { waitUntil: 'load' });
  await p.waitForTimeout(800);
  r?.status() === 200 ? ok('responde 200') : falha(`estado ${r?.status()}`);

  const larguraDoc = await p.evaluate(() => document.documentElement.scrollWidth);
  larguraDoc <= largura ? ok('sem scroll horizontal') : falha(`scroll horizontal: ${larguraDoc} > ${largura}`);

  const titulos = await p.locator('main h2').allTextContents();
  const esperados = ['Leads por dia', 'CRM por fase', 'Funil de aquisição', 'Canais de aquisição', 'Onde desistem', 'Moz News por prioridade', 'Últimas submissões', 'Próximas reuniões', 'ERP'];
  const emFalta = esperados.filter((t) => !titulos.includes(t));
  emFalta.length ? falha(`blocos em falta: ${emFalta.join(', ')}`) : ok(`${esperados.length} blocos presentes`);

  const indicadores = await p.locator('[aria-label="Indicadores do período"] > li').count();
  indicadores === 5 ? ok('5 indicadores') : falha(`${indicadores} indicadores`);

  if (largura === 1440) {
    const ys = await p.locator('[aria-label="Indicadores do período"] > li p:first-of-type').evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().top)));
    new Set(ys).size === 1 ? ok('os 5 números alinhados') : falha(`números desalinhados: ${ys.join(', ')}`);
  }

  const activo = await p.locator('nav[aria-label="Período"] [aria-current="page"]').textContent();
  activo?.includes('30') ? ok('período 30 marcado') : falha(`período activo: ${activo}`);

  // Gráfico: teclado move a cruz e anuncia o dia.
  const grafico = p.locator('[role="group"][aria-label^="Leads por dia"]');
  await grafico.focus();
  await p.keyboard.press('End');
  const anuncio = await p.locator('p[aria-live="polite"]').textContent();
  /leads/.test(anuncio ?? '') ? ok(`teclado anuncia: «${anuncio}»`) : falha(`sem anúncio: «${anuncio}»`);
  await p.keyboard.press('Home');
  const primeiro = await p.locator('p[aria-live="polite"]').textContent();
  primeiro !== anuncio ? ok('Home muda para o primeiro dia') : falha('Home não mudou o dia');
  const dica = await p.locator('[data-dica]').count();
  dica > 0 ? ok('dica visível com foco') : falha('dica não aparece');
  await p.keyboard.press('Escape');
  (await p.locator('[data-dica]').count()) === 0 ? ok('Escape fecha a dica') : falha('Escape não fecha a dica');

  if (largura < 1024) {
    // Toque: mostra a dica; nos dois extremos a dica fica dentro do ecrã.
    const c = await grafico.boundingBox();
    for (const f of [0.05, 0.55, 0.95]) {
      await p.touchscreen.tap(c.x + c.width * f, c.y + c.height / 2);
      const caixa = await p.locator('[data-dica]').boundingBox();
      if (!caixa) falha(`toque a ${f * 100}%: sem dica`);
      else if (caixa.x < 0 || caixa.x + caixa.width > largura) falha(`toque a ${f * 100}%: dica fora do ecrã (${Math.round(caixa.x)}–${Math.round(caixa.x + caixa.width)})`);
      else ok(`toque a ${f * 100}%: dica dentro do ecrã`);
    }
    await p.keyboard.press('Escape');
  }

  // A tabela do gráfico abre e tem 30 linhas.
  await p.getByText('Ver em tabela').click();
  const linhas = await p.locator('table:has(caption:text("Leads por dia")) tbody tr').count();
  linhas === 30 ? ok('tabela do gráfico com 30 dias') : falha(`tabela com ${linhas} linhas`);

  await axe(p, 'painel com dados');
  await p.screenshot({ path: `${SAIDA}/painel-${largura}.png`, fullPage: true });

  if (largura === 1440) {
    // Rato: a cruz segue o ponteiro.
    await p.mouse.move(0, 0);
    const caixa = await grafico.boundingBox();
    if (caixa) {
      await p.mouse.move(caixa.x + caixa.width * 0.5, caixa.y + caixa.height * 0.5);
      const vivo = await p.locator('p[aria-live="polite"]').textContent();
      (await p.locator('[data-dica]').count()) === 1 ? ok('rato mostra a dica') : falha('rato não mostra dica');
      !vivo ? ok('rato não alimenta o aria-live') : falha(`rato anunciou: «${vivo}»`);
      await p.screenshot({ path: `${SAIDA}/painel-dica.png`, clip: { x: caixa.x - 60, y: caixa.y - 80, width: caixa.width + 80, height: caixa.height + 140 } });
    }

    await p.goto(`${BASE}/qa/painel?periodo=7`, { waitUntil: 'load' });
    await p.getByText('Ver em tabela').click();
    const sete = await p.locator('table:has(caption:text("Leads por dia")) tbody tr').count();
    sete === 7 ? ok('período 7: 7 dias') : falha(`período 7: ${sete} linhas`);

    await p.goto(`${BASE}/qa/painel?variante=por-activar`, { waitUntil: 'load' });
    const porActivar = await p.getByText('Por activar.').count();
    porActivar >= 3 ? ok(`«por activar»: ${porActivar} blocos com o passo`) : falha(`«por activar»: ${porActivar}`);
    await axe(p, 'variante por activar');
    await p.screenshot({ path: `${SAIDA}/painel-por-activar.png`, fullPage: true });

    await p.goto(`${BASE}/qa/painel?variante=erro`, { waitUntil: 'load' });
    const erro = await p.getByText('Não foi possível ler esta fonte agora.').count();
    erro === 3 ? ok('«erro»: 3 blocos sem número') : falha(`«erro»: ${erro}`);
    await axe(p, 'variante erro');
  }

  erros.length ? falha(`erros na consola: ${erros.slice(0, 3).join(' | ')}`) : ok('sem erros na consola');
  await ctx.close();
}

await b.close();
console.log(falhas ? `\n${falhas} falha(s)` : '\ntudo verde');
process.exit(falhas ? 1 : 0);
