import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * QA do diagnóstico em carrossel, contra `pnpm start`.
 *
 *   BASE=http://127.0.0.1:3100 node .qa/diagnostico.mjs
 *
 * O envio é interceptado (200 sem tocar na base) e os eventos de analítica
 * são lidos na rede — nenhum lead nem evento real é criado. Dados sintéticos.
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

async function contexto(largura) {
  const ctx = await b.newContext({ viewport: { width: largura, height: 900 }, reducedMotion: 'reduce', hasTouch: true });
  const p = await ctx.newPage();
  const erros = [];
  const eventos = [];
  let envio = null;
  p.on('pageerror', (e) => erros.push(e.message));
  await p.route('**/api/eventos', async (r) => {
    try {
      eventos.push(JSON.parse(r.request().postData() ?? '{}').evento?.name);
    } catch {
      /* corpo ilegível */
    }
    await r.fulfill({ status: 204 });
  });
  await p.route('**/api/diagnostico', async (r) => {
    envio = JSON.parse(r.request().postData() ?? '{}');
    await r.fulfill({ status: 202, contentType: 'application/json', body: '{"ok":true}' });
  });
  return { ctx, p, erros, eventos, envio: () => envio };
}

const titulo = (p, nivel = 2) => p.locator(`form h${nivel}`).first();
async function esperarTitulo(p, texto, nivel = 2) {
  await p.waitForFunction(
    ([n, t]) => document.querySelector(`form h${n}`)?.textContent?.includes(t),
    [nivel, texto],
    { timeout: 5000 },
  );
}

async function axe(p, rotulo) {
  const r = await new AxeBuilder({ page: p }).include('form').analyze();
  const graves = r.violations.filter((v) => ['serious', 'critical'].includes(v.impact));
  if (graves.length) falha(`${rotulo}: axe ${graves.map((v) => v.id).join(', ')}`);
  else ok(`${rotulo}: axe sem violações graves`);
}

