/**
 * QA das vistas de página, do painel de tráfego e das páginas da lei (D-47).
 * node .qa/trafego-seo.mjs http://127.0.0.1:3111 [pasta-das-capturas]   (ADMIN_PREVIEW=on)
 */
import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const BASE = process.argv[2] ?? 'http://127.0.0.1:3111';
const SAIDA = process.argv[3];
let falhas = 0;
const ok = (c, m) => {
  console.log(`${c ? 'ok  ' : 'FALHA'} ${m}`);
  if (!c) falhas += 1;
};
const graves = (r) => r.violations.filter((v) => ['serious', 'critical'].includes(v.impact));

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const p = await ctx.newPage();
const erros = [];
p.on('console', (m) => m.type() === 'error' && !/upgrade-insecure|status of 404/.test(m.text()) && erros.push(m.text()));

// Vistas: capturar o que o browser envia para /api/eventos.
const enviados = [];
await p.route('**/api/eventos', async (rota) => {
  try {
    enviados.push(JSON.parse(rota.request().postData() ?? '{}'));
  } catch {
    /* não JSON */
  }
  await rota.fulfill({ status: 204 });
});

// 1. Páginas da lei
await p.goto(`${BASE}/civico/lei/trabalho/artigo-15`);
ok((await p.locator('h1').innerText()).includes('Licença por paternidade'), 'lei: h1 com a epígrafe do artigo 15');
ok((await p.title()).length <= 60 && /art\. 15\.º/.test(await p.title()), `lei: <title> ≤ 60 e com o artigo — «${await p.title()}»`);
const desc = await p.locator('meta[name="description"]').getAttribute('content');
ok(desc && desc.length >= 120 && desc.length <= 160, `lei: descrição 120–160 (${desc?.length})`);
ok((await p.locator('link[rel="canonical"]').getAttribute('href'))?.endsWith('/civico/lei/trabalho/artigo-15'), 'lei: canonical');
const ld = await p.locator('script[type="application/ld+json"]').allInnerTexts();
ok(ld.some((t) => t.includes('"Legislation"')) && ld.some((t) => t.includes('BreadcrumbList')), 'lei: JSON-LD Legislation e BreadcrumbList');
ok(await p.getByRole('link', { name: /Boletim da República|FAOLEX|Tribunal Supremo|cópia/i }).first().isVisible(), 'lei: liga à fonte oficial');
ok((await p.getByRole('navigation', { name: 'Artigos relacionados' }).count()) + (await p.locator('#lei-relacionados').count()) > 0, 'lei: artigos relacionados');
const axeLei = await new AxeBuilder({ page: p }).analyze();
ok(graves(axeLei).length === 0, `axe lei ${graves(axeLei).map((v) => `${v.id}(${v.nodes.length})`).join(',')}`);
if (SAIDA) await p.screenshot({ path: `${SAIDA}/lei-artigo.png` });

await p.goto(`${BASE}/civico/lei/trabalho`);
ok((await p.locator('a[href^="/civico/lei/trabalho/artigo-"]').count()) >= 260, 'lei: índice da Lei do Trabalho com todos os artigos');
ok(/Faltam \d+ artigos/.test(await p.locator('main').innerText()), 'lei: os artigos em falta são ditos');
await p.goto(`${BASE}/civico/lei`);
ok((await p.locator('a[href="/civico/lei/familia"]').count()) > 0, 'lei: índice das três leis');
const n404 = await p.goto(`${BASE}/civico/lei/trabalho/artigo-9999`);
ok(n404?.status() === 404, 'lei: artigo inexistente → 404');
await p.goto(`${BASE}/civico`);
ok((await p.locator('a[href="/civico/lei/trabalho"]').count()) > 0, 'cívico: liga às leis');

// 2. Vistas e leitura
enviados.length = 0;
await p.goto(`${BASE}/sobre`);
await p.waitForTimeout(1500);
await p.mouse.wheel(0, 4000);
await p.waitForTimeout(800);
await p.getByRole('link', { name: 'Contactos' }).first().click();
await p.waitForURL('**/contactos');
await p.waitForTimeout(800);
const vistas = enviados.filter((e) => e.evento?.name === 'page_view');
const leituras = enviados.filter((e) => e.evento?.name === 'page_engagement');
ok(vistas.some((e) => e.path === '/sobre') && vistas.some((e) => e.path === '/contactos'), `vistas: /sobre e /contactos enviadas (${vistas.map((e) => e.path).join(', ')})`);
const leituraSobre = leituras.find((e) => e.path === '/sobre');
ok(leituraSobre && leituraSobre.evento.ms >= 1000 && leituraSobre.evento.scroll > 0, `leitura: /sobre com tempo e scroll (${JSON.stringify(leituraSobre?.evento)})`);
ok(enviados.every((e) => !('visita' in (e.evento ?? {})) && !JSON.stringify(e).includes('cookie')), 'vistas: o browser não envia identificador');
const cookies = await ctx.cookies();
ok(cookies.length === 0, `sem cookies (${cookies.map((c) => c.name).join(',')})`);
const guardado = await p.evaluate(() => Object.keys(localStorage));
ok(guardado.length === 0, `nada no localStorage (${guardado.join(',')})`);

// 3. GPC: não mede
const ctx2 = await browser.newContext();
await ctx2.addInitScript(() => Object.defineProperty(navigator, 'globalPrivacyControl', { get: () => true }));
const p2 = await ctx2.newPage();
const enviados2 = [];
await p2.route('**/api/eventos', (r) => {
  enviados2.push(1);
  return r.fulfill({ status: 204 });
});
await p2.goto(`${BASE}/sobre`);
await p2.waitForTimeout(1200);
ok(enviados2.length === 0, 'GPC: nenhuma vista enviada');
await ctx2.close();

// 4. Painel de tráfego (dados de exemplo)
await p.goto(`${BASE}/qa/trafego`);
const painel = await p.locator('main').innerText();
ok(/Todas as páginas/.test(painel) && /Onde param/.test(painel) && /Agora no site/.test(painel), 'tráfego: secções principais');
ok(/Páginas sem vistas neste período \(3\)/.test(painel) && (await p.locator('details').last().textContent()).includes('/global'), 'tráfego: páginas sem vistas listadas');
ok(/Pesquisa orgânica|Direto/.test(painel) && /Moçambique/.test(painel), 'tráfego: canais e países com nome');
const axeT = await new AxeBuilder({ page: p }).analyze();
ok(graves(axeT).length === 0, `axe tráfego ${graves(axeT).map((v) => `${v.id}(${v.nodes.length})`).join(',')}`);
if (SAIDA) await p.screenshot({ path: `${SAIDA}/trafego.png`, fullPage: true });

// 5. IndexNow
const chave = await (await p.request.get(`${BASE}/indexnow.txt`)).text();
ok(/^[0-9a-f]{32}$/.test(chave), 'indexnow: chave servida em /indexnow.txt');
const sm = await (await p.request.get(`${BASE}/sitemap.xml`)).text();
ok(sm.includes('/civico/lei/trabalho/artigo-15</loc>'), 'sitemap: artigos da lei');

ok(erros.length === 0, `sem erros na consola ${erros.join(' | ')}`);
await browser.close();
console.log(falhas ? `\n${falhas} falha(s).` : '\nTudo certo.');
process.exit(falhas ? 1 : 0);
