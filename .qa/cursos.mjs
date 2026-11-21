/**
 * QA dos cursos (pré-visualização `/qa/cursos`, ADMIN_PREVIEW=on, com o motor
 * simulado `.qa/cursos-motor-simulado.mjs` e CURSOS_ENGINE=zabaedu).
 * node .qa/cursos.mjs http://127.0.0.1:3111 [pasta-das-capturas]
 */
import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const BASE = process.argv[2] ?? 'http://127.0.0.1:3111';
const SAIDA = process.argv[3];
let falhas = 0;
const ok = (c, m) => {
  console.log(`${c ? 'ok  ' : 'FALHA'} ${m}`);
  if (!c) falhas += 1;
};
const graves = (r) => r.violations.filter((v) => ['serious', 'critical'].includes(v.impact));
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 } });
const p = await ctx.newPage();
const erros = [];
p.on('console', (m) => m.type() === 'error' && !/upgrade-insecure|status of 404/.test(m.text()) && erros.push(m.text()));

// 1. Criador: carregar uma fonte, gerar, ver o ciclo e o documento.
const dir = mkdtempSync(join(tmpdir(), 'cursos-'));
const ficheiro = join(dir, 'manual-exemplo.md');
writeFileSync(
  ficheiro,
  [
    '# Manual de armazém (exemplo de QA)',
    'O inventário periódico conta todos os artigos do armazém no fim de cada mês, comparando o stock físico com o registo do sistema.',
    'Quando a diferença ultrapassa 2% do valor do stock, o responsável abre uma ocorrência e investiga a causa da diferença.',
    'O método FIFO determina que os artigos que entram primeiro saem primeiro, o que reduz as perdas de produtos perecíveis.',
    'Na recepção, a mercadoria é conferida contra a guia de remessa e a entrada é registada no sistema no mesmo dia.',
    'Os artigos novos são arrumados atrás dos antigos, para que o método FIFO se cumpra sem esforço adicional da equipa.',
    'A contagem cíclica verifica todas as semanas uma parte do armazém, escolhida pelos artigos de maior valor, sem parar a operação.',
    'Cada corredor tem uma etiqueta com o código da zona, e cada prateleira um número, para que qualquer artigo seja encontrado depressa.',
    'O relatório mensal de stock mostra as entradas, as saídas, as quebras e o valor imobilizado, e é enviado à direcção financeira.',
    'Os artigos danificados são separados numa zona própria, registados como quebra e retirados do stock disponível no sistema.',
    'O responsável de armazém revê com a equipa, no início de cada semana, as ocorrências abertas e as contagens previstas.',
  ].join('\n\n'),
);
await p.goto(`${BASE}/qa/cursos`);
await p.locator('input[type=file]').setInputFiles(ficheiro);
await p.getByText('1 fonte(s) lida(s) neste computador.').waitFor();
ok(/F1 · manual-exemplo/.test(await p.locator('ul[aria-label="Fontes carregadas"]').innerText()), 'fonte lida no browser e numerada F1');
ok(await p.getByRole('button', { name: /Gerar e verificar/ }).isDisabled(), 'gerar fica desligado sem título e público');
ok(/falta: o título do curso; «Para quem»/.test(await p.locator('[data-falta]').innerText()), 'o ecrã diz o que falta para gerar');
ok(await p.getByRole('button', { name: 'Gerar o tema com IA' }).isDisabled(), 'tema com IA fica desligado sem título');
await p.getByLabel('Título do curso').fill('Gestão de stock no armazém');
await p.getByRole('button', { name: 'Gerar o tema com IA' }).click();
await p.getByText(/Tema gerado pela IA a partir do título/).waitFor({ timeout: 30_000 });
const temaGerado = await p.getByLabel('Tema (gerado pela IA)').inputValue();
ok(/«Gestão de stock no armazém»/.test(temaGerado), 'a IA escreveu o tema a partir do título');
ok(!/1987|4 321/.test(temaGerado), 'o número inventado no tema foi apanhado');
ok(/2 tentativa\(s\)/.test(await p.getByText(/Tema gerado pela IA/).innerText()), 'o tema precisou de 2 tentativas');
await p.getByLabel('Para quem').fill('Responsáveis de armazém (exemplo)');
const axe0 = await new AxeBuilder({ page: p }).analyze();
ok(
  graves(axe0).length === 0,
  `axe criador ${graves(axe0)
    .map((v) => `${v.id}(${v.nodes.length})`)
    .join(',')}`,
);
await p.getByRole('button', { name: /Gerar e verificar/ }).click();
await p.getByText(/Curso montado com o que passou a verificação/).waitFor({ timeout: 90_000 });
const prog = await p.locator('section[aria-live="polite"]').innerText();
ok(/Plano do curso/.test(prog) && /2 tentativa\(s\)/.test(prog), 'o plano precisou de 2 tentativas (o erro da 1.ª foi apanhado)');
ok((await p.locator('[data-estado="ok"]').count()) >= 3, 'plano e aulas verificados');
ok((await p.locator('[data-estado="falhou"]').count()) === 0, 'nenhuma peça falhou');
ok(await p.getByRole('button', { name: 'Descarregar PDF' }).isVisible(), 'descarregar PDF disponível');
const doc = await p.locator('[data-curso-documento]').innerText();
ok(/AGORAMOZ ACADEMIA/.test(doc) && /Gestão de stock no armazém/.test(doc), 'documento com capa e título');
ok(!/edição alargada/.test(doc), 'o título é o da equipa, não o que o motor propôs');
ok(!/4 321|1987|75%/.test(doc), 'o que o verificador recusou não chegou ao documento');
ok(/F1\.\d/.test(doc), 'blocos com etiquetas de fonte');
if (SAIDA) await p.screenshot({ path: `${SAIDA}/cursos-criador.png`, fullPage: false });

