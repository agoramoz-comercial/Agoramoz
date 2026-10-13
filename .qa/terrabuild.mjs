import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * QA da demonstração TerraBuild (D-41), contra `pnpm start`:
 *
 *   pnpm start -p 3100
 *   BASE=http://127.0.0.1:3100 node .qa/terrabuild.mjs
 *
 * Visita /projetos e /projetos/fazenda-inteligente-001 a 390, 768 e 1440 px.
 * Mede: um H1, selo e aviso de demonstração, noindex, termos bloqueados, axe,
 * scroll horizontal, erros de consola, pedidos fora da origem (a demo não
 * fala com nada) e cada interacção: filtros, camadas, linha temporal,
 * construtor (custo, frase, interferência), cenários, marcos, assistente,
 * camadas de acesso, submissão simulada sem rede, 3D a pedido (SwiftShader)
 * e o recurso à planta 2D sem WebGL.
 */
const BASE = process.env.BASE ?? 'http://127.0.0.1:3000';
const SAIDA = process.env.SAIDA ?? '.qa';
const ORIGEM = new URL(BASE).origin;
const b = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
let falhas = 0;
const falha = (msg) => {
  console.log(`  ✗ ${msg}`);
  falhas++;
};
const ok = (msg) => console.log(`  ✓ ${msg}`);
const confere = (cond, msg, detalhe = '') => (cond ? ok(msg) : falha(`${msg} ${detalhe}`));

const BLOQUEADOS = [/\bl[ií]der(es)?\b/i, /\bmelhor(es)?\b/i, /\bgarant(id|im|e\b|ia)/i, /n[uú]mero um/i, /em prepara[cç][aã]o/i, /primeira plataforma/i];

async function axe(p, rotulo, dentro) {
  // Com um diálogo modal aberto, o resto da página está tapado pelo véu de propósito: mede-se o diálogo.
  const r = await (dentro ? new AxeBuilder({ page: p }).include(dentro) : new AxeBuilder({ page: p })).analyze();
  const graves = r.violations.filter((v) => ['serious', 'critical'].includes(v.impact));
  if (graves.length) {
    falha(`${rotulo}: axe ${graves.map((v) => `${v.id} (${v.nodes.length})`).join(', ')}`);
    for (const v of graves) for (const n of v.nodes.slice(0, 3)) console.log(`      ${v.id}: ${n.target.join(' ')}`);
  } else ok(`${rotulo}: axe sem violações graves`);
}

async function base(p, rotulo) {
  confere((await p.locator('h1').count()) === 1, `${rotulo}: exactamente um H1`);
  confere((await p.getByText('Demonstração · dados fictícios').count()) >= 1, `${rotulo}: selo «Demonstração · dados fictícios»`);
  confere((await p.getByText('não é guardado, enviado nem cobrado', { exact: false }).count()) >= 1, `${rotulo}: aviso «não é guardado»`);
  const robots = await p.locator('meta[name="robots"]').getAttribute('content');
  confere(/noindex/.test(robots ?? ''), `${rotulo}: meta robots noindex`, `(${robots})`);
  const texto = await p.locator('main').innerText();
  const achados = BLOQUEADOS.flatMap((re) => texto.match(new RegExp(re.source, 'gi')) ?? []);
  confere(achados.length === 0, `${rotulo}: sem termos bloqueados`, `(${achados.join(', ')})`);
  const [sw, iw] = await p.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
  confere(sw <= iw, `${rotulo}: sem scroll horizontal`, `(${sw} > ${iw})`);
}

function vigiar(p) {
  const v = { erros: [], externos: [] };
  p.on('console', (m) => {
    // O aviso do CSP «report-only» é do site inteiro (ver .qa/csp.mjs), não desta página.
    if (m.type() === 'error' && !m.text().includes("'upgrade-insecure-requests' is ignored")) v.erros.push(m.text());
  });
  p.on('pageerror', (e) => v.erros.push(String(e)));
  p.on('request', (r) => {
    const u = r.url();
    if (!u.startsWith('data:') && !u.startsWith('blob:') && new URL(u).origin !== ORIGEM) v.externos.push(u);
  });
  return v;
}

