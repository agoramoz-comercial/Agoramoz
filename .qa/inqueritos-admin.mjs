import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * QA do construtor de inquéritos, contra `pnpm start` com `ADMIN_PREVIEW=on`:
 *
 *   ADMIN_PREVIEW=on pnpm start -p 3100
 *   BASE=http://127.0.0.1:3100 node .qa/inqueritos-admin.mjs
 *
 * Visita /qa/inqueritos (inquérito de exemplo; «Guardar» só volta à página).
 * Mede axe, scroll horizontal, e o comportamento do construtor: estado
 * sujo, erros legíveis, condição invertida, apagar com condição dependente,
 * pré-visualização, e a vista só de leitura.
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

for (const largura of [390, 768, 1440]) {
  console.log(`\n${largura} px`);
  const ctx = await b.newContext({ viewport: { width: largura, height: 900 }, reducedMotion: 'reduce' });
  const p = await ctx.newPage();
  const erros = [];
  p.on('pageerror', (e) => erros.push(e.message));
  p.on('console', (m) => {
    if (m.type() !== 'error') return;
    if (/report-only/.test(m.text())) return;
    // Pré-carregamentos de /admin/* respondem 404 nesta instância (ADMIN desligado).
    if (/\/admin[?/]|\/admin$/.test(m.location().url ?? '')) return;
    erros.push(`${m.text()} ${m.location().url ?? ''}`);
  });

  const r = await p.goto(`${BASE}/qa/inqueritos`, { waitUntil: 'load' });
  confere(r?.status() === 200, 'responde 200', `(${r?.status()})`);
  const larguraDoc = await p.evaluate(() => document.documentElement.scrollWidth);
  confere(larguraDoc <= largura, 'sem scroll horizontal', `${larguraDoc} > ${largura}`);
  confere((await p.getByRole('link', { name: 'Inquéritos' }).count()) === 1, 'entrada «Inquéritos» na navegação');
  confere((await p.getByText('Sem alterações').count()) === 1, 'começa sem alterações');
  const guardar = p.getByRole('button', { name: 'Guardar rascunho' });
  const publicar = p.getByRole('button', { name: 'Publicar' });
  confere(await guardar.isDisabled(), 'Guardar desligado sem alterações');
  confere(await publicar.isDisabled(), 'Publicar desligado sem alterações nem rascunho');
  await axe(p, 'construtor');
  await p.screenshot({ path: `${SAIDA}/inqueritos-construtor-${largura}.png`, fullPage: true });

  if (largura !== 1440) {
    confere(erros.length === 0, 'sem erros na consola', erros.slice(0, 3).join(' | '));
    await ctx.close();
    continue;
  }

  // Editar marca como sujo.
  const titulo3 = p.locator('article').nth(2).getByLabel('Pergunta', { exact: true });
  await titulo3.fill('Recomendaria a AGORAMOZ?');
  confere((await p.getByText('Alterações por guardar').count()) === 1, 'editar marca alterações por guardar');
  confere(!(await guardar.isDisabled()), 'Guardar ligado');

  // Título vazio → erro legível, botões desligados, prévia com a última válida.
  const titulo1 = p.locator('article').nth(0).getByLabel('Pergunta', { exact: true });
  await titulo1.fill('');
  confere((await p.getByText('Pergunta 1: título vazio.').count()) >= 1, 'título vazio: erro em português');
  confere(await guardar.isDisabled(), 'com erros não se guarda');
  confere((await p.getByText('Mostra a última versão sem problemas.').count()) === 1, 'prévia avisa que mostra a última válida');
  await axe(p, 'construtor com erros');
  await titulo1.fill('A empresa usa um ERP?');

  // Subir a condicional acima da pergunta-alvo → erro; descer de volta.
  await p.getByRole('button', { name: 'Subir a pergunta 2' }).click();
  const focoMover = await p.evaluate(() => document.activeElement?.id ?? '');
  confere(/-p2-(subir|cab)$/.test(focoMover), 'mover mantém o foco na mesma pergunta', focoMover);
  confere(
    (await p.getByText('a condição tem de apontar para uma pergunta anterior').count()) >= 1,
    'condição invertida é apanhada',
  );
  await p.getByRole('button', { name: 'Descer a pergunta 1' }).click();
  confere((await p.getByText('a condição tem de apontar').count()) === 0, 'repor a ordem limpa o erro');

  // Acrescentar uma avaliação.
  await p.getByLabel('Tipo da pergunta nova').selectOption('avaliacao');
  await p.getByRole('button', { name: 'Acrescentar pergunta' }).click();
  confere((await p.locator('article').count()) === 4, 'pergunta nova acrescentada');
  const focoNova = await p.evaluate(() => document.activeElement?.id ?? '');
  confere(/-p4-titulo$/.test(focoNova), 'acrescentar põe o foco no título da pergunta nova', focoNova);
  confere((await p.getByRole('heading', { name: /^Perguntas \(4 de 200\)/ }).count()) === 1, 'contagem actualizada');

  // Apagar a pergunta 1 retira a condição da 2 e avisa.
  await p.getByRole('button', { name: 'Apagar a pergunta 1' }).click();
  confere(
    (await p.getByText('1 condição que dependia dela foi retirada').count()) === 1,
    'apagar avisa da condição retirada',
  );
  confere(
    await p.evaluate(() => document.activeElement?.getAttribute('role') === 'status'),
    'apagar põe o foco no aviso',
  );
  confere(
    !(await p.locator('article').nth(0).getByLabel('Mostrar só consoante uma resposta anterior').isChecked()),
    'a pergunta que dependia ficou sem condição',
  );

  // A prévia é o renderer real.
  const previa = p.locator('aside');
  await previa.getByRole('button', { name: 'Começar' }).click();
  confere((await previa.locator('form h2').count()) === 1, 'prévia percorre o inquérito');

  // Guardar (sem efeito na pré-visualização) volta com mensagem.
  await guardar.click();
  await p.waitForURL(/ok=guardado/);
  confere((await p.getByText('Rascunho guardado.').count()) === 1, 'guardar volta com confirmação');

  confere(erros.length === 0, 'sem erros na consola', erros.slice(0, 3).join(' | '));
  await ctx.close();
}