for (const [nome, largura] of [['mobile', 390], ['tablet', 768], ['web', 1440]]) {
  console.log(`\n/diagnostico — ${nome} (${largura}px)`);
  const { ctx, p, erros, eventos, envio } = await contexto(largura);
  await p.goto(`${BASE}/diagnostico`, { waitUntil: 'networkidle' });

  await esperarTitulo(p, 'Onde opera a sua empresa?');
  const progresso = await p.locator('form p').first().textContent();
  progresso?.includes('1 de 9') ? ok('começa em «Pergunta 1 de 9»') : falha(`progresso inicial: ${progresso}`);
  await axe(p, 'cartão país');

  // As setas só percorrem as opções — não avançam.
  await p.getByRole('radio', { name: 'Moçambique' }).focus();
  await p.keyboard.press('ArrowRight');
  await p.waitForTimeout(600);
  (await titulo(p).textContent())?.includes('Onde opera')
    ? ok('setas não avançam o cartão (WCAG 3.2.2)')
    : falha('as setas avançaram o cartão');

  // Clique numa escolha única avança sozinho.
  await p.getByRole('radio', { name: 'Moçambique' }).click();
  await esperarTitulo(p, 'Em que setor?');
  ok('escolher o país avança para o setor');
  const focado = await p.evaluate(() => document.activeElement?.tagName);
  focado === 'H2' ? ok('o foco segue a pergunta nova') : falha(`foco em ${focado}`);

  await p.getByRole('radio').first().click();
  await esperarTitulo(p, 'O que pretende melhorar?');

  // Continuar sem escolher mostra o erro, sem avançar.
  await p.getByRole('button', { name: 'Continuar' }).click();
  (await p.getByRole('alert').count()) > 0 ? ok('processos vazio → erro visível') : falha('sem erro nos processos');
  await p.locator('input[type=checkbox]').first().check();

  // Deslizar para a esquerda (toque) avança, com validação.
  const caixa = await titulo(p).boundingBox();
  if (caixa) {
    await p.evaluate(
      ([x0, x1, yy]) => {
        const alvo = document.querySelector('form h2')?.parentElement;
        const ev = (tipo, x) =>
          new PointerEvent(tipo, { bubbles: true, pointerType: 'touch', clientX: x, clientY: yy, isPrimary: true });
        alvo?.dispatchEvent(ev('pointerdown', x0));
        alvo?.dispatchEvent(ev('pointerup', x1));
      },
      [caixa.x + caixa.width - 10, caixa.x + 10, caixa.y + 10],
    );
  }
  await esperarTitulo(p, 'Quantas pessoas');
  ok('deslizar para a esquerda avança');

  // ← na pergunta volta; → avança de novo.
  await titulo(p).focus();
  await p.keyboard.press('ArrowLeft');
  await esperarTitulo(p, 'O que pretende melhorar?');
  await titulo(p).focus();
  await p.keyboard.press('ArrowRight');
  await esperarTitulo(p, 'Quantas pessoas');
  ok('← e → na pergunta navegam');

  for (const proximo of ['Quando quer decidir?', 'Qual é o seu papel', 'Que investimento']) {
    await p.getByRole('radio').first().click();
    await esperarTitulo(p, proximo);
  }
  (await titulo(p).textContent())?.includes('MZN') ? ok('a faixa mostra a moeda do mercado') : falha('faixa sem moeda');
  await p.getByRole('radio').nth(1).click();
  await esperarTitulo(p, 'Quer contar-nos');

  const saltar = await p.getByRole('button', { name: 'Saltar' }).count();
  saltar === 1 ? ok('texto livre vazio → botão «Saltar»') : falha('sem «Saltar» no texto livre');
  await p.getByRole('button', { name: 'Saltar' }).click();
  await esperarTitulo(p, 'Como o contactamos?');
  const prog9 = await p.locator('form p').first().textContent();
  prog9?.includes('9 de 9') ? ok('contacto é a pergunta 9 de 9') : falha(`progresso final: ${prog9}`);

  // Envio vazio: erros no próprio cartão.
  await p.getByRole('button', { name: 'Enviar pedido' }).click();
  await p.waitForTimeout(300);
  (await p.locator('[aria-invalid=true]').count()) >= 4 ? ok('envio vazio marca os campos') : falha('envio vazio sem erros');
  await axe(p, 'cartão contacto com erros');

  // Pontos de progresso: voltar ao primeiro e regressar ao último.
  await p.getByRole('button', { name: /Ir para a pergunta 1:/ }).click();
  await esperarTitulo(p, 'Onde opera a sua empresa?');
  await p.getByRole('button', { name: /Ir para a pergunta 9:/ }).click();
  await esperarTitulo(p, 'Como o contactamos?');
  ok('os pontos levam a cartões já vistos');

  // → no último cartão não faz nada (só o envio o conclui).
  await titulo(p).focus();
  await p.keyboard.press('ArrowRight');
  await p.waitForTimeout(300);
  (await titulo(p).textContent())?.includes('Como o contactamos') ? ok('→ no contacto não avança') : falha('→ no contacto mexeu');

  // Um obrigatório esvaziado noutro cartão: o envio leva até ele, com foco nos erros.
  await p.getByRole('button', { name: /Ir para a pergunta 3:/ }).click();
  await esperarTitulo(p, 'O que pretende melhorar?');
  await p.locator('input[type=checkbox]:checked').first().uncheck();
  await p.getByRole('button', { name: /Ir para a pergunta 9:/ }).click();
  await esperarTitulo(p, 'Como o contactamos?');
  await p.locator('input[autocomplete=name]').fill('Pessoa QA');
  await p.getByLabel('Email profissional').fill('qa@exemplo.test');
  await p.getByLabel('Telefone ou WhatsApp').fill('+258840000000');
  await p.getByLabel('Nome da empresa').fill('Empresa QA');
  await p.locator('input[type=checkbox][name=consent]').check();
  await p.getByRole('button', { name: 'Enviar pedido' }).click();
  await esperarTitulo(p, 'O que pretende melhorar?');
  await p.waitForTimeout(100);
  const papel = await p.evaluate(() => document.activeElement?.getAttribute('role'));
  papel === 'alert' ? ok('envio inválido salta para o cartão em falta, com foco nos erros') : falha(`foco depois do salto: ${papel}`);
  envio() ? falha('enviou com um obrigatório vazio') : ok('nada foi enviado');
  await p.locator('input[type=checkbox]').first().check();
  await p.getByRole('button', { name: /Ir para a pergunta 9:/ }).click();
  await esperarTitulo(p, 'Como o contactamos?');

  await p.locator('input[autocomplete=name]').fill('Pessoa QA');
  await p.getByLabel('Email profissional').fill('qa@exemplo.test');
  await p.getByLabel('Telefone ou WhatsApp').fill('+258840000000');
  await p.getByLabel('Nome da empresa').fill('Empresa QA');
  await p.locator('input[type=checkbox][name=consent]').check();
  await p.screenshot({ path: `${SAIDA}/diag-${nome}-contacto.png`, fullPage: false });
  await p.getByRole('button', { name: 'Enviar pedido' }).click();
  await p.getByText('Pedido recebido.').waitFor({ timeout: 5000 });
  ok('envio → «Pedido recebido.»');

  const corpo = envio();
  if (!corpo) falha('o envio não chegou à rota');
  else {
    corpo.problemImpact === '' ? ok('texto livre saltado vai como ""') : falha(`problemImpact: ${corpo.problemImpact}`);
    corpo.country === 'mz' && corpo.investmentBand && corpo.companySize === '1-9'
      ? ok('respostas completas no corpo')
      : falha(`corpo incompleto: ${JSON.stringify({ c: corpo.country, b: corpo.investmentBand, s: corpo.companySize })}`);
  }

  await p.waitForTimeout(300);
  const vistos = eventos.filter((e) => e === 'step_viewed').length;
  vistos === 9 ? ok('step_viewed: 9, um por cartão') : falha(`step_viewed: ${vistos}`);
  eventos.includes('diagnostic_started') && eventos.includes('diagnostic_submitted')
    ? ok('diagnostic_started e diagnostic_submitted enviados')
    : falha(`eventos: ${[...new Set(eventos)].join(', ')}`);

  const larguraDoc = await p.evaluate(() => document.documentElement.scrollWidth);
  larguraDoc > largura ? falha(`scroll horizontal (${larguraDoc}px)`) : ok('sem scroll horizontal');
  erros.length ? falha(`erros de página: ${erros.join(' | ')}`) : ok('sem erros de página');
  await ctx.close();
}

