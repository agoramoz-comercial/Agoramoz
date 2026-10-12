import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * QA do CRM operacional (pipeline e ficha), contra `pnpm start` com
 * `ADMIN_PREVIEW=on`:
 *
 *   ADMIN_PREVIEW=on pnpm start -p 3100
 *   BASE=http://127.0.0.1:3100 node .qa/crm-admin.mjs
 *
 * Visita /qa/crm (dados de exemplo, instante fixo 2026-10-12 10:00 Maputo) a
 * 390, 768 e 1440 px. Mede axe, scroll horizontal da página, as contagens das
 * vistas, a ordem, o quadro, o «por activar» e a cronologia em frases. Não
 * submete formulários: as acções exigem sessão.
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
    for (const v of graves) for (const n of v.nodes.slice(0, 3)) console.log(`      ${v.id}: ${n.target.join(' ')}`);
  } else ok(`${rotulo}: axe sem violações graves`);
}

async function semScrollHorizontal(p, rotulo) {
  const [sw, iw] = await p.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
  confere(sw <= iw, `${rotulo}: sem scroll horizontal na página`, `(${sw} > ${iw})`);
}

const tem = async (p, texto, opcoes) => (await p.getByText(texto, opcoes).count()) >= 1;
const vistas = (p) => p.getByRole('navigation', { name: 'Vistas do pipeline' });
const contagem = async (p, nome) => (await vistas(p).getByRole('link', { name: new RegExp(`^${nome}\\s*\\d`) }).innerText()).replace(/\D+/g, '');