// 2. Documento: folhas cheias sem transbordar; PDF.
await p.goto(`${BASE}/qa/cursos?vista=documento`);
// Folha cheia: nenhum elemento com conteúdo (fora das formas decorativas) passa do fundo.
const transborda = await p.evaluate(() =>
  [...document.querySelectorAll('[data-curso-documento] > section')]
    .filter((s) => s.className.includes('cheia'))
    .filter((s) => {
      const fundo = s.getBoundingClientRect().bottom;
      return [...s.querySelectorAll('*')].some((e) => !e.closest('[aria-hidden="true"]') && e.getBoundingClientRect().bottom > fundo + 1);
    })
    .map((s) => s.getAttribute('aria-label')),
);
ok(transborda.length === 0, `folhas cheias sem transbordar ${transborda.join(', ')}`);
const t = await p.locator('[data-curso-documento]').innerText();
for (const s of [
  'O curso',
  'O que vai',
  'Programa',
  'Respostas',
  'Fontes',
  'Como este curso',
  'comercial@agoramoz.com',
  '+258 82 478 0097',
])
  ok(t.includes(s), `documento: ${s}`);
const axe1 = await new AxeBuilder({ page: p }).analyze();
ok(
  graves(axe1).length === 0,
  `axe documento ${graves(axe1)
    .map((v) => `${v.id}(${v.nodes.length})`)
    .join(',')}`,
);
if (SAIDA) {
  await p.emulateMedia({ media: 'print' });
  await p.pdf({ path: `${SAIDA}/curso-exemplo.pdf`, preferCSSPageSize: true, printBackground: true });
  await p.emulateMedia({ media: 'screen' });
}

// 3. Página pública.
await p.goto(`${BASE}/qa/cursos?vista=publica`);
const pub = await p.locator('main, body').first().innerText();
ok(
  /O que vai\s+aprender/i.test(pub) && /programa/i.test(pub) && /Como foi\s+verificado/i.test(pub),
  'pública: resultados, programa, verificação',
);
ok((await p.getByRole('link', { name: 'Descarregar o curso (PDF)' }).count()) === 2, 'pública: CTA para o documento');
ok((await p.locator('h1').count()) === 1, 'pública: um h1');
const ld = await p.locator('script[type="application/ld+json"]').allInnerTexts();
ok(
  ld.some((x) => x.includes('"@type":"Course"')),
  'pública: dados estruturados Course',
);
const axe2 = await new AxeBuilder({ page: p }).analyze();
ok(
  graves(axe2).length === 0,
  `axe pública ${graves(axe2)
    .map((v) => `${v.id}(${v.nodes.length})`)
    .join(',')}`,
);
if (SAIDA) await p.screenshot({ path: `${SAIDA}/cursos-publica.png`, fullPage: true });
await p.setViewportSize({ width: 390, height: 844 });
const larg = await p.evaluate(() => document.documentElement.scrollWidth);
ok(larg <= 390, `pública: sem scroll horizontal no telemóvel (${larg})`);
if (SAIDA) await p.screenshot({ path: `${SAIDA}/cursos-publica-telemovel.png`, fullPage: false });