const ECRAS = [
  { nome: '390', width: 390, height: 844 },
  { nome: '768', width: 768, height: 1024 },
  { nome: '1440', width: 1440, height: 900 },
];

for (const e of ECRAS) {
  console.log(`\n— ${e.nome} px`);
  const ctx = await b.newContext({ viewport: { width: e.width, height: e.height }, reducedMotion: 'reduce' });

  /* ------------------------------------------------------------- hub */
  const h = await ctx.newPage();
  const vh = vigiar(h);
  const r1 = await h.goto(`${BASE}/projetos`, { waitUntil: 'networkidle' });
  confere(r1.status() === 200, 'hub: 200');
  await base(h, 'hub');
  confere(
    (await h.getByRole('heading', { level: 1 }).innerText()).includes('Construa o futuro diretamente sobre o território'),
    'hub: H1 da proposta',
  );
  confere((await h.getByTestId('mapa-mz').locator('path').count()) === 11, 'hub: mapa com as 11 províncias');
  confere((await h.getByTestId('contagem-projetos').textContent()).startsWith('3 projetos'), 'hub: 3 projetos fictícios');
  await h.getByLabel('Estado').selectOption('concluido');
  confere((await h.getByTestId('contagem-projetos').textContent()).startsWith('1 projeto'), 'hub: filtro Estado=Concluído deixa 1');
  confere((await h.getByTestId('mapa-mz').locator('[data-pino]').count()) === 1, 'hub: o mapa só mostra o pino filtrado');
  await h.getByLabel('Estado').selectOption('todos');
  await h.getByLabel('Província').selectOption('niassa');
  confere(await h.getByText('Nenhum projeto com estes filtros.').isVisible(), 'hub: estado vazio honesto');
  await h.getByLabel('Província').selectOption('todas');
  confere(
    (await h.getByRole('link', { name: 'Explorar em 3D' }).getAttribute('href')) === '/projetos/fazenda-inteligente-001#gemeo-3d',
    'hub: cartão 001 leva ao 3D',
  );
  // Submeter terreno: simulado, sem rede.
  const pedidosAntes = vh.externos.length;
  // Só a analítica anónima pode sair (POST /api/eventos), e nunca com as respostas.
  // O sendBeacon esconde o corpo ao evento «request»; a rota interceptada lê-o.
  const posts = [];
  h.on('request', (r) => {
    if (r.method() === 'POST' && new URL(r.url()).pathname !== '/api/eventos') posts.push({ caminho: new URL(r.url()).pathname, corpo: r.postData() ?? '' });
  });
  await h.route('**/api/eventos', async (rota) => {
    posts.push({ caminho: '/api/eventos', corpo: rota.request().postDataBuffer()?.toString() ?? '' });
    await rota.continue();
  });
  await h.getByRole('button', { name: 'Submeter um terreno' }).click();
  const dialogo = h.getByRole('dialog', { name: 'Submeter um terreno' });
  confere(await dialogo.isVisible(), 'hub: diálogo «Submeter um terreno» abre');
  confere(
    (await dialogo.locator('input[type="email"], input[type="tel"], input[name*="nome" i]').count()) === 0,
    'hub: diálogo sem campos pessoais',
  );
  await axe(h, 'hub com diálogo', '[role="dialog"]');
  await dialogo.getByRole('button', { name: 'Simular a submissão' }).click();
  confere(await dialogo.getByText('Simulação concluída. As respostas não foram enviadas nem guardadas.').isVisible(), 'hub: submissão simulada');
  await h.waitForTimeout(300);
  const indevidos = posts.filter((x) => x.caminho !== '/api/eventos' || /manica|duat|agricultura|area|provincia/i.test(x.corpo));
  confere(indevidos.length === 0 && vh.externos.length === pedidosAntes, 'hub: as respostas não saem do browser', JSON.stringify(indevidos));
  const demo = posts.filter((x) => x.corpo.includes('project_demo_interaction'));
  confere(
    demo.length === 1 && JSON.stringify(JSON.parse(demo[0].corpo)).includes('"action":"submit_land"'),
    'hub: a analítica só recebe {projectId, action: submit_land}',
    demo.map((x) => x.corpo).join(' | '),
  );
  await h.keyboard.press('Escape');
  await axe(h, 'hub');
  await h.screenshot({ path: `${SAIDA}/terrabuild-hub-${e.nome}.png`, fullPage: false });
  confere(vh.erros.length === 0, 'hub: sem erros de consola', vh.erros.slice(0, 3).join(' | '));
  confere(vh.externos.length === 0, 'hub: nenhum pedido fora da origem', vh.externos.slice(0, 3).join(' | '));

  /* ----------------------------------------------------------- ficha */
  const f = await ctx.newPage();
  const vf = vigiar(f);
  const r2 = await f.goto(`${BASE}/projetos/fazenda-inteligente-001`, { waitUntil: 'networkidle' });
  confere(r2.status() === 200, 'ficha: 200');
  await base(f, 'ficha');

  // Linha temporal.
  const resumo = f.getByTestId('resumo-fase');
  const concl = async () => Number(await resumo.getAttribute('data-concluidos'));
  const hoje = await concl();
  await f.getByRole('button', { name: 'Terreno atual', exact: true }).click();
  confere((await concl()) === 0, 'timeline: «Terreno atual» sem nada concluído');
  await f.getByRole('button', { name: 'Resultado final projetado' }).click();
  const fim = await concl();
  confere(fim > hoje && hoje > 0, 'timeline: concluídos sobem de hoje para o resultado final', `(${hoje} → ${fim})`);
  await f.getByRole('button', { name: 'Hoje (simulado)' }).click();
  confere((await concl()) === hoje, 'timeline: «Hoje (simulado)» repõe');

  // Camadas.
  const agua = f.getByRole('button', { name: 'Rede de água' });
  const aguaAntes = await agua.getAttribute('aria-pressed');
  const elementosAgua = async () =>
    f.getByTestId('planta-2d').locator('[data-elemento^="rega"], [data-elemento="reservatorio"], [data-elemento="furo"]').count();
  const nAntes = await elementosAgua();
  await agua.click();
  confere((await agua.getAttribute('aria-pressed')) !== aguaAntes, 'camadas: «Rede de água» muda aria-pressed');
  confere((await elementosAgua()) < nAntes, 'camadas: a planta esconde a rede de água', `(${nAntes} → ${await elementosAgua()})`);
  await agua.click();
  await f.getByRole('button', { name: 'Terreno', exact: true }).click();
  confere((await f.getByRole('button', { name: 'Terreno', exact: true }).getAttribute('aria-pressed')) === 'true', 'base: «Terreno» activa');
  await f.getByRole('button', { name: 'Satélite (simulado)' }).click();

  // Construtor.
  const custo = f.getByTestId('custo-casa');
  const custo90 = await custo.innerText();
  await f.getByLabel('Comprimento', { exact: true }).fill('11');
  await f.getByLabel('Largura', { exact: true }).fill('10');
  const custo110 = await custo.innerText();
  confere(custo110 !== custo90, 'construtor: 90 → 110 m² muda o custo', `(${custo90} → ${custo110})`);
  const frase = await f.getByTestId('frase-variacao').innerText();
  confere(/90 m² para 110 m²/.test(frase) && /subiu/.test(frase), 'construtor: frase explica a variação', `(${frase.slice(0, 140)})`);
  confere((await f.getByTestId('quantidades').locator('tbody tr').count()) >= 10, 'construtor: tabela de quantidades');
  await f.getByLabel('Posição norte (N)').fill('155');
  const conflitos = Number(await f.getByTestId('interferencias').getAttribute('data-total'));
  confere(conflitos >= 1, 'construtor: N=155 cria interferência com a estrada', `(${conflitos})`);
  confere((await f.getByTestId('planta-2d').locator('[data-conflito="sim"]').count()) >= 1, 'construtor: a planta marca o conflito');
  await f.getByRole('button', { name: 'Repor o projeto de referência' }).click();
  confere((await custo.innerText()) === custo90, 'construtor: repor volta ao custo de referência');
  confere(Number(await f.getByTestId('interferencias').getAttribute('data-total')) === 0, 'construtor: referência sem interferências');

  // Agricultura e cenários.
  confere((await f.getByTestId('painel-agricola').textContent()).includes('Produção por ano'), 'agricultura: indicadores');
  const cen = f.getByTestId('cenarios');
  confere((await cen.locator('thead th').count()) === 4, 'cenários: tabela A/B/C (+ canto «Indicador»)');
  confere((await cen.textContent()).includes('Recomendado'), 'cenários: B marcado como recomendado');

  // Marcos.
  await f.getByRole('button', { name: /^Cobertura/ }).click();
  const sim = f.getByTestId('simulacao-marcos');
  await sim.getByRole('button', { name: 'Simular financiamento deste componente' }).click();
  for (let i = 0; i < 10; i++) {
    const avancar = sim.getByRole('button', { name: /^Avançar:/ });
    if ((await avancar.count()) === 0) break;
    await avancar.click();
  }
  confere(
    (await sim.getByRole('log').innerText()).includes('Simulação terminada. Nada foi guardado nem cobrado.'),
    'marcos: percurso completo termina em «Nada foi guardado nem cobrado»',
  );
  confere((await sim.getByRole('button', { name: 'Recomeçar' }).count()) === 1, 'marcos: «Recomeçar» no fim');

  // Camadas de acesso (tabs).
  const tabs = f.getByRole('tablist', { name: 'Camadas de acesso' });
  await tabs.getByRole('tab').first().focus();
  await f.keyboard.press('ArrowRight');
  confere((await tabs.getByRole('tab', { selected: true }).innerText()).includes('Investidor'), 'acesso: seta → passa a «Investidor registado»');

  // Assistente.
  const conversa = f.getByTestId('assistente-conversa');
  await f.getByRole('button', { name: 'Porque mudou o custo?' }).click();
  confere((await conversa.locator('li').count()) >= 2, 'assistente: sugestão responde');
  await f.getByLabel('Pergunta ao assistente').fill('Quais são os riscos de cheia?');
  await f.getByRole('button', { name: 'Perguntar' }).click();
  confere(/cheia/i.test(await conversa.locator('li').last().innerText()), 'assistente: pergunta livre responde sobre cheia');
  await f.getByLabel('Pergunta ao assistente').fill('Qual é a capital da França?');
  await f.getByRole('button', { name: 'Perguntar' }).click();
  const fora = await conversa.locator('li').last().innerText();
  confere(!/Paris/i.test(fora), 'assistente: fora de âmbito não inventa', `(${fora.slice(0, 120)})`);

  await axe(f, 'ficha');
  await f.screenshot({ path: `${SAIDA}/terrabuild-ficha-${e.nome}.png`, fullPage: false });

  // 3D a pedido (SwiftShader).
  const js = () => f.evaluate(() => performance.getEntriesByType('resource').filter((x) => x.name.endsWith('.js')).length);
  const jsAntes = await js();
  await f.locator('#gemeo').scrollIntoViewIfNeeded();
  await f.getByRole('button', { name: 'Vista 3D' }).click();
  const cena = f.getByTestId('cena-3d');
  await cena.locator('canvas').waitFor({ timeout: 30000 }).catch(() => {});
  confere((await cena.locator('canvas').count()) === 1, '3D: a cena monta um canvas WebGL');
  confere((await js()) > jsAntes, '3D: o código 3D só carrega ao clicar', `(${jsAntes} → ${await js()})`);
  await f.waitForTimeout(1200);
  await f.locator('#gemeo-3d').screenshot({ path: `${SAIDA}/terrabuild-3d-${e.nome}.png` });
  await f.getByRole('button', { name: 'Resultado final projetado' }).click();
  await f.waitForTimeout(300);
  confere((await cena.locator('canvas').count()) === 1, '3D: a timeline actualiza sem desmontar a cena');
  await axe(f, 'ficha em 3D');

  confere(vf.erros.length === 0, 'ficha: sem erros de consola', vf.erros.slice(0, 3).join(' | '));
  confere(vf.externos.length === 0, 'ficha: nenhum pedido fora da origem', vf.externos.slice(0, 3).join(' | '));

  // Chegada pelo hub com #gemeo-3d abre o 3D.
  const g = await ctx.newPage();
  await g.goto(`${BASE}/projetos/fazenda-inteligente-001#gemeo-3d`, { waitUntil: 'networkidle' });
  await g.getByTestId('cena-3d').waitFor({ timeout: 30000 }).catch(() => {});
  confere((await g.getByTestId('cena-3d').count()) === 1, '#gemeo-3d abre a vista 3D');
  await g.close();
  await ctx.close();
}

