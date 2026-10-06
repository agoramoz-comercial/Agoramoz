import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * QA do jornal AGORAMOZ News (manchete, artigo, gosto, partilha, outdoor),
 * contra `pnpm start` com `ADMIN_PREVIEW=on`:
 *
 *   ADMIN_PREVIEW=on pnpm start -p 3100
 *   BASE=http://127.0.0.1:3100 node .qa/news-jornal.mjs
 *
 * Visita /qa/jornal (exemplos, sem base). Gostos, partilhas, impressões e
 * cliques são INTERCEPTADOS: nada sai daqui. Mede axe, scroll horizontal e
 * um só h1 a 390/768/1440; confere o outdoor (rodar, pausar, movimento
 * reduzido), o corpo dos pedidos (token só onde deve), e o gosto lembrado.
 */
const BASE = process.env.BASE ?? 'http://127.0.0.1:3000';
const SAIDA = process.env.SAIDA ?? '.qa';
const HEX32 = /^[0-9a-f]{32}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

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
const confere = (cond, msg, detalhe = '') => (cond ? ok(msg) : falha(`${msg} ${detalhe}`));

async function axe(p, rotulo) {
  const r = await new AxeBuilder({ page: p }).analyze();
  const graves = r.violations.filter((v) => ['serious', 'critical'].includes(v.impact));
  if (graves.length) {
    falha(`${rotulo}: axe ${graves.map((v) => `${v.id} (${v.nodes.length})`).join(', ')}`);
    for (const v of graves)
      for (const n of v.nodes.slice(0, 3)) console.log(`      ${v.id}: ${n.target.join(' ')}`);
  } else ok(`${rotulo}: axe sem violações graves`);
}

async function preparar(ctx) {
  const p = await ctx.newPage();
  const erros = [];
  const pedidos = { gosto: [], partilha: [], impressoes: [], cliques: [] };
  p.on('pageerror', (e) => erros.push(e.message));
  p.on('console', (m) => {
    if (m.type() !== 'error') return;
    if (/report-only/.test(m.text())) return;
    erros.push(`${m.text()} ${m.location().url ?? ''}`);
  });
  await p.route('**/api/news/gosto', async (rota) => {
    pedidos.gosto.push(JSON.parse(rota.request().postData() ?? 'null'));
    await rota.fulfill({ status: 200, contentType: 'application/json', body: '{"gostos":13}' });
  });
  await p.route('**/api/news/partilha', async (rota) => {
    pedidos.partilha.push(JSON.parse(rota.request().postData() ?? 'null'));
    await rota.fulfill({ status: 204 });
  });
  await p.route('**/api/news/anuncio/impressoes', async (rota) => {
    pedidos.impressoes.push(JSON.parse(rota.request().postData() ?? 'null'));
    await rota.fulfill({ status: 204 });
  });
  await p.route(/\/api\/news\/anuncio\/[0-9a-f-]{36}/, async (rota) => {
    pedidos.cliques.push(rota.request().url());
    await rota.fulfill({ status: 200, contentType: 'text/html', body: '<title>destino</title>' });
  });
  await p.route('**/api/eventos', (rota) => rota.fulfill({ status: 204 }));
  return { p, erros, pedidos };
}

async function semScrollHorizontal(p, rotulo) {
  const r = await p.evaluate(() => ({
    sw: document.scrollingElement.scrollWidth,
    w: window.innerWidth,
  }));
  confere(r.sw <= r.w, `${rotulo}: sem scroll horizontal`, `(${r.sw} > ${r.w})`);
}

const LARGURAS = [
  [390, 844],
  [768, 1024],
  [1440, 900],
];

