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
ok(await pagina.getByRole('button', { name: /Descarregar PDF/ }).isEnabled(), 'propostas: descarregar PDF activo');
const axe = await new AxeBuilder({ page: pagina }).analyze();
ok(graves(axe).length === 0, `axe propostas ${graves(axe).map((v) => `${v.id}(${v.nodes.length})`).join(',')}`);
if (SAIDA) await pagina.screenshot({ path: `${SAIDA}/propostas.png` });

// Editar: o total muda, um campo vazio bloqueia a impressão
const cliente = pagina.getByLabel('Preparada para (cliente)');
await cliente.fill('');
ok(await pagina.getByRole('button', { name: /Descarregar PDF/ }).isDisabled(), 'propostas: sem cliente, não descarrega');
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

// Colar o texto de uma proposta → desenho editorial (TUDO DE EXEMPLO).
const COLADO = [
  'Proposta comercial — Portal de pedidos',
  '',
  'Cliente: Cliente de Exemplo, Lda.',
  'Data: 12 de Novembro de 2026',
  'Validade: 45 dias',
  '',
  'Contexto',
  '- Pedidos por telefone: hoje os revendedores fazem pedidos por telefone.',
  '',
  'Investimento',
  'Fase\tDuração\tValor',
  'Diagnóstico\t2–3 semanas\t285 000 MZN',
  'Implementação\t6 semanas\t1 450 000 MZN',
  'Total\t\t1 800 000 MZN',
  '',
  'Próximos passos',
  '1. Aprovar a proposta.',
  '',
  'Anexo técnico',
  'Requisitos de alojamento a confirmar.',
].join('\n');
await pagina.goto(`${BASE}/qa/propostas?vazia=1`);
await pagina.evaluate(() => sessionStorage.clear());
await pagina.goto(`${BASE}/qa/propostas?vazia=1`);
await pagina.waitForSelector('[data-pagina]');
await pagina.getByRole('textbox', { name: 'Texto da proposta' }).fill(COLADO);
await pagina.getByRole('button', { name: 'Gerar o desenho editorial' }).click();
await pagina.waitForTimeout(500);
const folhasColadas = await pagina.locator('[data-proposta-folhas]').innerText();
ok(folhasColadas.includes('Portal') && folhasColadas.includes('Cliente de Exemplo, Lda.'), 'colar: capa com título e cliente do texto');
ok(folhasColadas.includes('1\u202F735\u202F000\u00A0MZN'), 'colar: total pela soma das fases (1 735 000 MZN)');
ok(folhasColadas.includes('Pedidos por telefone'), 'colar: contexto nas folhas');
const painel = await pagina.locator('section[aria-labelledby="proposta-colar"]').innerText();
ok(/Reconhecido:/.test(painel) && /Fases e investimento: 2/.test(painel), 'colar: relatório do que foi reconhecido');
ok(/soma das fases/.test(painel), 'colar: o total escrito que não bate é avisado');
ok(/Anexo técnico/.test(painel), 'colar: o que não tem lugar fica listado');
const axeColar = await new AxeBuilder({ page: pagina }).analyze();
ok(graves(axeColar).length === 0, `axe colar ${graves(axeColar).map((v) => `${v.id}(${v.nodes.length})`).join(',')}`);
if (SAIDA) await pagina.screenshot({ path: `${SAIDA}/colar.png` });

// Carregar ficheiros: .docx e .pdf reais (TUDO DE EXEMPLO), lidos no browser.
for (const [ficheiro, rotulo] of [
  ['lib/propostas/__fixtures__/proposta-exemplo.docx', 'docx'],
  ['lib/propostas/__fixtures__/proposta-exemplo.pdf', 'pdf'],
]) {
  await pagina.goto(`${BASE}/qa/propostas?vazia=1`);
  await pagina.evaluate(() => sessionStorage.clear());
  await pagina.goto(`${BASE}/qa/propostas?vazia=1`);
  await pagina.waitForSelector('[data-pagina]');
  await pagina.getByLabel('Carregar o documento da proposta').setInputFiles(ficheiro);
  await pagina.waitForFunction(() => /Desenho gerado a partir de/.test(document.body.innerText), null, { timeout: 30000 }).catch(() => {});
  const f = await pagina.locator('[data-proposta-folhas]').innerText();
  ok(f.includes('Cliente de Exemplo, Lda.') && f.includes('Portal'), `${rotulo}: capa com título e cliente do documento`);
  ok(f.includes('Levantamento de processos'), `${rotulo}: entregáveis da tabela no plano`);
  ok(f.includes('1\u202F735\u202F000\u00A0MZN'), `${rotulo}: total pela soma das fases`);
  const rel = await pagina.locator('section[aria-labelledby="proposta-colar"]').innerText();
  ok(/Fases e investimento: 2/.test(rel), `${rotulo}: relatório com as fases`);
  ok((await pagina.getByRole('textbox', { name: 'Texto da proposta' }).inputValue()).includes('Investimento'), `${rotulo}: o texto extraído fica no campo, para rever`);
}
if (SAIDA) await pagina.screenshot({ path: `${SAIDA}/carregar-pdf.png` });
await pagina.goto(`${BASE}/qa/propostas?vazia=1`);
await pagina.getByLabel('Carregar o documento da proposta').setInputFiles({ name: 'antiga.doc', mimeType: 'application/msword', buffer: Buffer.from('x') });
await pagina.waitForTimeout(400);
ok(/guarde como \.docx/.test(await pagina.locator('main').innerText()), 'doc antigo: diz o que fazer');

// Lista das guardadas e painel «Guardar» (sem sessão: o erro de acesso aparece, não parte)
await pagina.goto(`${BASE}/qa/propostas?vista=lista`);
const lista = await pagina.locator('main').innerText();
ok(/Propostas guardadas/.test(lista) && /Nova proposta/.test(lista) && /Enviada/.test(lista), 'lista: guardadas com estado e «Nova proposta»');
ok((await pagina.getByRole('link', { name: 'Gerar sem guardar' }).getAttribute('href')) === '/admin/propostas/rapida', 'lista: «Gerar sem guardar» leva ao editor sem base');
const axeLista = await new AxeBuilder({ page: pagina }).analyze();
ok(graves(axeLista).length === 0, `axe lista ${graves(axeLista).map((v) => v.id).join(',')}`);
await pagina.goto(`${BASE}/qa/propostas?vista=guardar`);
await pagina.waitForSelector('#proposta-guardar');
ok((await pagina.getByRole('combobox', { name: 'Oportunidade no Pipeline' }).locator('option').count()) === 2, 'guardar: oportunidades para ligar');
await pagina.getByRole('button', { name: 'Guardar proposta' }).click();
await pagina.waitForFunction(() => /permissão|guardar agora|inválid/i.test(document.querySelector('#proposta-guardar')?.parentElement?.textContent ?? ''), null, { timeout: 15000 }).catch(() => {});
ok(/permissão|guardar agora|inválid/i.test(await pagina.locator('#proposta-guardar').locator('..').innerText()), 'guardar: sem base, a falha aparece no painel e a proposta fica no editor');
ok((await pagina.locator('[data-pagina]').count()) > 1, 'guardar: as folhas continuam lá depois da falha');

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
