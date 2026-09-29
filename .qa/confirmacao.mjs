import { chromium } from '@playwright/test';

/**
 * Verifica o ECRÃ DE CONFIRMAÇÃO do diagnóstico — a parte que mudou.
 *
 * A rota da API é interceptada e devolve 200 sem tocar na rede: não há
 * credenciais de Supabase neste contentor, e inventar uma não provaria nada
 * sobre a ingestão. O que este teste prova é só o que mudou — que a faixa
 * escolhida volta ao ecrã NA MOEDA DO PAÍS. A ingestão continua coberta pelos
 * testes de rota.
 */
const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox','--disable-dev-shm-usage'] });
let falhas = 0;

// Os três mercados de operação e três dos dez globais (lote D): um em moeda
// europeia não-euro, um em dólar, um africano. O país chega pelo `?pais=` —
// o mesmo caminho que o CTA de cada página /global/<pais> usa.
const MERCADOS = [['mz','MZN','Moçambique'], ['pt','€','Portugal'], ['br','R$','Brasil'],
                  ['ch','CHF','Suíça'], ['us','USD','Estados Unidos'], ['za','ZAR','África do Sul']];

for (const [pais, moeda, nome] of MERCADOS) {
  const ctx = await b.newContext({ viewport:{width:1440,height:1100} });
  const p = await ctx.newPage();
  await p.route('**/api/diagnostico', (r) => r.fulfill({ status:200, contentType:'application/json', body:'{"ok":true}' }));
  await p.goto(`http://127.0.0.1:3000/diagnostico?pais=${pais}`, { waitUntil:'networkidle' });
  await p.waitForTimeout(700);

  // O país tem de chegar escolhido, e no grupo certo.
  const escolhido = await p.locator('[role=radio][aria-checked=true]').first().innerText().catch(() => '');
  const preSel = escolhido.includes(nome);
  if (!preSel) falhas++;
  console.log(`${pais}: pré-selecção «${nome}» ${preSel ? '✓' : '✗ (' + escolhido + ')'}`);

  for (let passo = 0; passo < 8; passo++) {
    // Uma escolha por grupo de chips ainda sem selecção.
    for (const fs of await p.locator('fieldset:visible').all()) {
      // Os dois grupos de país partilham o mesmo campo: escolher no que está
      // vazio trocaria o mercado pré-selecionado. O país vem do URL.
      const grupo = await fs.locator('[role=radiogroup]').first().getAttribute('aria-label', { timeout: 300 }).catch(() => null);
      if (grupo === 'País de operação' || grupo === 'Global') continue;
      const radios = fs.locator('[role=radio]');
      if (!(await radios.count())) continue;
      if (await fs.locator('[role=radio][aria-checked=true]').count()) continue;
      await radios.first().click().catch(() => {});
    }
    for (const cb of await p.locator('[role=checkbox]:visible').all()) {
      if ((await cb.getAttribute('aria-checked')) !== 'true') { await cb.click().catch(()=>{}); break; }
    }
    for (const inp of await p.locator('input:visible:not([type=checkbox]), textarea:visible').all()) {
      const name = await inp.getAttribute('name');
      if (name === 'fax' || (await inp.inputValue())) continue;
      await inp.fill(
        name?.toLowerCase().includes('mail') ? 'gerson@agoramoz.com'
        : name?.toLowerCase().includes('phone') || name?.toLowerCase().includes('tele') ? '+258824780097'
        : name === 'company' ? 'Empresa de Verificação, Lda'
        : name === 'name' ? 'Gerson Samussene'
        : 'Descrição com detalhe suficiente para passar a validação do formulário de diagnóstico.'
      ).catch(()=>{});
    }
    for (const cb of await p.locator('input[type=checkbox]:visible').all()) await cb.check().catch(()=>{});

    // Dentro do <form> e pelo rótulo exacto. `/submeter/` apanhava a pergunta
    // do FAQ «Preciso de ter tudo definido antes de submeter?» e dava o
    // formulário por enviado no primeiro passo — erro do teste, não do site.
    const formulario = p.locator('form');
    const enviar = formulario.getByRole('button', { name: 'Enviar pedido' });
    if (await enviar.count() && await enviar.first().isVisible()) { await enviar.first().click(); break; }
    const seguinte = formulario.getByRole('button', { name: 'Continuar' });
    if (!(await seguinte.count())) break;
    await seguinte.first().click();
    await p.waitForTimeout(350);
  }

  await p.getByRole('status').waitFor({ timeout: 8000 }).catch(()=>{});
  const txt = await p.getByRole('status').innerText().catch(() => '(sem ecrã de confirmação)');
  const ok = txt.includes('Pedido recebido');
  const temMoeda = txt.includes(moeda);
  if (!ok || !temMoeda) falhas++;
  console.log(`${pais}: confirmação ${ok ? '✓' : '✗'} | faixa na moeda ${moeda}: ${temMoeda ? '✓' : '✗'}`);
  const linha = txt.split('\n').find((l) => l.includes(moeda));
  if (linha) console.log(`   → ${linha}`);
  await p.screenshot({ path: `.qa/v6-confirmacao-${pais}.png` });
  await ctx.close();
}
await b.close();
console.log(falhas ? `\n${falhas} FALHAS` : '\nTUDO PASSA');
process.exit(falhas ? 1 : 0);