console.log('\npartilha');
{
  const ctx = await b.newContext({
    viewport: { width: 1440, height: 900 },
    permissions: ['clipboard-read', 'clipboard-write'],
  });
  const p = await ctx.newPage();
  await p.goto(`${BASE}/qa/inqueritos`, { waitUntil: 'load' });
  const partilha = p.locator('#partilha');
  confere((await partilha.getByRole('img', { name: /Código QR/ }).count()) === 1, 'QR só no link activo');
  confere((await partilha.getByRole('button', { name: 'Copiar' }).count()) === 1, 'copiar só no link activo');
  await partilha.getByRole('button', { name: 'Copiar' }).click();
  await partilha.getByText('Copiado.').waitFor();
  const copiado = await p.evaluate(() => navigator.clipboard.readText());
  confere(copiado.startsWith('https://agoramoz.com/i/'), 'copiar põe o endereço na área de transferência');
  confere((await partilha.getByRole('button', { name: /^Revogar/ }).count()) === 2, 'revogar nos não revogados');
  const qrHref = await partilha.getByRole('link', { name: 'Descarregar QR (SVG)' }).getAttribute('href');
  confere(/\/admin\/inqueritos\/[0-9a-f-]+\/links\/[0-9a-f-]+\/qr$/.test(qrHref ?? ''), 'QR para descarregar no /admin');
  confere((await partilha.getByText('Tecto atingido').count()) === 1, 'estado «tecto atingido» visível');
  await axe(p, 'partilha');
  await partilha.screenshot({ path: `${SAIDA}/inqueritos-partilha-1440.png` });
  await ctx.close();
}

console.log('\nresultados');
for (const largura of [390, 1440]) {
  const ctx = await b.newContext({ viewport: { width: largura, height: 900 } });
  const p = await ctx.newPage();
  await p.goto(`${BASE}/qa/inqueritos?vista=resultados`, { waitUntil: 'load' });
  const larguraDoc = await p.evaluate(() => document.documentElement.scrollWidth);
  confere(larguraDoc <= largura, `${largura}: sem scroll horizontal`, `${larguraDoc}`);
  confere((await p.getByText('Estimativa:', { exact: false }).count()) >= 1, `${largura}: desistência diz que é estimativa`);
  const nps = await p.locator('section[aria-labelledby="res-p3"]').textContent();
  confere(/NPS\s*39/.test(nps ?? ''), `${largura}: NPS calculado das respostas (39)`, nps?.slice(0, 80));
  confere((await p.getByText('Respostas em texto ou data: veja-as na exportação CSV.').count()) === 1, `${largura}: texto remete para o CSV`);
  confere((await p.getByRole('link', { name: 'Exportar com contactos' }).count()) === 1, `${largura}: exportar com contactos para comercial`);
  await axe(p, `resultados ${largura}`);
  await p.screenshot({ path: `${SAIDA}/inqueritos-resultados-${largura}.png`, fullPage: true });
  await ctx.close();
}
{
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  await p.goto(`${BASE}/qa/inqueritos?vista=resultados&papel=leitura`, { waitUntil: 'load' });
  confere((await p.getByRole('link', { name: 'Exportar com contactos' }).count()) === 0, 'leitura: sem exportar contactos');
  await ctx.close();
}