// 4. Fontes pela IA: pesquisa (links confirmados, um recusado) e texto-base, sempre marcados.
await p.setViewportSize({ width: 1280, height: 900 });
await p.goto(`${BASE}/qa/cursos`);
ok(await p.getByRole('button', { name: 'Pesquisar fontes na internet' }).isDisabled(), 'fontes pela IA desligadas sem título');
await p.getByLabel('Título do curso').fill('Gestão de stock no armazém');
await p.getByRole('button', { name: 'Pesquisar fontes na internet' }).click();
await p.getByText(/fonte\(s\) encontrada\(s\) pela IA, com o link confirmado/).waitFor({ timeout: 30_000 });
const listaIA = p.locator('ul[aria-label="Fontes carregadas"]');
ok((await listaIA.locator('[data-origem="ia-pesquisa"]').count()) === 2, 'pesquisa: 2 fontes com o link confirmado');
ok(!/nao-existe/.test(await listaIA.innerText()), 'pesquisa: o link que não abre ficou de fora');
ok(/não entrou \(1\)/.test(await p.locator('section').first().innerText()), 'pesquisa: o recusado é mostrado com a razão');
await p.locator('summary', { hasText: 'Colar texto como fonte' }).click();
await p.getByRole('button', { name: 'Escrever o texto com IA' }).click();
await p.getByText(/A IA escreveu o texto na caixa/).waitFor({ timeout: 30_000 });
ok((await p.getByLabel('Texto', { exact: true }).inputValue()).length > 1500, 'a IA escreveu o texto na caixa de colar');
ok(/Texto-base:/.test(await p.getByLabel('Título da fonte').inputValue()), 'com um título de fonte');
await p.getByLabel('Texto', { exact: true }).press('End');
await p.getByLabel('Texto', { exact: true }).pressSequentially(' Nota acrescentada pela equipa.');
await p.getByRole('button', { name: 'Juntar às fontes' }).click();
ok((await listaIA.locator('[data-origem="ia-texto"]').count()) === 1, 'texto-base marcado como escrito pela IA');
await p.getByLabel('Para quem').fill('Responsáveis de armazém (exemplo)');
const axe3 = await new AxeBuilder({ page: p }).analyze();
ok(
  graves(axe3).length === 0,
  `axe fontes IA ${graves(axe3)
    .map((v) => `${v.id}(${v.nodes.length})`)
    .join(',')}`,
);
if (SAIDA) await p.locator('section').first().screenshot({ path: `${SAIDA}/cursos-fontes-ia.png` });
await p.getByRole('button', { name: /Gerar e verificar/ }).click();
await p.getByText(/Curso montado com o que passou a verificação|Nenhuma aula passou/).waitFor({ timeout: 120_000 });
const docIA = await p.locator('[data-curso-documento]').innerText();
ok(/Encontrada pela IA na internet/.test(docIA), 'documento: fonte pesquisada marcada');
ok(/Escrita pela IA, sem origem verificável/.test(docIA), 'documento: texto-base marcado');
ok(/não que essas fontes estão certas/.test(docIA), 'documento: aviso no relatório de verificação');
ok(/armazem\.example\.org\/inventario/.test(docIA), 'documento: link da fonte pesquisada');

ok(erros.length === 0, `sem erros na consola ${erros.join(' | ')}`);
await b.close();
console.log(falhas ? `\n${falhas} falha(s).` : '\nTudo certo.');
process.exit(falhas ? 1 : 0);
