/**
 * QA da fila «A facturar» (pré-visualização `/qa/facturacao`, ADMIN_PREVIEW=on).
 * node .qa/facturacao.mjs http://127.0.0.1:3111 [pasta-das-capturas]
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
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const p = await (await b.newContext({ viewport: { width: 1440, height: 1000 } })).newPage();
const erros = [];
p.on('console', (m) => m.type() === 'error' && !/upgrade-insecure|status of 404/.test(m.text()) && erros.push(m.text()));
const plano = (t) => t.replace(/[  ]/g, ' ');

await p.goto(`${BASE}/qa/facturacao`);
const t = plano(await p.locator('main').innerText());
ok(/Organização de exemplo A/.test(t) && /Organização de exemplo C/.test(t), 'fila: ganhas por facturar, incluindo a anulada');
ok(!/Organização de exemplo D/.test(t), 'fila: a facturada não está em «Por facturar»');
ok(/1 735 000 MZN · 5 000 USD/.test(t), 'totais por moeda, sem somar moedas');
ok(/1 sem valor no Pipeline/.test(t), 'oportunidade sem valor contada à parte');
ok(/há 24 dias/.test(t), 'há quantos dias está por facturar');
await p.getByText('Registar factura').first().click();
ok(await p.getByRole('button', { name: 'Marcar como facturada' }).first().isVisible(), 'registar: formulário abre');
ok((await p.locator('input[name="valor"]').first().inputValue()) === '1735000', 'registar: valor sugerido do Pipeline');
const axe = await new AxeBuilder({ page: p }).analyze();
ok(graves(axe).length === 0, `axe ${graves(axe).map((v) => `${v.id}(${v.nodes.length})`).join(',')}`);
if (SAIDA) await p.screenshot({ path: `${SAIDA}/facturacao.png`, fullPage: true });

await p.goto(`${BASE}/qa/facturacao?estado=facturadas`);
const f = await p.locator('main').innerText();
ok(/FT 2026\/008/.test(f) && /Anular/.test(f), 'facturadas: número e anular');
await p.goto(`${BASE}/qa/facturacao?registo=off`);
const off = await p.locator('main').innerText();
ok(/registar facturas está por activar/.test(off) && (await p.getByText('Registar factura', { exact: true }).count()) === 0, 'sem a 0021: mostra a fila, não regista, diz o passo');
ok(erros.length === 0, `sem erros na consola ${erros.join(' | ')}`);
await b.close();
console.log(falhas ? `\n${falhas} falha(s).` : '\nTudo certo.');
process.exit(falhas ? 1 : 0);
