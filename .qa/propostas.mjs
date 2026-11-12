/**
 * QA do criador de propostas e do mapa AEOS (pré-visualização `/qa/*`, ADMIN_PREVIEW=on).
 * node .qa/propostas.mjs http://127.0.0.1:3111 [pasta-das-capturas]
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

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium',
});
const ctx = await browser.newContext({
  viewport: { width: 1600, height: 1000 },
});
const pagina = await ctx.newPage();
const erros = [];
// Pré-carregamentos de /admin/* respondem 404 nesta instância (sem sessão); a CSP report-only avisa sempre.
pagina.on('console', (m) => m.type() === 'error' && !/upgrade-insecure|status of 404/.test(m.text()) && erros.push(m.text()));

// Mapa AEOS
await pagina.goto(`${BASE}/qa/aeos`);
ok((await pagina.locator('h1').innerText()) === 'Mapa AEOS', 'aeos: título');
ok((await pagina.locator('#aeos-blocos ~ * li, ol li').count()) > 0, 'aeos: listas desenhadas');
const nav = await pagina.locator('nav[aria-label="Secções da administração"]').innerText();
ok(/Inquéritos/.test(nav) && /News/.test(nav), 'aeos: Inquéritos e News continuam na navegação');
ok(/Propostas/.test(nav) && /Mapa AEOS/.test(nav), 'aeos: Propostas e Mapa AEOS na navegação');
// Como nos outros QA do admin: só as violações sérias e críticas (a nota de pré-visualização fica fora das regiões).
const graves = (r) => r.violations.filter((v) => ['serious', 'critical'].includes(v.impact));
const axeAeos = await new AxeBuilder({ page: pagina }).analyze();
ok(graves(axeAeos).length === 0, `axe aeos ${graves(axeAeos).map((v) => v.id).join(',')}`);
if (SAIDA) await pagina.screenshot({ path: `${SAIDA}/aeos.png`, fullPage: true });

await pagina.goto(`${BASE}/qa/aeos?papel=colaborador`);
const hrefsColab = await pagina.locator('main a').evaluateAll((as) => as.map((a) => a.getAttribute('href')));
ok(
  !hrefsColab.some((h) => /gabinete|energia|auditoria|equipa|fila/.test(h ?? '')),
  'aeos: sem módulo nem papel, nenhuma ligação a espaços privados nem ao controlo',
);
ok(!/Gabinete ·|Espaço CEnO/.test(await pagina.locator('main').innerText()), 'aeos: sem módulo, o mapa não nomeia o Gabinete nem o CEnO');

// Propostas
await pagina.goto(`${BASE}/qa/propostas`);
await pagina.waitForSelector('[data-pagina]');
const folhas = await pagina.locator('[data-pagina]').count();
ok(folhas === 12, `propostas: 12 folhas com o exemplo completo — ${folhas}`);
const texto = await pagina.locator('[data-proposta-folhas]').innerText();
ok(texto.includes('1 735 000 MZN'), 'propostas: total calculado e agrupado (1 735 000 MZN)');
ok(texto.includes('comercial@agoramoz.com') && texto.includes('+258 82 478 0097'), 'propostas: contactos');
ok(/Confidencial/i.test(texto), 'propostas: «Confidencial» na capa');
ok(!texto.includes('190') || !texto.includes('1 190'), 'propostas: o custo não aparece nas folhas');
ok(!/margem projec|custo/i.test(texto), 'propostas: o custo e a margem não aparecem nas folhas');
await pagina.waitForTimeout(400);
const avisos = await pagina.locator('#proposta-verificacoes').locator('..').innerText();
ok(/Tudo certo para sair/.test(avisos), `propostas: sem avisos nem transbordos com o exemplo`);
ok(await pagina.getByRole('button', { name: /Imprimir/ }).isEnabled(), 'propostas: imprimir activo');
const axe = await new AxeBuilder({ page: pagina }).analyze();
ok(graves(axe).length === 0, `axe propostas ${graves(axe).map((v) => `${v.id}(${v.nodes.length})`).join(',')}`);
if (SAIDA) await pagina.screenshot({ path: `${SAIDA}/propostas.png` });

// Editar: o total muda, um campo vazio bloqueia a impressão
const cliente = pagina.getByLabel('Preparada para (cliente)');
await cliente.fill('');
ok(await pagina.getByRole('button', { name: /Imprimir/ }).isDisabled(), 'propostas: sem cliente, não imprime');
await cliente.fill('Cliente de exemplo');

// Texto longo de mais transborda e é avisado
await pagina
  .getByLabel('Carta')
  .fill(
    Array.from(
      { length: 14 },
      () => 'Parágrafo de exemplo com bastante texto para encher a página de propósito e ver o aviso de transbordo a funcionar como deve.',
    ).join('\n\n'),
  );
await pagina.waitForTimeout(500);
ok(/transborda/.test(await pagina.locator('#proposta-verificacoes').locator('..').innerText()), 'propostas: transbordo avisado');

// Rascunho fica no separador
await pagina.reload();
await pagina.waitForSelector('[data-pagina]');
ok((await pagina.locator('[data-pagina]').count()) >= 11, 'propostas: recarregar mantém o rascunho deste separador');

// PDF: tamanho A4, uma folha por página
await pagina.goto(`${BASE}/qa/propostas`);
await pagina.evaluate(() => sessionStorage.clear());
await pagina.goto(`${BASE}/qa/propostas`);
await pagina.waitForSelector('[data-pagina]');
await pagina.emulateMedia({ media: 'print' });
if (SAIDA) {
  await pagina.pdf({
    path: `${SAIDA}/proposta.pdf`,
    preferCSSPageSize: true,
    printBackground: true,
  });
  console.log('pdf gravado');
}
ok(erros.length === 0, `sem erros na consola ${erros.join(' | ')}`);
await browser.close();
console.log(falhas ? `\n${falhas} falha(s).` : '\nTudo certo.');
process.exit(falhas ? 1 : 0);
