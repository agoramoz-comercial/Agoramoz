import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * QA do Gabinete do Fundador, contra `pnpm start` com `ADMIN_PREVIEW=on`:
 *
 *   ADMIN_PREVIEW=on pnpm start -p 3100
 *   BASE=http://127.0.0.1:3100 node .qa/gabinete-admin.mjs
 *
 * Visita /qa/gabinete em todas as vistas (dados de exemplo, dia fixo
 * 2026-10-11) a 390, 768 e 1440 px. Mede axe, scroll horizontal, a entrada
 * «Gabinete» na navegação, os números que os exemplos determinam e o
 * guarda-rascunho. Não submete formulários: as acções exigem sessão e módulo.
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

const tem = async (p, texto, opcoes) => (await p.getByText(texto, opcoes).count()) >= 1;

const VISTAS = [
  {
    vista: 'ceo',
    verifica: async (p) => {
      confere((await p.getByRole('heading', { level: 1, name: 'Gabinete do Fundador' }).count()) === 1, 'h1 «Gabinete do Fundador»');
      confere(await tem(p, '1 de 2 decisões recorrentes'), 'métrica de delegação: 1 de 2 (50 %)');
      confere(await tem(p, /1\s500\s000/), 'caixa MZN = saldo 1 200 000 + recebido 300 000');
      confere((await p.locator('section[aria-labelledby="em-risco"]').getByRole('link', { name: 'Exemplo — automação de propostas' }).count()) === 1, 'projecto com margem negativa em risco');
      confere(await tem(p, 'Margem negativa'), 'motivo «Margem negativa»');
      confere(await tem(p, 'Exemplo — preço do diagnóstico pago'), 'decisão «exige decisão minha» listada');
      confere(await tem(p, 'O CRM não regista valor', { exact: false }), 'pipeline diz que é contagem, não dinheiro');
    },
  },
  {
    vista: 'vazio',
    verifica: async (p) => {
      confere(await tem(p, 'Sem saldo de partida', { exact: false }), 'caixa vazia honesta (sem saldo inventado)');
      confere(await tem(p, 'Sem oportunidades no CRM'), 'pipeline vazio honesto');
      confere(await tem(p, 'Sem decisões recorrentes fechadas', { exact: false }), 'delegação sem dados → explica, não inventa 0 %');
    },
  },
  {
    vista: 'cto',
    verifica: async (p) => {
      confere((await p.getByRole('heading', { level: 1, name: 'Painel CTO' }).count()) === 1, 'h1 «Painel CTO»');
      confere(await tem(p, 'Exemplo — padrão de ambientes de staging'), 'decisão técnica em aberto');
      confere(await tem(p, /Falta: Contrato ou autorização formal/), 'critérios de prontidão em falta');
      confere(await tem(p, 'Sobrealocada'), 'Pessoa A sobrealocada (46 h de 40 h)');
    },
  },
  {
    vista: 'decisoes',
    verifica: async (p) => {
      for (const t of ['Exige decisão minha', 'Pode ser delegada', 'Decidida'])
        confere((await p.getByRole('heading', { name: t, exact: false }).count()) === 1, `grupo «${t}»`);
      confere(await tem(p, 'Revisão em atraso'), 'decisão com revisão em atraso marcada');
    },
  },
  {
    vista: 'decisao',
    verifica: async (p) => {
      confere((await p.getByRole('combobox', { name: 'Chapéu' }).count()) === 1, 'campo «Chapéu» com rótulo');
      confere((await p.getByRole('combobox', { name: 'Quem decidiu' }).count()) === 1, 'campo «Quem decidiu» com rótulo');
      confere((await p.getByRole('button', { name: 'Guardar decisão' }).count()) === 1, 'botão «Guardar decisão»');
    },
  },
  {
    vista: 'prioridades',
    verifica: async (p) => {
      for (const t of ['Empresarial', 'Comercial', 'Operacional', 'Tecnológica', 'Liderança pessoal'])
        confere((await p.getByRole('heading', { level: 2, name: t }).count()) === 1, `prioridade «${t}»`);
      confere((await p.getByRole('button', { name: 'Guardar prioridade' }).count()) === 2, 'duas prioridades já definidas');
    },
  },
  {
    vista: 'projetos',
    verifica: async (p) => {
      confere((await p.getByRole('link', { name: 'Exemplo — portal de pedidos' }).count()) === 1, 'projecto listado');
      confere(await tem(p, '42 %'), 'margem 380 000 / 900 000 = 42 %');
    },
  },
  {
    vista: 'projeto',
    verifica: async (p) => {
      confere(await tem(p, /Para implementar falta/), 'gate de implementação explicado');
      confere((await p.getByRole('checkbox', { name: 'Escopo aprovado' }).count()) === 1, 'critério «Escopo aprovado» com rótulo');
      confere((await p.getByRole('heading', { name: 'Capacidade alocada' }).count()) === 1, 'secção de alocações');
    },
  },
  {
    vista: 'tesouraria',
    verifica: async (p) => {
      confere(await tem(p, 'Vencido'), 'recebimento previsto a 5/10 está vencido');
      confere((await p.getByRole('button', { name: /Marcar realizado hoje/ }).count()) === 2, 'marcar realizado só nos dois por realizar');
    },
  },
  {
    vista: 'capacidade',
    verifica: async (p) => {
      confere(await tem(p, /54 h/), 'comprometidas 46 + 8 = 54 h');
      confere((await p.getByRole('button', { name: 'Acrescentar pessoa' }).count()) === 1, 'acrescentar pessoa');
    },
  },
  {
    vista: 'manual',
    verifica: async (p) => {
      for (const t of ['Os três chapéus', 'Matriz de autoridade', 'Reuniões', 'Plano de 30 dias', 'O que não fazer'])
        confere((await p.getByRole('heading', { level: 2, name: t }).count()) === 1, `secção «${t}»`);
    },
  },
];