const ECRAS = [
  {
    q: '',
    nome: 'lista',
    verifica: async (p) => {
      confere((await p.getByRole('heading', { level: 1, name: 'Pipeline' }).count()) === 1, 'h1 «Pipeline»');
      const esperadas = { Abertas: '7', 'As minhas': '4', Atrasadas: '1', 'Sem dono': '2', Paradas: '1', Todas: '9' };
      for (const [v, n] of Object.entries(esperadas)) confere((await contagem(p, v)) === n, `vista «${v}» conta ${n}`, `(lido ${await contagem(p, v)})`);
      confere((await vistas(p).locator('[aria-current="page"]').innerText()).startsWith('Abertas'), 'vista actual marcada (aria-current)');
      const linhas = p.locator('table tbody tr');
      confere((await linhas.count()) === 7, '7 linhas na vista Abertas', `(${await linhas.count()})`);
      confere((await linhas.first().innerText()).includes('Exemplo Carla Nhantumbo'), 'ordem por próxima acção: a atrasada primeiro');
      confere((await p.locator('th[aria-sort="ascending"]').textContent()).includes('Próxima acção'), 'cabeçalho «Próxima acção» com aria-sort=ascending');
      confere(await tem(p, /1\s550\s000,00\s*MZN/), 'valor registado: MZN somado (350 000 + 1 200 000), sem câmbio');
      confere(await tem(p, /42\s000,00\s*US\$/), 'valor registado: USD à parte');
      confere((await p.getByRole('button', { name: /^Atribuir a mim/ }).count()) === 2, '«Atribuir a mim» nas 2 sem dono');
      confere(await tem(p, 'Atrasada', { exact: false }), 'estado «Atrasada» por extenso (não só cor)');
    },
  },
  {
    q: '?ordem=valor&sentido=desc',
    nome: 'lista por valor',
    verifica: async (p) => {
      const nomes = await p.locator('table tbody tr td:first-child a').allInnerTexts();
      confere(
        nomes.slice(0, 4).join('|') === 'Exemplo Lúcia Cossa|Exemplo Rui Tembe|Exemplo Carla Nhantumbo|Exemplo Sofia Macuácua',
        'valor: EUR, depois MZN (maior primeiro), depois USD; sem valor no fim',
        `(${nomes.slice(0, 4).join('|')})`,
      );
      confere((await p.locator('th[aria-sort="descending"]').textContent()).includes('Valor'), 'cabeçalho «Valor» com aria-sort=descending');
    },
  },
  {
    q: '?vista=sem-dono',
    nome: 'sem dono',
    verifica: async (p) => {
      confere((await p.locator('table tbody tr').count()) === 2, 'vista «Sem dono»: 2 linhas');
    },
  },
  {
    q: '?modo=quadro',
    nome: 'quadro',
    verifica: async (p) => {
      const colunas = await p.getByRole('list', { name: 'Quadro por fase' }).locator(':scope > li h2').allInnerTexts();
      confere(colunas.length === 4, 'quadro das abertas: 4 colunas (sem ganho nem perdido)', `(${colunas.length})`);
      confere((await p.getByRole('button', { name: /^Mover / }).count()) === 7, '«Mover» em cada um dos 7 cartões, com nome acessível próprio');
      confere(await tem(p, /1\s200\s000,00\s*MZN/), 'total da coluna «Proposta» em MZN');
    },
  },
  {
    q: '?modo=quadro&vista=todas',
    nome: 'quadro todas',
    verifica: async (p) => {
      const n = await p.getByRole('list', { name: 'Quadro por fase' }).locator(':scope > li').count();
      confere(n === 6, 'vista «Todas»: 6 colunas', `(${n})`);
    },
  },
  {
    q: '?ecra=por-activar',
    nome: 'por activar',
    verifica: async (p) => {
      confere(await tem(p, /por activar/), 'aviso «por activar» com o passo que falta');
      confere(await tem(p, 'aplicar-0019-parte1.sql', { exact: false }), 'o aviso diz o ficheiro a aplicar');
      confere(!(await tem(p, 'Valor registado')), 'sem totais inventados');
    },
  },
  {
    q: '?ecra=ficha',
    nome: 'ficha',
    verifica: async (p) => {
      confere(await tem(p, 'Próximo passo'), 'faixa «Próximo passo»');
      confere(await tem(p, 'Enviar resumo do diagnóstico'), 'próxima acção descrita');
      confere(await tem(p, 'Fase: Novo → Qualificação'), 'cronologia em frase: mudança de fase');
      confere(await tem(p, 'Pelo diagnóstico aprovado', { exact: false }), 'origem automática da mudança de fase');
      confere(await tem(p, 'Responsável: ninguém → Exemplo Gerson'), 'atribuição com nomes, não UUIDs');
      confere(!(await tem(p, /0{8}-0{4}-4000/)), 'nenhum UUID visível');
      confere((await p.getByRole('radio').count()) === 4, 'compositor com 4 tipos (nota, chamada, email, reunião)');
      confere((await p.locator('details#perder').getAttribute('open')) === null, '«Marcar como perdida» fechado por omissão');
      confere(await tem(p, 'Atribuir a outra pessoa'), 'atribuir a outra pessoa disponível');
      const diag = p.getByRole('complementary', { name: 'Propriedades' }).getByRole('link', { name: /B · 640 pontos/ });
      confere((await diag.count()) === 1, 'ligação ao diagnóstico');
    },
  },
  {
    q: '?ecra=ficha&perder=1',
    nome: 'ficha perder',
    verifica: async (p) => {
      confere((await p.locator('details#perder').getAttribute('open')) !== null, '?perder=1 abre o formulário do motivo');
      confere((await p.locator('select[name="motivo"] option').count()) === 8, 'motivo: 7 opções + «Escolha o motivo»');
    },
  },
  {
    q: '?ecra=perdida',
    nome: 'perdida',
    verifica: async (p) => {
      confere(await tem(p, 'Perdida — Outro: Optaram por desenvolver internamente'), 'faixa com o motivo e a nota');
    },
  },
  {
    q: '?ecra=hoje',
    nome: 'hoje',
    verifica: async (p) => {
      confere((await p.getByRole('heading', { level: 1, name: 'Hoje' }).count()) === 1, 'h1 «Hoje»');
      confere(await tem(p, 'Segunda-feira, 12 de outubro de 2026', { exact: false }) || await tem(p, 'segunda-feira, 12 de outubro de 2026', { exact: false }), 'data de Maputo por extenso');
      const resumo = p.getByRole('navigation', { name: 'Resumo do dia' });
      const valor = async (texto) => (await resumo.getByRole('link', { name: new RegExp(texto) }).innerText()).replace(/\D+/g, '');
      const esperados = { Atrasadas: '1', 'Para hoje': '0', 'Esta semana': '1', Paradas: '1', 'Sem dono': '2', 'Por rever': '2' };
      for (const [t, n] of Object.entries(esperados)) confere((await valor(t)) === n, `indicador «${t}» = ${n}`, `(lido ${await valor(t)})`);
      confere((await resumo.getByRole('link', { name: /Atrasadas/ }).getAttribute('href')) === '/admin/oportunidades?vista=atrasadas&dono=00000000-0000-4000-8000-0000000000a1', 'Atrasadas leva às minhas atrasadas no pipeline');
      confere((await resumo.getByRole('link', { name: /Por rever/ }).getAttribute('href')) === '/admin/diagnosticos?estado=por-rever', 'Por rever leva aos diagnósticos por rever');
      const triagem = await p.locator('#sem-dono li a').allInnerTexts();
      confere(triagem[0] === 'Exemplo João Muianga', 'triagem: a classificação A primeiro, mesmo sendo mais antiga', `(${triagem.join('|')})`);
      confere((await p.locator('#sem-dono').getByRole('button', { name: /^Atribuir a mim/ }).count()) === 2, '«Atribuir a mim» em cada lead sem dono');
      confere((await p.locator('#atrasadas li').count()) === 1 && (await p.locator('#atrasadas').innerText()).includes('Exemplo Carla Nhantumbo'), 'atrasada: a da Carla');
      confere(!(await p.locator('#atrasadas').innerText()).includes('Exemplo Pedro Langa'), 'a acção de hoje da Ana não entra na minha fila');
      confere((await p.locator('#paradas').innerText()).includes('Exemplo Rui Tembe'), 'parada há mais de 14 dias: Rui Tembe');
      confere((await p.locator('#reunioes li').count()) === 1, 'uma reunião nos próximos 7 dias');
      confere((await p.locator('#atrasadas').getByRole('link', { name: /^Actualizar a próxima acção/ }).getAttribute('href')).endsWith('#proxima'), '«Actualizar» abre a ficha na próxima acção');
    },
  },
  {
    q: '?ecra=hoje-vazio',
    nome: 'hoje vazio',
    verifica: async (p) => {
      confere(await tem(p, 'Nada atrasado nem para hoje.'), 'fila vazia diz-o');
      confere(await tem(p, 'Todos os leads têm dono.'), 'sem dono vazio diz-o');
      confere(await tem(p, 'Nenhuma reunião marcada.'), 'sem reuniões diz-o');
    },
  },
  {
    q: '?ecra=hoje-por-activar',
    nome: 'hoje por activar',
    verifica: async (p) => {
      confere(await tem(p, /por activar/), 'aviso «por activar»');
      const paradas = await p.getByRole('navigation', { name: 'Resumo do dia' }).getByRole('link', { name: /Paradas/ }).innerText();
      confere(paradas.includes('—'), 'paradas «—» sem a 0019 (não um zero inventado)');
      confere((await p.locator('#sem-dono li').count()) === 2, 'sem dono funciona antes da 0019');
    },
  },
  {
    q: '?ecra=contacto',
    nome: 'contacto 360',
    verifica: async (p) => {
      confere((await p.getByRole('heading', { level: 1, name: 'Exemplo Carla Nhantumbo' }).count()) === 1, 'h1 com o nome do contacto');
      const resumo = await p.locator('main dl').first().innerText();
      confere(/Oportunidades abertas\s*1/i.test(resumo) && /Ganhas\s*1/i.test(resumo), 'resumo: 1 aberta e 1 ganha', `(${resumo.replace(/\s+/g, ' ')})`);
      confere(/350\s000,00\s*MZN/.test(resumo), 'valor em aberto só das abertas (350 000 MZN, não 470 000)');
      const cons = p.locator('section[aria-labelledby="consentimento"]');
      confere((await cons.innerText()).includes('Contacto comercial (diagnóstico)') && (await cons.getByText('Concedido', { exact: true }).count()) === 1, 'consentimento comercial (por extenso): Concedido');
      confere((await cons.getByText('Retirado', { exact: true }).count()) === 1, 'inquérito: Retirado (vale a retirada, não o registo original)');
      const linha = await p.locator('section[aria-labelledby="linha-temporal"]').innerText();
      for (const t of ['Submeteu o diagnóstico', 'Consentimento retirado: Inquérito', 'Fase: Novo → Qualificação', 'Reunião marcada', 'Oportunidade criada']) {
        confere(linha.includes(t), `linha temporal: «${t}»`);
      }
      confere(!(await tem(p, /0{8}-0{4}-4000/)), 'nenhum UUID visível');
      confere(linha.split('Reunião marcada').length === 2, 'a reunião aparece uma só vez');
    },
  },
  {
    q: '?ecra=organizacao',
    nome: 'organização 360',
    verifica: async (p) => {
      const ligadas = p.locator('section[aria-labelledby="ligadas"]');
      confere((await ligadas.getByRole('link', { name: 'Exemplo Carla Nhantumbo' }).count()) === 1 && (await ligadas.getByRole('link', { name: 'Exemplo Paulo Chissano' }).count()) === 1, 'oportunidades com o nome de cada pessoa');
      confere((await p.locator('section[aria-labelledby="linha-temporal"]').innerText()).includes('Exemplo Carla Nhantumbo'), 'linha temporal diz de quem é cada entrada');
    },
  },
  {
    q: '?ecra=responsaveis',
    nome: 'por responsável',
    verifica: async (p) => {
      const linhas = p.locator('section[aria-labelledby="painel-responsaveis"] tbody tr');
      confere((await linhas.count()) === 3, '3 linhas: Gerson, Ana, Sem dono', `(${await linhas.count()})`);
      const gerson = (await linhas.nth(0).innerText()).replace(/\s+/g, ' ');
      confere(gerson.startsWith('Exemplo Gerson 4 1 1 1'), 'Gerson: 4 abertas, 1 atrasada, 1 parada, 1 ganha no período', `(${gerson})`);
      confere((await linhas.nth(2).innerText()).startsWith('Sem dono'), '«Sem dono» no fim');
      const href = await linhas.nth(0).getByRole('link', { name: '4' }).getAttribute('href');
      confere(href === '/admin/oportunidades?dono=00000000-0000-4000-8000-0000000000a1', 'abertas levam ao pipeline filtrado pelo dono', `(${href})`);
      const atr = await linhas.nth(0).getByRole('link').nth(1).getAttribute('href');
      confere(atr?.startsWith('/admin/oportunidades?vista=atrasadas&dono='), 'atrasadas levam à vista atrasadas desse dono');
    },
  },
  {
    q: '?dono=00000000-0000-4000-8000-0000000000a1',
    nome: 'pipeline por dono',
    verifica: async (p) => {
      confere(await tem(p, 'Responsável: Exemplo Gerson'), 'rótulo do responsável filtrado');
      confere((await p.locator('table tbody tr').count()) === 4, 'só as 4 abertas do Gerson', `(${await p.locator('table tbody tr').count()})`);
      confere((await p.getByRole('link', { name: 'Limpar', exact: true }).getAttribute('href')) === '/admin/oportunidades', '«Limpar» tira o filtro de dono');
    },
  },
  {
    q: '?ecra=auditoria',
    nome: 'auditoria',
    verifica: async (p) => {
      confere((await p.locator('table tbody tr').count()) === 4, '4 registos');
      confere(await tem(p, 'Mudou a fase'), 'acção em português');
      confere(await tem(p, /stage:\s*novo → qualificacao/), 'o que mudou: antes → depois');
      confere(await tem(p, 'Lista do CRM · oportunidades'), 'exportação CSV registada com a lista');
      confere((await p.locator('table tbody tr').nth(3).innerText()).includes('Sistema'), 'acção do sistema identificada como «Sistema»');
      confere((await p.locator('table a[href^="/admin/oportunidades/"]').count()) === 2, 'objectos com ecrã têm ligação');
    },
  },
  {
    q: '?ecra=ficha',
    nome: 'ficha histórico',
    verifica: async (p) => {
      const h = p.locator('details', { hasText: 'Histórico de alterações' });
      confere((await h.locator('summary').innerText()).includes('2'), 'histórico: 2 alterações desta oportunidade');
      await h.locator('summary').click();
      confere((await h.innerText()).includes('valor: — → 350000'), 'histórico mostra antes → depois');
      confere((await h.getByRole('link', { name: 'Ver na auditoria' }).getAttribute('href'))?.includes('/admin/auditoria?entidade=deal&id='), 'admin: ligação à auditoria filtrada');
    },
  },
  {
    q: '',
    nome: 'exportar',
    verifica: async (p) => {
      const href = await p.getByRole('link', { name: 'Exportar CSV' }).getAttribute('href');
      confere(href === '/admin/oportunidades/exportar', 'botão «Exportar CSV» leva a mesma vista', `(${href})`);
    },
  },
];