console.log('\nligação de país e setor');
{
  const { ctx, p } = await contexto(390);
  await p.goto(`${BASE}/diagnostico?pais=mz&setor=energia-mineracao`, { waitUntil: 'networkidle' });
  await esperarTitulo(p, 'O que pretende melhorar?');
  const prog = await p.locator('form p').first().textContent();
  prog?.includes('3 de 9') ? ok('começa na pergunta 3 de 9') : falha(`progresso: ${prog}`);
  await p.goto(`${BASE}/diagnostico?pais=mz&setor=inventado`, { waitUntil: 'networkidle' });
  await esperarTitulo(p, 'Em que setor?');
  ok('setor fora do mercado → pergunta o setor');
  await ctx.close();
}

console.log('\nmarcação da conversa no ecrã final (Cal.com simulado)');
{
  const LINK = `https://cal.com/agoramoz/conversa-30?metadata%5Bref%5D=${'R'.repeat(32)}`;
  for (const [rotulo, corpoResposta] of [
    ['com link', { ok: true, correlationId: 'qa', agendamento: { url: LINK } }],
    ['sem link', { ok: true, correlationId: 'qa' }],
    ['link não-https recusado', { ok: true, correlationId: 'qa', agendamento: { url: 'javascript:alert(1)' } }],
  ]) {
    const { ctx, p, eventos } = await contexto(390);
    await p.unroute('**/api/diagnostico');
    await p.route('**/api/diagnostico', (r) =>
      r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(corpoResposta) }),
    );
    await p.goto(`${BASE}/diagnostico?pais=mz&setor=energia-mineracao`, { waitUntil: 'networkidle' });
    await esperarTitulo(p, 'O que pretende melhorar?');
    await p.locator('input[type=checkbox]').first().check();
    await p.getByRole('button', { name: 'Continuar' }).click();
    for (const proximo of ['Quando quer decidir?', 'Qual é o seu papel', 'Que investimento', 'Quer contar-nos']) {
      await p.getByRole('radio').first().click();
      await esperarTitulo(p, proximo);
    }
    await p.getByRole('button', { name: 'Saltar' }).click();
    await esperarTitulo(p, 'Como o contactamos?');
    await p.locator('input[autocomplete=name]').fill('Pessoa QA');
    await p.getByLabel('Email profissional').fill('qa@exemplo.test');
    await p.getByLabel('Telefone ou WhatsApp').fill('+258840000000');
    await p.getByLabel('Nome da empresa').fill('Empresa QA');
    await p.locator('input[type=checkbox][name=consent]').check();
    await p.getByRole('button', { name: 'Enviar pedido' }).click();
    await p.getByText('Pedido recebido.').waitFor({ timeout: 5000 });

    const botao = p.getByRole('link', { name: 'Marcar a conversa agora' });
    const n = await botao.count();
    if (rotulo === 'com link') {
      if (n !== 1) falha('com link: botão de marcação em falta');
      else {
        const [href, alvo, rel] = await Promise.all([botao.getAttribute('href'), botao.getAttribute('target'), botao.getAttribute('rel')]);
        href === LINK && alvo === '_blank' && rel?.includes('noreferrer')
          ? ok('com link: botão abre o Cal noutro separador, sem Referer')
          : falha(`com link: atributos ${href} ${alvo} ${rel}`);
        await p.route('https://cal.com/**', (r) => r.fulfill({ status: 200, body: 'cal simulado' }));
        const [popup] = await Promise.all([ctx.waitForEvent('page'), botao.click()]);
        await popup.close();
        await p.waitForTimeout(300);
        eventos.includes('meeting_requested') ? ok('com link: clique regista meeting_requested') : falha('sem meeting_requested');
        await p.screenshot({ path: `${SAIDA}/diag-marcacao.png` });
        const r = await new AxeBuilder({ page: p }).include('[role=status]').analyze();
        const graves = r.violations.filter((v) => ['serious', 'critical'].includes(v.impact));
        graves.length ? falha(`ecrã final: axe ${graves.map((v) => v.id).join(', ')}`) : ok('ecrã final: axe sem violações graves');
      }
    } else {
      n === 0 ? ok(`${rotulo}: sem botão de marcação`) : falha(`${rotulo}: botão apareceu`);
    }
    await ctx.close();
  }
}

