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
  confere((await p.getByRole('heading', { name: /^Perguntas \(4 de 50\)/ }).count()) === 1, 'contagem actualizada');

  // Apagar a pergunta 1 retira a condição da 2 e avisa.
  await p.getByRole('button', { name: 'Apagar a pergunta 1' }).click();
  confere(
    (await p.getByText('1 condição que dependia dela foi retirada').count()) === 1,
    'apagar avisa da condição retirada',
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

console.log('\nleitura');
{
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  await p.goto(`${BASE}/qa/inqueritos?papel=leitura`, { waitUntil: 'load' });
  confere((await p.getByRole('button', { name: 'Guardar rascunho' }).count()) === 0, 'sem construtor');
  confere((await p.getByRole('button', { name: /Fechar o inquérito/ }).count()) === 0, 'sem fechar/reabrir');
  confere((await p.getByText('O seu papel permite ver, não editar.').count()) === 1, 'diz porquê');
  await axe(p, 'vista de leitura');
  await ctx.close();
}

await b.close();
console.log(falhas ? `\n${falhas} falha(s)` : '\ntudo verde');
process.exit(falhas ? 1 : 0);