for (const largura of [390, 768, 1440]) {
  console.log(`\n— ${largura}px`);
  const ctx = await b.newContext({ viewport: { width: largura, height: 900 }, reducedMotion: 'reduce' });
  const p = await ctx.newPage();
  for (const e of ECRAS) {
    const r = await p.goto(`${BASE}/qa/crm${e.q}`, { waitUntil: 'load' });
    if (r?.status() !== 200) {
      falha(`${e.nome}: HTTP ${r?.status()}`);
      continue;
    }
    await e.verifica(p);
    await semScrollHorizontal(p, e.nome);
    if (largura !== 768) await axe(p, `${e.nome} @${largura}`);
    if (['lista', 'quadro', 'ficha', 'hoje', 'contacto 360', 'auditoria'].includes(e.nome)) await p.screenshot({ path: `${SAIDA}/crm-${e.nome}-${largura}.png`, fullPage: true });
  }
  await paletaETeclado(ctx, largura);
  await ctx.close();
}

/** A paleta (⌘K) e os atalhos, sobre o ecrã Hoje de exemplo. */
async function paletaETeclado(ctx, largura) {
  const p = await ctx.newPage();
  const abrirHoje = () => p.goto(`${BASE}/qa/crm?ecra=hoje`, { waitUntil: 'load' });
  await abrirHoje();
  const dialogo = p.getByRole('dialog', { name: 'Pesquisa e comandos' });
  const campo = p.getByRole('combobox');

  await p.keyboard.press('Control+k');
  confere(await dialogo.isVisible(), `paleta @${largura}: Ctrl+K abre`);
  confere(await campo.evaluate((el) => el === document.activeElement), 'o foco fica no campo');
  confere((await p.getByRole('option').count()) >= 10, 'sem termo: lista de comandos');
  await axe(p, `paleta aberta @${largura}`);

  await campo.fill('rever');
  const rever = p.getByRole('option', { name: /Diagnósticos por rever/ });
  confere((await rever.count()) >= 1, 'comando «Diagnósticos por rever» encontrado');
  confere((await rever.first().innerText()).includes('g r'), 'o comando mostra o atalho g r');

  await campo.fill('banco');
  await p.getByRole('option', { name: /Exemplo Banco Comercial/ }).first().waitFor({ timeout: 5000 });
  confere((await p.getByRole('option', { name: /Exemplo Carla Nhantumbo/ }).count()) >= 1, 'pesquisa: a oportunidade da Carla (organização Banco)');
  const activoAntes = await campo.getAttribute('aria-activedescendant');
  await p.keyboard.press('ArrowDown');
  const activoDepois = await campo.getAttribute('aria-activedescendant');
  confere(activoAntes !== activoDepois && (await p.locator(`[id="${activoDepois}"]`).getAttribute('aria-selected')) === 'true', '↓ muda a opção activa (aria-activedescendant)');

  await campo.fill('zzzz');
  await p.waitForFunction(() => document.querySelector('[role="status"]')?.textContent?.includes('Sem resultados'), null, { timeout: 5000 }).catch(() => {});
  confere(((await p.getByRole('dialog').getByRole('status').textContent()) ?? '').includes('Sem resultados para «zzzz»'), 'sem resultados anunciado (role=status)');

  await p.keyboard.press('Escape');
  confere(!(await dialogo.isVisible()), 'Esc fecha');

  await p.getByRole('button', { name: 'Pesquisar' }).click();
  confere(await dialogo.isVisible(), 'o botão «Pesquisar» abre a paleta (rato e toque)');
  await p.keyboard.press('Escape');
  confere(await p.getByRole('button', { name: 'Pesquisar' }).evaluate((el) => el === document.activeElement), 'ao fechar, o foco volta ao botão');

  await p.locator('body').click({ position: { x: 5, y: 5 } }).catch(() => {});
  await p.keyboard.press('?');
  confere(await p.getByRole('dialog', { name: 'Atalhos de teclado' }).isVisible(), '? abre a ajuda dos atalhos');
  await axe(p, `ajuda dos atalhos @${largura}`);
  await p.keyboard.press('Escape');

  await p.keyboard.press('j');
  confere(await p.evaluate(() => document.activeElement?.hasAttribute('data-atalho-linha')), 'j põe o foco na primeira linha da lista');

  await p.getByRole('button', { name: 'Pesquisar' }).focus();
  await p.keyboard.press('g');
  await p.keyboard.press('p');
  await p.waitForURL(/\/admin\/oportunidades$/, { timeout: 5000 }).catch(() => {});
  confere(p.url().endsWith('/admin/oportunidades'), 'g p vai para o pipeline');

  await abrirHoje();
  await p.getByRole('button', { name: 'Pesquisar' }).click();
  await campo.fill('sofia');
  await p.keyboard.press('ArrowDown');
  await p.waitForTimeout(400);
  await p.getByRole('option', { name: /Exemplo Sofia Macuácua/ }).first().waitFor({ timeout: 5000 });
  await campo.press('Enter');
  await p.waitForURL(/\/admin\//, { timeout: 5000 }).catch(() => {});
  confere(/\/admin\/(oportunidades|contactos)\//.test(p.url()), 'Enter abre o resultado escolhido', `(${p.url()})`);

  // WCAG 2.1.4: os atalhos de uma tecla desligam-se, e a ajuda abre sem teclado.
  await abrirHoje();
  await p.getByRole('button', { name: 'Atalhos de teclado' }).click();
  const ajudaDlg = p.getByRole('dialog', { name: 'Atalhos de teclado' });
  confere(await ajudaDlg.isVisible(), 'botão «Atalhos de teclado» abre a ajuda (sem teclado)');
  await ajudaDlg.getByRole('checkbox', { name: /Atalhos de uma tecla/ }).uncheck();
  await p.keyboard.press('Escape');
  await p.reload({ waitUntil: 'load' });
  await p.locator('body').click({ position: { x: 5, y: 5 } }).catch(() => {});
  await p.keyboard.press('g');
  await p.keyboard.press('p');
  await p.waitForTimeout(600);
  confere(p.url().includes('/qa/crm'), 'com os atalhos desligados (guardado), g p não navega');
  await p.keyboard.press('Control+k');
  confere(await p.getByRole('dialog', { name: 'Pesquisa e comandos' }).isVisible(), 'Ctrl+K funciona sempre');
  await p.keyboard.press('Escape');
  await p.evaluate(() => localStorage.removeItem('admin.atalhos'));
  await p.close();
}

await b.close();
console.log(falhas ? `\n${falhas} falha(s)` : '\nTudo verde');
process.exit(falhas ? 1 : 0);
