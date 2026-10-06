import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * QA do Espaço CEnO, contra `pnpm start` com `ADMIN_PREVIEW=on`:
 *
 *   ADMIN_PREVIEW=on pnpm start -p 3100
 *   BASE=http://127.0.0.1:3100 node .qa/energia-admin.mjs
 *
 * Visita /qa/energia nas cinco vistas (dados de exemplo) a 390, 768 e 1440 px.
 * Mede axe, scroll horizontal da página, a entrada «Espaço CEnO» na
 * navegação e o conteúdo essencial de cada vista. Não submete formulários:
 * as acções exigem sessão e módulo, e redireccionam para /admin sem eles.
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

const VISTAS = [
  {
    vista: 'painel',
    verifica: async (p) => {
      confere((await p.getByRole('heading', { level: 1, name: 'Espaço CEnO' }).count()) === 1, 'h1 «Espaço CEnO»');
      confere((await p.getByText('KPI principal', { exact: false }).count()) >= 1, 'KPI principal visível');
      confere((await p.getByText('Prioridade A sem Opportunity Memo').count()) >= 1, 'alerta «A sem memo»');
      confere((await p.getByText('Próxima acção em atraso').count()) >= 1, 'alerta de acção em atraso');
    },
  },
  {
    vista: 'vazio',
    verifica: async (p) => {
      confere((await p.getByText('Ainda sem oportunidades registadas').count()) === 1, 'estado vazio honesto');
    },
  },
  {
    vista: 'ficha',
    verifica: async (p) => {
      confere((await p.getByRole('heading', { level: 1 }).count()) === 1, 'um só h1');
      for (const t of ['Etapa', 'Score de qualificação', 'Stakeholders', 'Opportunity Memo'])
        confere((await p.getByRole('heading', { name: t, exact: false }).count()) >= 1, `secção «${t}»`);
      confere((await p.getByRole('combobox', { name: /dor econ/i }).count()) === 1, 'critério «Dor económica» com rótulo');
    },
  },
  {
    vista: 'qualificada',
    verifica: async (p) => {
      confere((await p.getByRole('heading', { name: /sala/i }).count()) >= 1, 'sala de oportunidade visível');
      confere((await p.getByText('Resumo executivo').count()) >= 1, 'pasta 1 «Resumo executivo»');
      confere((await p.getByText('Atas e decisões').count()) >= 1, 'pasta 12 «Atas e decisões»');
    },
  },
  {
    vista: 'manual',
    verifica: async (p) => {
      for (const t of ['Etapas e critérios de passagem', 'Direitos de decisão', 'Reuniões operacionais', 'Plano de 30 dias'])
        confere((await p.getByRole('heading', { name: t }).count()) === 1, `secção «${t}»`);
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
    if (/\/admin[?/#]|\/admin$/.test(m.location().url ?? '')) return;
    erros.push(`${m.text()} ${m.location().url ?? ''}`);
  });

  for (const { vista, verifica } of VISTAS) {
    console.log(` · ${vista}`);
    const r = await p.goto(`${BASE}/qa/energia?vista=${vista}`, { waitUntil: 'load' });
    confere(r?.status() === 200, 'responde 200', `(${r?.status()})`);
    const larguraDoc = await p.evaluate(() => document.documentElement.scrollWidth);
    confere(larguraDoc <= largura, 'sem scroll horizontal', `${larguraDoc} > ${largura}`);
    confere(
      (await p.getByRole('link', { name: 'Espaço CEnO' }).count()) >= 1,
      'entrada «Espaço CEnO» na navegação (com o módulo)',
    );
    await verifica(p);
    await axe(p, vista);
    await p.screenshot({ path: `${SAIDA}/energia-${vista}-${largura}.png`, fullPage: true });
  }

  if (largura === 1440) {
    console.log(' · rascunho (o que se escreveu sobrevive a um erro)');
    await p.goto(`${BASE}/qa/energia?vista=ficha`, { waitUntil: 'load' });
    const campo = p.locator('textarea[name="solucao"]');
    await campo.fill('Texto do memo que ainda não foi gravado.');
    // O redireccionamento de uma acção com erro volta à mesma página com ?erro=.
    await p.goto(`${BASE}/qa/energia?vista=ficha&erro=Teste`, { waitUntil: 'load' });
    await p.waitForTimeout(300);
    confere(
      (await campo.inputValue()) === 'Texto do memo que ainda não foi gravado.',
      'depois de um erro, o memo escrito volta ao campo',
    );
    confere((await p.getByText('Repusemos o que tinha escrito').count()) >= 1, 'e diz que o repôs');
    // Gravado com sucesso (submit marca o formulário; ?ok= limpa o rascunho dele).
    await p.evaluate(() => sessionStorage.setItem('ceno:enviado', 'memo-00000000-0000-4000-8000-000000000001'));
    await p.goto(`${BASE}/qa/energia?vista=ficha&ok=memo`, { waitUntil: 'load' });
    await p.waitForTimeout(300);
    confere(
      (await p.evaluate(() => sessionStorage.getItem('ceno:rascunho:memo-00000000-0000-4000-8000-000000000001'))) === null,
      'depois de gravar, o rascunho desse bloco é apagado',
    );
  }

  confere(erros.length === 0, 'sem erros na consola', erros.slice(0, 3).join(' | '));
  await ctx.close();
}

await b.close();
console.log(falhas ? `\n${falhas} falha(s)` : '\ntudo verde');
process.exit(falhas ? 1 : 0);