console.log('\n/en/diagnostico');
{
  const { ctx, p, erros } = await contexto(1440);
  await p.goto(`${BASE}/en/diagnostico`, { waitUntil: 'networkidle' });
  await esperarTitulo(p, 'Where does your company operate?');
  const prog = await p.locator('form p').first().textContent();
  prog?.includes('Question 1 of 9') ? ok('inglês: «Question 1 of 9»') : falha(`progresso EN: ${prog}`);
  await p.getByRole('radio', { name: 'Portugal' }).click();
  await esperarTitulo(p, 'In which sector?');
  ok('inglês: escolher avança');
  await axe(p, 'EN cartão setor');
  erros.length ? falha(`erros EN: ${erros.join(' | ')}`) : ok('sem erros de página');
  await ctx.close();
}

console.log('\npágina inicial — secção de diagnóstico');
for (const [nome, largura] of [['mobile', 390], ['web', 1440]]) {
  const { ctx, p, erros } = await contexto(largura);
  await p.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  const antes = await p.locator('#diagnostico form').count();
  antes === 0 ? ok(`${nome}: o carrossel não carrega no topo da página`) : falha(`${nome}: carregou antes de ser preciso`);
  await p.locator('#diagnostico').scrollIntoViewIfNeeded();
  await p.waitForFunction(() => document.querySelector('#diagnostico form h3')?.textContent?.includes('Onde opera'), null, {
    timeout: 8000,
  });
  ok(`${nome}: carrega ao chegar à secção, com a pergunta em h3`);
  await p.locator('#diagnostico').getByRole('radio', { name: 'Brasil' }).click();
  await p.waitForFunction(() => document.querySelector('#diagnostico form h3')?.textContent?.includes('Em que setor'));
  ok(`${nome}: avança dentro da secção`);
  await p.locator('#diagnostico').screenshot({ path: `${SAIDA}/diag-home-${nome}.png` });
  const r = await new AxeBuilder({ page: p }).include('#diagnostico').analyze();
  const graves = r.violations.filter((v) => ['serious', 'critical'].includes(v.impact));
  graves.length ? falha(`${nome}: axe ${graves.map((v) => v.id).join(', ')}`) : ok(`${nome}: axe sem violações graves`);
  const larguraDoc = await p.evaluate(() => document.documentElement.scrollWidth);
  larguraDoc > largura ? falha(`${nome}: scroll horizontal (${larguraDoc}px)`) : ok(`${nome}: sem scroll horizontal`);
  erros.length ? falha(`${nome}: erros ${erros.join(' | ')}`) : ok(`${nome}: sem erros de página`);
  await ctx.close();
}

await b.close();
console.log(falhas ? `\n${falhas} falha(s)` : '\nTudo verde');
process.exit(falhas ? 1 : 0);