/* ------------------------------------------------- sem WebGL: planta 2D */
console.log('\n— sem WebGL');
{
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (tipo, ...resto) {
      if (/webgl/i.test(String(tipo))) return null;
      return original.call(this, tipo, ...resto);
    };
  });
  const p = await ctx.newPage();
  const v = vigiar(p);
  await p.goto(`${BASE}/projetos/fazenda-inteligente-001#gemeo-3d`, { waitUntil: 'networkidle' });
  confere((await p.getByTestId('planta-2d').count()) === 1, 'sem WebGL: #gemeo-3d fica na planta 2D');
  await p.getByRole('button', { name: 'Vista 3D' }).click();
  confere(
    (await p.getByTestId('planta-2d').count()) === 1 && (await p.getByTestId('cena-3d').count()) === 0,
    'sem WebGL: «Vista 3D» não parte nada',
  );
  confere(await p.getByText('Este navegador não tem WebGL', { exact: false }).isVisible(), 'sem WebGL: aviso visível');
  confere(v.erros.length === 0, 'sem WebGL: sem erros de consola', v.erros.slice(0, 3).join(' | '));
  await ctx.close();
}

/* ------------------------------------------- navegação: «Projetos» no menu */
console.log('\n— navegação');
for (const largura of [1024, 1280]) {
  const ctx = await b.newContext({ viewport: { width: largura, height: 800 } });
  const p = await ctx.newPage();
  await p.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  const [sw, iw] = await p.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
  confere(sw <= iw, `${largura} px: o cabeçalho não transborda`, `(${sw} > ${iw})`);
  const noCabecalho = await p.locator('header').getByRole('link', { name: 'Projetos (demo)', exact: true }).first().isVisible();
  // Entre 1024 e 1279 px não cabe sem mudar o desenho: fica no rodapé e nos CTAs.
  confere(noCabecalho === largura >= 1280, `${largura} px: «Projetos» ${largura >= 1280 ? 'visível' : 'fora'} do cabeçalho`);
  confere((await p.locator('footer').getByRole('link', { name: 'Projetos (demo)', exact: true }).count()) === 1, `${largura} px: «Projetos» no rodapé`);
  await p.locator('header').screenshot({ path: `${SAIDA}/terrabuild-cabecalho-${largura}.png` });
  await ctx.close();
}
{
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  const p = await ctx.newPage();
  await p.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  await p.locator('header').getByRole('button', { name: /menu/i }).first().click();
  confere(await p.getByRole('link', { name: 'Projetos (demo)', exact: true }).first().isVisible(), '390 px: «Projetos» na gaveta do menu');
  await ctx.close();
}
const sitemap = await (await fetch(`${BASE}/sitemap.xml`)).text();
confere(!sitemap.includes('/projetos'), 'sitemap: /projetos fora do sitemap');

await b.close();
console.log(falhas ? `\n${falhas} falha(s)` : '\nTudo verde');
process.exit(falhas ? 1 : 0);