for (const largura of [390, 768, 1440]) {
  console.log(`\n${largura} px`);
  const ctx = await b.newContext({ viewport: { width: largura, height: 900 }, reducedMotion: 'reduce' });
  const p = await ctx.newPage();
  const erros = [];
  p.on('pageerror', (e) => erros.push(e.message));
  p.on('console', (m) => {
    if (m.type() !== 'error') return;
    if (/report-only/.test(m.text())) return;
    // Pré-carregamentos de /admin/* respondem 404 nesta instância (sem sessão).
    if (/\/admin[?/#]|\/admin$|\/admin\//.test(m.location().url ?? '')) return;
    erros.push(`${m.text()} ${m.location().url ?? ''}`);
  });

  for (const { vista, verifica } of VISTAS) {
    console.log(` · ${vista}`);
    const r = await p.goto(`${BASE}/qa/gabinete?vista=${vista}`, { waitUntil: 'load' });
    confere(r?.status() === 200, 'responde 200', `(${r?.status()})`);
    const larguraDoc = await p.evaluate(() => document.documentElement.scrollWidth);
    confere(larguraDoc <= largura, 'sem scroll horizontal', `${larguraDoc} > ${largura}`);
    confere((await p.locator('nav[aria-label="Secções da administração"] a', { hasText: /^Gabinete$/ }).count()) >= 1, 'entrada «Gabinete» na navegação (com o módulo)');
    confere((await p.getByRole('link', { name: 'Espaço CEnO' }).count()) === 0, 'sem o módulo energia, sem «Espaço CEnO»');
    confere((await p.getByRole('heading', { level: 1 }).count()) === 1, 'um só h1');
    await verifica(p);
    await axe(p, vista);
    await p.screenshot({ path: `${SAIDA}/gabinete-${vista}-${largura}.png`, fullPage: true });
  }

  if (largura === 1440) {
    console.log(' · rascunho (o que se escreveu sobrevive a um erro, no espaço do gabinete)');
    await p.goto(`${BASE}/qa/gabinete?vista=decisao`, { waitUntil: 'load' });
    const campo = p.locator('textarea[name="contexto"]');
    await campo.fill('Contexto ainda por gravar.');
    await p.goto(`${BASE}/qa/gabinete?vista=decisao&erro=Teste`, { waitUntil: 'load' });
    await p.waitForTimeout(300);
    confere((await campo.inputValue()) === 'Contexto ainda por gravar.', 'depois de um erro, o contexto volta ao campo');
    const chaves = await p.evaluate(() => Object.keys(sessionStorage));
    confere(chaves.some((k) => k.startsWith('gabinete:rascunho:')), 'guardado com o prefixo do gabinete');
    confere(!chaves.some((k) => k.startsWith('ceno:')), 'nada no prefixo do Espaço CEnO');
  }

  confere(erros.length === 0, 'sem erros na consola', erros.slice(0, 3).join(' | '));
  await ctx.close();
}

await b.close();
console.log(falhas ? `\n${falhas} falha(s)` : '\ntudo verde');
process.exit(falhas ? 1 : 0);