console.log('\nleitura');
{
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  await p.goto(`${BASE}/qa/inqueritos?papel=leitura`, { waitUntil: 'load' });
  confere((await p.getByRole('button', { name: 'Guardar rascunho' }).count()) === 0, 'sem construtor');
  confere((await p.getByRole('button', { name: /Fechar o inquérito/ }).count()) === 0, 'sem fechar/reabrir');
  confere((await p.getByText('O seu papel permite ver, não editar.').count()) === 1, 'diz porquê');
  confere((await p.getByRole('heading', { name: 'Colar e transformar' }).count()) === 0, 'leitura: sem «Colar e transformar»');
  await axe(p, 'vista de leitura');
  await ctx.close();
}

// ── Colar e transformar (D-33): só o analisador local — a QA não tem chave ──
for (const largura of [390, 1440]) {
  console.log(`\ncolar e transformar — ${largura} px`);
  const ctx = await b.newContext({ viewport: { width: largura, height: 900 }, reducedMotion: 'reduce' });
  const p = await ctx.newPage();
  const erros = [];
  p.on('pageerror', (e) => erros.push(e.message));
  await p.goto(`${BASE}/qa/inqueritos`, { waitUntil: 'load' });
  const perguntas = (n) => p.getByRole('heading', { name: new RegExp(`^Perguntas \\(${n} de 200\\)`) });

  confere((await p.getByRole('heading', { name: 'Colar e transformar' }).count()) === 1, 'painel presente');
  const transformar = p.getByRole('button', { name: 'Transformar' });
  confere(await transformar.isDisabled(), 'sem texto, «Transformar» está desligado');
  confere(await p.getByRole('radio', { name: /Kimi \(IA\)/ }).isDisabled(), 'sem IA configurada, Kimi desligado');

  await p.getByRole('button', { name: 'Inserir exemplo' }).click();
  confere(
    await p.evaluate(() => document.activeElement?.tagName === 'TEXTAREA'),
    '«Inserir exemplo» deixa o foco no texto',
  );
  confere(
    (await p.getByRole('button', { name: 'Inserir exemplo' }).count()) === 0,
    'com texto, «Inserir exemplo» desaparece (nunca apaga o colado)',
  );
  await transformar.click();
  const proposta = p.getByRole('heading', { name: 'Proposta' });
  await proposta.waitFor();
  confere(await p.evaluate(() => document.activeElement?.textContent === 'Proposta'), 'o foco vai para a proposta');
  const resumo = (await p.getByRole('list', { name: 'Resumo' }).textContent()) ?? '';
  confere(
    ['8 perguntas', '2 secções', '2 obrigatórias', '1 condição'].every((t) => resumo.includes(t)),
    'resumo: 8 perguntas, 2 secções, 2 obrigatórias, 1 condição',
    resumo,
  );
  confere((await p.getByText('Lista de 4 opções; escolhe-se uma.').count()) === 1, 'mostra o porquê de cada tipo');
  confere((await p.getByText(/Só se «A empresa usa um ERP\?» = Sim/).count()) === 1, 'mostra a condição em linguagem simples');
  confere((await p.evaluate(() => document.documentElement.scrollWidth)) <= largura, 'sem scroll horizontal com a proposta');
  await axe(p, `proposta ${largura}`);
  await p.screenshot({ path: `${SAIDA}/inqueritos-importar-${largura}.png`, fullPage: true });

  await p.getByRole('button', { name: 'Aplicar: substituir o inquérito' }).click();
  await perguntas(8).waitFor();
  ok('substituir: 10 blocos (8 perguntas + 2 secções)');
  confere(
    await p.evaluate(() => document.activeElement?.textContent?.startsWith('Inquérito substituído: 8 perguntas, 2 secções')),
    'o foco vai para a confirmação',
  );
  confere(
    ((await p.getByRole('complementary', { name: 'Pré-visualização' }).textContent()) ?? '').includes('Inquérito de Maturidade Digital 2026'),
    'a pré-visualização mostra o inquérito importado',
  );
  confere((await p.getByText('Alterações por guardar').count()) === 1, 'fica por guardar (nada gravado)');

  await p.getByRole('button', { name: 'Desfazer importação' }).click();
  await perguntas(3).waitFor();
  ok('desfazer volta às 3 perguntas originais');

  await p.getByRole('radio', { name: /Juntar ao fim/ }).check();
  await transformar.click();
  await proposta.waitFor();
  await p.getByRole('button', { name: 'Aplicar: juntar ao fim' }).click();
  await perguntas(11).waitFor();
  ok('juntar ao fim: 3 + 10 blocos');
  await p.getByRole('button', { name: 'Fechar', exact: true }).click();
  confere(
    await p.evaluate(() => document.activeElement?.textContent?.startsWith('Perguntas (11 de 200) · 2 secções')),
    '«Fechar» leva o foco às perguntas',
  );
  confere(erros.length === 0, 'sem erros na página', erros.slice(0, 3).join(' | '));
  await ctx.close();
}
{
  console.log('\ncolar e transformar — Kimi pedido sem chave');
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  await p.goto(`${BASE}/qa/inqueritos?ia=1`, { waitUntil: 'load' });
  confere(await p.getByRole('radio', { name: /Kimi \(IA\)/ }).isChecked(), 'com IA, o Kimi vem escolhido');
  const campoTexto = p.getByRole('textbox', { name: 'Texto do inquérito' });
  await campoTexto.fill('x'.repeat(20_001));
  confere(
    (await p.getByText('Excede o limite em 1 caracteres').count()) === 1 &&
      (await p.getByRole('button', { name: 'Transformar' }).isDisabled()),
    'acima do limite: diz quanto excede (não só pela cor) e não transforma',
  );
  await campoTexto.fill('1. Usa um ERP? (Sim/Não)\n2. Se sim, qual?\n3. Qual o seu email?');
  await p.getByRole('button', { name: 'Transformar' }).click();
  await p.getByRole('heading', { name: 'Proposta' }).waitFor();
  confere(
    (await p.getByText(/A IA não está configurada no servidor — usei o analisador local/).count()) === 1,
    'cai para o analisador local e diz porquê',
  );
  confere(
    (await p.getByText(/Contacto no fim/).count()) >= 1 &&
      (await p.getByText('Qual o seu email?', { exact: true }).count()) === 0,
    '«Qual o seu email?» sai da proposta (dados pessoais só com consentimento)',
  );
  await axe(p, 'proposta com aviso de fallback');
  await p.getByRole('button', { name: 'Descartar proposta' }).click();
  await campoTexto.fill('');
  await p.getByRole('button', { name: 'Inserir modelo com campos' }).click();
  await p.getByRole('button', { name: 'Transformar' }).click();
  await p.getByRole('heading', { name: 'Proposta' }).waitFor();
  confere(
    (await p.getByText(/foi lida tal como está, sem IA/).count()) === 1,
    'modelo com campos: estrutura lida directamente, sem IA (mesmo com o Kimi escolhido)',
  );
  const resumoFicha = (await p.getByRole('list', { name: 'Resumo' }).textContent()) ?? '';
  confere(
    ['5 perguntas', '2 secções', '3 obrigatórias', '1 condição'].every((t) => resumoFicha.includes(t)),
    'modelo com campos: 5 perguntas, 2 secções, 3 obrigatórias, 1 condição',
    resumoFicha,
  );
  confere(
    (await p.getByText('Tipo indicado no texto: «Escolha múltipla».').count()) === 1,
    'modelo com campos: cada tipo diz de onde veio',
  );
  confere(
    (await p.getByText(/A IA não está configurada/).count()) === 0,
    'modelo com campos: sem aviso de recurso ao analisador local',
  );
  await axe(p, 'proposta da ficha com campos');
  await p.getByRole('button', { name: 'Descartar proposta' }).click();
  confere(
    await p.evaluate(() => document.activeElement?.tagName === 'TEXTAREA'),
    '«Descartar» devolve o foco ao texto',
  );
  await ctx.close();
}

await b.close();
console.log(falhas ? `\n${falhas} falha(s)` : '\ntudo verde');
process.exit(falhas ? 1 : 0);
