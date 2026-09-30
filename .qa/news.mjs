import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * QA da secção Moz News contra o motor simulado (`.qa/news-motor-simulado.mjs`).
 * Por largura e idioma: analisa um link, espera pelo relatório, corre axe
 * sobre a página com o relatório, tira capturas, e emula a impressão.
 */
const BASE = process.env.BASE ?? 'http://127.0.0.1:3000';
const SAIDA = process.env.SAIDA ?? '.qa';

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
let falhas = 0;

for (const [rota, rotulo] of [['/news', 'pt'], ['/en/news', 'en']]) {
  for (const [nome, largura] of [['mobile', 390], ['tablet', 768], ['web', 1440]]) {
    const ctx = await b.newContext({ viewport: { width: largura, height: 900 }, reducedMotion: 'reduce' });
    const p = await ctx.newPage();
    const erros = [];
    p.on('pageerror', (e) => erros.push(e.message));
    await p.goto(BASE + rota, { waitUntil: 'networkidle' });

    // Página antes de analisar.
    const larguraDoc = await p.evaluate(() => document.documentElement.scrollWidth);
    if (larguraDoc > largura) {
      console.log(`  ✗ ${rotulo} ${nome}: scroll horizontal (${larguraDoc}px)`);
      falhas++;
    }
    await p.screenshot({ path: `${SAIDA}/news-${rotulo}-${nome}-inicio.png` });

    // Validação do cliente: link privado não chega à rota.
    await p.getByRole('textbox').first().fill('https://127.0.0.1/x');
    await p.locator('form button[type=submit]').click();
    const erroCampo = await p.locator('[aria-invalid=true]').count();
    if (erroCampo !== 1) {
      console.log(`  ✗ ${rotulo} ${nome}: URL privado não marcado como inválido`);
      falhas++;
    }

    await p.getByRole('textbox').first().fill('https://www.exemplo.co.mz/noticia/1');
    await p.locator('form button[type=submit]').click();
    await p.locator('#news-titulo').waitFor({ timeout: 20_000 });
    await p.waitForTimeout(500);

    const foco = await p.evaluate(() => document.activeElement?.id);
    if (foco !== 'news-titulo') {
      console.log(`  ✗ ${rotulo} ${nome}: o foco não foi para o título do relatório (${foco})`);
      falhas++;
    }
    const barras = await p.locator('#news-impacto li').count();
    const metricas = await p.locator('#news-veredicto dl > div').count();
    console.log(`  ${rotulo} ${nome}: barras=${barras} métricas=${metricas} erros-js=${erros.length}`);
    if (barras < 5 || metricas !== 4 || erros.length) falhas++;

    const larguraRel = await p.evaluate(() => document.documentElement.scrollWidth);
    if (larguraRel > largura) {
      console.log(`  ✗ ${rotulo} ${nome}: scroll horizontal com relatório (${larguraRel}px)`);
      falhas++;
    }

    await p.locator('#news-resultado').screenshot({ path: `${SAIDA}/news-${rotulo}-${nome}-relatorio.png` });

    if (nome === 'web' || nome === 'mobile') {
      const r = await new AxeBuilder({ page: p }).withTags(['wcag2a', 'wcag2aa', 'wcag22aa']).analyze();
      console.log(`  ${rotulo} ${nome}: axe ${r.violations.length} violações`);
      for (const v of r.violations) console.log(`     [${v.impact}] ${v.id}: ${v.nodes.length} — ${v.nodes[0]?.html.slice(0, 120)}`);
      falhas += r.violations.length;
    }

    if (nome === 'web') {
      await p.emulateMedia({ media: 'print' });
      await p.screenshot({ path: `${SAIDA}/news-${rotulo}-impressao.png`, fullPage: true });
      const impressao = await p.evaluate(() => {
        const h = document.querySelector('header[data-surface]');
        const r = document.querySelector('[data-news-imprimir]')?.getBoundingClientRect();
        return { cabecalho: h ? getComputedStyle(h).display : 'sem-header', relatorio: r ? Math.round(r.height) : 0 };
      });
      console.log(`  ${rotulo} impressão: cabeçalho=${impressao.cabecalho} relatório=${impressao.relatorio}px`);
      if (impressao.cabecalho !== 'none' || impressao.relatorio < 500) falhas++;
      await p.emulateMedia({ media: 'screen' });
    }
    await ctx.close();
  }
}

await b.close();
console.log(falhas ? `FALHAS: ${falhas}` : 'OK');
process.exit(falhas ? 1 : 0);