for (const [w, h] of LARGURAS) {
  console.log(`\n— ${w}px`);
  const ctx = await b.newContext({ viewport: { width: w, height: h } });

  // Primeira página.
  {
    const { p, erros } = await preparar(ctx);
    await p.goto(`${BASE}/qa/jornal`, { waitUntil: 'networkidle' });
    confere((await p.locator('h1').count()) === 1, `primeira página: um só h1`);
    confere(
      /AGORAMOZ/.test((await p.locator('h1').textContent()) ?? ''),
      'primeira página: o h1 é o nome do jornal',
    );
    const outdoors = await p.locator('aside[aria-label="Publicidade"]').count();
    confere(outdoors >= 2, `primeira página: outdoor no topo e no meio da lista (${outdoors})`);
    const href = await p.locator('aside[aria-label="Publicidade"] a').first().getAttribute('href');
    confere(
      /^\/api\/news\/anuncio\/[0-9a-f-]{36}\?p=(topo|feed)$/.test(href ?? ''),
      'outdoor: o clique passa pela rota de medição, sem token no HTML',
      href,
    );
    const razao = await p.locator('.outdoor-led').first().evaluate((el) => el.clientWidth / el.clientHeight);
    const esperada = w >= 1024 ? 4 : w >= 640 ? 3 : 2;
    confere(Math.abs(razao - esperada) < 0.1, `outdoor: proporção ${esperada}:1`, `(${razao.toFixed(2)})`);
    await semScrollHorizontal(p, 'primeira página');
    await axe(p, 'primeira página');
    await p.screenshot({ path: `${SAIDA}/news-jornal-${w}.png`, fullPage: true });
    confere(erros.length === 0, 'primeira página: sem erros na consola', erros.join(' | '));
    await p.close();
  }

  // Artigo.
  {
    const { p, erros, pedidos } = await preparar(ctx);
    await p.goto(`${BASE}/qa/jornal?vista=artigo`, { waitUntil: 'networkidle' });
    confere((await p.locator('h1').count()) === 1, 'artigo: um só h1');
    confere(
      (await p.locator('nav ol li [aria-current="page"]').count()) === 1,
      'artigo: trilho visível com a página actual',
    );
    const ld = await p.locator('script[type="application/ld+json"]').allTextContents();
    confere(ld.some((t) => /"NewsArticle"/.test(t)), 'artigo: JSON-LD NewsArticle');
    confere(!ld.some((t) => /<\/script/i.test(t)), 'artigo: JSON-LD sem </script> em claro');
    const outdoors = await p.locator('aside[aria-label="Publicidade"]').count();
    confere(outdoors === 2, `artigo: outdoor dentro e no fim do artigo (${outdoors})`);
    await semScrollHorizontal(p, 'artigo');
    await axe(p, 'artigo');
    await p.screenshot({ path: `${SAIDA}/news-artigo-${w}.png`, fullPage: true });

    if (w === 390) {
      // Gosto: optimista, número do servidor, 1 por browser e lembrado.
      const botoes = p.getByRole('button', { name: /^Gostar/ });
      confere((await botoes.count()) === 2, 'gosto: botão no topo e no fim do artigo');
      const botao = botoes.first();
      confere((await botao.getAttribute('aria-pressed')) === 'false', 'gosto: começa por marcar');
      await botao.click();
      await p.waitForTimeout(300);
      confere((await botao.getAttribute('aria-pressed')) === 'true', 'gosto: fica marcado');
      confere(/13/.test((await botao.textContent()) ?? ''), 'gosto: mostra o total do servidor');
      confere(
        (await botoes.nth(1).getAttribute('aria-pressed')) === 'true' && /13/.test((await botoes.nth(1).textContent()) ?? ''),
        'gosto: o botão do fim acompanha o do topo',
      );
      confere(
        pedidos.gosto.length === 1 &&
          pedidos.gosto[0].slug === 'exemplo-qa-1' &&
          HEX32.test(pedidos.gosto[0].token) &&
          Object.keys(pedidos.gosto[0]).length === 2,
        'gosto: corpo só com slug e token anónimo',
        JSON.stringify(pedidos.gosto),
      );
      await botao.click({ force: true });
      await p.waitForTimeout(200);
      confere(pedidos.gosto.length === 1, 'gosto: segundo clique não envia nada');
      await p.reload({ waitUntil: 'networkidle' });
      confere(
        (await p.getByRole('button', { name: /^Gostar/ }).nth(1).getAttribute('aria-pressed')) === 'true',
        'gosto: lembrado depois de recarregar',
      );

      // Partilha.
      const linkedin = await p.getByRole('link', { name: /LinkedIn/ }).first().getAttribute('href');
      confere(
        (linkedin ?? '').startsWith('https://www.linkedin.com/sharing/share-offsite/?url=') &&
          (linkedin ?? '').includes(encodeURIComponent('/news/exemplo-qa-1')),
        'partilha: LinkedIn com o endereço do artigo',
        linkedin,
      );
      await ctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: BASE });
      await p.getByRole('button', { name: /Copiar ligação/ }).first().click();
      await p.waitForTimeout(400);
      confere(
        /copiada/.test((await p.locator('[role=status]').allTextContents()).join(' ')),
        'partilha: «Ligação copiada.»',
      );
      confere(
        pedidos.partilha.some((x) => x?.slug === 'exemplo-qa-1' && x?.canal === 'copiar' && !('token' in x)),
        'partilha: conta o canal, sem token',
        JSON.stringify(pedidos.partilha),
      );

      // Impressões: outdoor ≥ 50 % visível durante ≥ 1 s, em lote.
      await p.locator('aside[aria-label="Publicidade"]').first().scrollIntoViewIfNeeded();
      await p.waitForTimeout(3600);
      const itens = pedidos.impressoes.flatMap((x) => x?.itens ?? []);
      confere(
        itens.length >= 1 && itens.every((i) => UUID.test(i.id) && ['artigo', 'fim'].includes(i.posicao)),
        `impressões: enviadas em lote com id e lugar (${itens.length})`,
        JSON.stringify(pedidos.impressoes),
      );
      confere(
        pedidos.impressoes.every((x) => x?.token === undefined || HEX32.test(x.token)),
        'impressões: só o token anónimo, nada mais',
      );

      // Clique: o token anónimo junta-se no clique.
      await p.locator('aside[aria-label="Publicidade"] a').first().click();
      await p.waitForTimeout(500);
      const clique = pedidos.cliques[0] ?? '';
      confere(
        /\/api\/news\/anuncio\/[0-9a-f-]{36}\?p=artigo&k=[0-9a-f]{64}$/.test(clique),
        'clique: vai pela rota com o lugar e a chave derivada (nunca o token)',
        clique,
      );
    }
    confere(erros.length === 0, 'artigo: sem erros na consola', erros.join(' | '));
    await p.close();
  }
  await ctx.close();
}

// Outdoor: rodar, pausar e movimento reduzido.
console.log('\n— outdoor em movimento');
{
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  const { p } = await preparar(ctx);
  await p.goto(`${BASE}/qa/jornal`, { waitUntil: 'networkidle' });
  const topo = p.locator('aside[aria-label="Publicidade"]').first();
  await p.mouse.move(5, 895);
  const antes = await topo.locator('.outdoor-criativo .outdoor-titulo').textContent();
  await p.waitForTimeout(7600);
  const depois = await topo.locator('.outdoor-criativo .outdoor-titulo').textContent();
  confere(antes !== depois, 'roda o criativo a cada 7 s', `(${antes} → ${depois})`);
  await topo.getByRole('button', { name: 'Pausar os anúncios' }).focus();
  await p.keyboard.press('Enter');
  await p.locator('h1').focus().catch(() => {});
  await p.evaluate(() => document.activeElement instanceof HTMLElement && document.activeElement.blur());
  await p.mouse.move(5, 895);
  confere((await topo.getAttribute('data-pausa')) === 'sim', 'pausa pelo botão (teclado)');
  confere(
    (await topo.getByRole('button', { name: 'Pausar os anúncios' }).getAttribute('aria-pressed')) === 'true',
    'o botão fica aria-pressed=true (nome fixo)',
  );
  const parado = await topo.locator('.outdoor-criativo .outdoor-titulo').textContent();
  await p.waitForTimeout(7600);
  confere((await topo.locator('.outdoor-criativo .outdoor-titulo').textContent()) === parado, 'pausado não roda');
  await ctx.close();
}
{
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  const { p } = await preparar(ctx);
  await p.goto(`${BASE}/qa/jornal`, { waitUntil: 'networkidle' });
  const topo = p.locator('aside[aria-label="Publicidade"]').first();
  confere((await topo.getAttribute('data-pausa')) === 'sim', 'movimento reduzido: parado');
  confere((await topo.getByRole('button').count()) === 0, 'movimento reduzido: sem botão de pausa (nada se move)');
  const anima = await p.evaluate(() =>
    [...document.querySelectorAll('.outdoor-faixa, [class*="marquee"]')].map(
      (el) => getComputedStyle(el).animationName,
    ),
  );
  confere(anima.every((n) => n === 'none'), 'movimento reduzido: faixas paradas', JSON.stringify(anima));
  await p.screenshot({ path: `${SAIDA}/news-jornal-390-reduzido.png` });
  await ctx.close();
}

// Edição inglesa e estados honestos.
console.log('\n— EN, vazio e erro');
{
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  const { p } = await preparar(ctx);
  await p.goto(`${BASE}/qa/jornal?idioma=en`, { waitUntil: 'networkidle' });
  confere(/QA example 1/.test((await p.locator('body').textContent()) ?? ''), 'EN: títulos em inglês');
  await axe(p, 'EN');
  await p.goto(`${BASE}/qa/jornal?idioma=en&vista=artigo`, { waitUntil: 'networkidle' });
  await axe(p, 'EN artigo');
  await p.goto(`${BASE}/qa/jornal?vista=vazio`, { waitUntil: 'networkidle' });
  const vazio = (await p.locator('body').textContent()) ?? '';
  confere(/sem artigos|Ainda/i.test(vazio), 'vazio: diz que ainda não há artigos');
  await axe(p, 'vazio');
  await p.goto(`${BASE}/qa/jornal?vista=erro`, { waitUntil: 'networkidle' });
  confere((await p.locator('[role=alert]').count()) >= 1, 'erro: aviso em role=alert, não «sem notícias»');
  await axe(p, 'erro');
  await ctx.close();
}

await b.close();
console.log(falhas ? `\n${falhas} falha(s)` : '\nTudo verde');
process.exit(falhas ? 1 : 0);
