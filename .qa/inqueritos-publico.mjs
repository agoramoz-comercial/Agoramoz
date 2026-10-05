import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * QA da página de quem responde a um inquérito, contra `pnpm start` com
 * `ADMIN_PREVIEW=on`:
 *
 *   ADMIN_PREVIEW=on pnpm start -p 3100
 *   BASE=http://127.0.0.1:3100 node .qa/inqueritos-publico.mjs
 *
 * Visita /qa/inquerito (inquérito de exemplo, sem base). O envio para
 * /api/inqueritos e os eventos para /api/eventos são INTERCEPTADOS: nada sai
 * daqui. Percorre o inquérito inteiro por clique e teclado, mede axe em cada
 * tipo de cartão, e confere o corpo exacto que seria enviado.
 */
const BASE = process.env.BASE ?? 'http://127.0.0.1:3000';
const SAIDA = process.env.SAIDA ?? '.qa';
const UUID4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const TOKEN = 'QAqaQAqaQAqaQAqaQAqaQAqaQAqaQAqaQAqaQAqa_-0';

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

const tituloDoCartao = (p) => p.locator('form h2 span[id$="-titulo"]').textContent();
const focoNoTitulo = (p) => p.evaluate(() => document.activeElement?.tagName === 'H2');

async function preparar(ctx, { estadoEnvio = 200, corpoEnvio = { ok: true } } = {}) {
  const p = await ctx.newPage();
  const erros = [];
  const envios = [];
  const eventos = [];
  p.on('pageerror', (e) => erros.push(e.message));
  p.on('console', (m) => {
    if (m.type() !== 'error') return;
    if (/report-only/.test(m.text())) return;
    erros.push(`${m.text()} ${m.location().url ?? ''}`);
  });
  await p.route('**/api/inqueritos', async (rota) => {
    envios.push(JSON.parse(rota.request().postData() ?? 'null'));
    await rota.fulfill({
      status: estadoEnvio,
      contentType: 'application/json',
      body: JSON.stringify(corpoEnvio),
    });
  });
  await p.route('**/api/eventos', async (rota) => {
    eventos.push(rota.request().postData() ?? '');
    await rota.fulfill({ status: 204 });
  });
  return { p, erros, envios, eventos };
}

for (const largura of [390, 768, 1440]) {
  console.log(`\n${largura} px`);
  const ctx = await b.newContext({
    viewport: { width: largura, height: 900 },
    reducedMotion: 'reduce',
    hasTouch: largura < 1024,
  });
  const { p, erros, envios, eventos } = await preparar(ctx);

  const r = await p.goto(`${BASE}/qa/inquerito`, { waitUntil: 'load' });
  confere(r?.status() === 200, 'responde 200', `(${r?.status()})`);
  const h1 = await p.locator('h1').allTextContents();
  confere(h1.length === 1 && h1[0] === 'Como trabalha a sua equipa hoje', 'um h1, o título do inquérito', JSON.stringify(h1));
  confere((await p.locator('html').getAttribute('lang')) !== null, 'documento com lang');
  const larguraDoc = await p.evaluate(() => document.documentElement.scrollWidth);
  confere(larguraDoc <= largura, 'sem scroll horizontal (boas-vindas)', `${larguraDoc} > ${largura}`);
  await axe(p, 'boas-vindas');
  if (largura === 390) await p.screenshot({ path: `${SAIDA}/inquerito-boas-vindas-390.png`, fullPage: true });

  // 1. Começar → foco no título do primeiro cartão.
  await p.getByRole('button', { name: 'Começar' }).click();
  confere(await focoNoTitulo(p), 'Começar põe o foco no título do cartão');
  confere((await tituloDoCartao(p)) === 'A empresa usa um ERP?', 'primeiro cartão');
  await axe(p, 'escolha única');

  // 2. Continuar sem responder → alerta com foco.
  await p.getByRole('button', { name: 'Continuar' }).click();
  const alerta = p.locator('form [role="alert"]');
  confere((await alerta.textContent())?.includes('Responda a esta pergunta'), 'obrigatória: alerta visível');
  confere(await p.evaluate(() => document.activeElement?.getAttribute('role') === 'alert'), 'o foco vai para o alerta');
  await axe(p, 'cartão com erro');

  // 3. «Sim» avança sozinho e abre a condicional.
  await p.getByRole('radio', { name: 'Sim' }).click();
  await p.waitForFunction(() => document.querySelector('form h2 span[id$="-titulo"]')?.textContent === 'Qual?');
  ok('escolha única avança sozinha e abre a condicional «Qual?»');
  confere(await focoNoTitulo(p), 'o foco segue para o cartão novo');

  // 4. Texto curto com Enter.
  await p.getByRole('textbox', { name: 'Qual?' }).fill('  SAP  ');
  await p.keyboard.press('Enter');
  await p.waitForFunction(() => document.querySelector('form h2 span[id$="-titulo"]')?.textContent === 'Sobre a equipa');
  ok('Enter no texto avança; secção mostrada como cartão');
  await p.getByRole('button', { name: 'Continuar' }).click();

  // 5. Escolha múltipla.
  confere((await tituloDoCartao(p))?.startsWith('Que áreas'), 'escolha múltipla');
  await p.getByRole('checkbox', { name: 'Finanças' }).check();
  await p.getByRole('checkbox', { name: 'Operações' }).check();
  await axe(p, 'escolha múltipla');
  await p.getByRole('button', { name: 'Continuar' }).click();

  // 6. Número: decimal recusado (inteiro), depois aceite.
  const numero = p.getByRole('textbox', { name: /Quantas pessoas/ });
  await numero.fill('12,5');
  await p.getByRole('button', { name: 'Continuar' }).click();
  confere((await alerta.textContent())?.includes('Sem casas decimais'), 'número: diz a regra quando falha');
  await numero.fill('12');
  await p.getByRole('button', { name: 'Continuar' }).click();

  // 7. Avaliação por clique (avança sozinha).
  confere((await tituloDoCartao(p))?.startsWith('Satisfação'), 'avaliação');
  await axe(p, 'escala 1–5');
  if (largura === 390) await p.screenshot({ path: `${SAIDA}/inquerito-escala-390.png`, fullPage: true });
  await p.getByRole('radio', { name: '4 de 5' }).click();
  await p.waitForFunction(() => document.querySelector('form h2 span[id$="-titulo"]')?.textContent?.startsWith('Recomendaria'));
  ok('avaliação avança sozinha');

  // 8. NPS só por teclado: Tab até ao grupo, setas, Enter.
  await p.keyboard.press('Tab');
  const focado = await p.evaluate(() => document.activeElement?.getAttribute('aria-label'));
  confere(focado === '0 de 10', 'Tab chega ao primeiro valor da escala NPS', `(${focado})`);
  for (let i = 0; i < 9; i++) await p.keyboard.press('ArrowRight');
  await p.keyboard.press('Enter');
  await p.waitForFunction(() => document.querySelector('form h2 span[id$="-titulo"]')?.textContent?.startsWith('Até quando'));
  ok('NPS escolhido e avançado só com teclado');
  if (largura === 390) {
    const caixa = await p.locator('form').boundingBox();
    confere(caixa && caixa.width <= largura, 'cartão cabe a 390 px');
  }

  // 9. Data e texto longo opcional.
  await p.locator('input[type="date"]').fill('2026-12-31');
  await p.getByRole('button', { name: 'Continuar' }).click();
  confere((await tituloDoCartao(p)) === 'Mais alguma coisa?', 'texto longo opcional');
  await p.getByRole('button', { name: 'Continuar' }).click();

  // 10. Contacto: email sem consentimento é recusado no browser.
  confere((await tituloDoCartao(p)) === 'Quer deixar o seu contacto?', 'cartão de contacto no fim');
  await p.getByLabel('Email').fill('qa@exemplo.test');
  await p.getByRole('button', { name: 'Enviar respostas' }).click();
  confere((await p.getByText('Para deixar o contacto, aceite').count()) === 1, 'email sem consentimento: pede o consentimento');
  confere(envios.length === 0, 'nada enviado sem consentimento');
  await axe(p, 'contacto com erro');
  if (largura === 390) await p.screenshot({ path: `${SAIDA}/inquerito-contacto-390.png`, fullPage: true });

  // 11. Voltar não perde respostas.
  await p.getByRole('button', { name: 'Voltar' }).click();
  await p.getByRole('button', { name: 'Voltar' }).click();
  confere((await p.locator('input[type="date"]').inputValue()) === '2026-12-31', 'Voltar mantém a resposta');
  await p.getByRole('button', { name: 'Continuar' }).click();
  await p.getByRole('button', { name: 'Continuar' }).click();

  // 12. Consentimento e envio.
  await p.getByRole('checkbox', { name: /Aceito que a AGORAMOZ/ }).check();
  await p.getByRole('button', { name: 'Enviar respostas' }).click();
  await p.getByText('Resposta registada. Obrigado.').waitFor();
  confere(await p.evaluate(() => document.activeElement?.textContent === 'Resposta registada. Obrigado.'), 'agradecimento recebe o foco');
  await axe(p, 'agradecimento');

  const corpo = envios[0];
  confere(envios.length === 1, 'um só envio');
  confere(corpo?.token === TOKEN, 'token no corpo');
  confere(UUID4.test(corpo?.submissionId ?? ''), 'submissionId é UUID v4');
  confere(
    JSON.stringify(corpo?.respostas) ===
      JSON.stringify({ usa_erp: 'sim', qual_erp: 'SAP', areas: ['financas', 'operacoes'], pessoas: 12, satisfacao: 4, nps: 9, prazo: '2026-12-31' }),
    'respostas exactas, normalizadas e sem secção nem vazias',
    JSON.stringify(corpo?.respostas),
  );
  confere(
    JSON.stringify(corpo?.contacto) === JSON.stringify({ email: 'qa@exemplo.test', consentimento: true }),
    'contacto só com o preenchido e o consentimento',
    JSON.stringify(corpo?.contacto),
  );
  confere(Object.keys(corpo ?? {}).sort().join() === 'contacto,respostas,submissionId,token', 'sem campos a mais (nem a armadilha)');

  // Eventos: só o id e o passo — nunca o token nem respostas.
  const tudo = eventos.join('\n');
  confere(eventos.some((e) => e.includes('"survey_started"')), 'survey_started medido');
  confere(eventos.filter((e) => e.includes('"survey_step_viewed"')).length >= 9, 'survey_step_viewed por cartão');
  confere(!tudo.includes(TOKEN) && !tudo.includes('SAP') && !tudo.includes('qa@exemplo'), 'eventos sem token, respostas nem contacto');

  confere(erros.length === 0, 'sem erros na consola', erros.slice(0, 3).join(' | '));
  await ctx.close();
}

// ── Estados e idioma ──────────────────────────────────────────────────────────
console.log('\nestados');
{
  const ctx = await b.newContext({ viewport: { width: 390, height: 800 } });
  const { p } = await preparar(ctx);
  for (const estado of ['fechado', 'expirado', 'indisponivel']) {
    await p.goto(`${BASE}/qa/inquerito?estado=${estado}`, { waitUntil: 'load' });
    confere((await p.locator('h1').count()) === 1, `${estado}: um h1`);
    await axe(p, `ecrã ${estado}`);
  }
  await p.goto(`${BASE}/qa/inquerito?idioma=en`, { waitUntil: 'load' });
  confere((await p.getByRole('button', { name: 'Start' }).count()) === 1, 'inglês: «Start»');
  confere((await p.locator('[lang="en"]').count()) >= 1, 'inglês: lang="en" no conteúdo');
  await axe(p, 'inglês');
  await ctx.close();
}

// ── O link fecha entre abrir e enviar (410) ───────────────────────────────────
console.log('\n410 no envio');
{
  const ctx = await b.newContext({ viewport: { width: 768, height: 900 }, reducedMotion: 'reduce' });
  const { p, envios } = await preparar(ctx, { estadoEnvio: 410, corpoEnvio: { estado: 'expirado' } });
  await p.goto(`${BASE}/qa/inquerito`, { waitUntil: 'load' });
  await p.getByRole('button', { name: 'Começar' }).click();
  await p.getByRole('radio', { name: 'Não', exact: true }).click();
  await p.waitForFunction(() => document.querySelector('form h2 span[id$="-titulo"]')?.textContent === 'Sobre a equipa');
  for (let i = 0; i < 20; i++) {
    const enviar = p.getByRole('button', { name: 'Enviar respostas' });
    if (await enviar.count()) {
      await enviar.click();
      break;
    }
    const titulo = await tituloDoCartao(p);
    if (titulo?.startsWith('Que áreas')) await p.getByRole('checkbox', { name: 'Vendas' }).check();
    await p.getByRole('button', { name: 'Continuar' }).click();
  }
  await p.getByText('Este link expirou.').waitFor();
  ok('410 «expirado» mostra o ecrã de link expirado');
  confere(envios.length === 1 && envios[0].contacto === undefined, 'sem contacto preenchido não vai contacto');
  await axe(p, '410 expirado');
  await ctx.close();
}

// ── Experiência v2 (Lote R): teclas, Enter no título, só teclado até ao fim ───
console.log('\nv2 — teclado (1440 px)');
{
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  const { p, envios, erros } = await preparar(ctx);
  await p.goto(`${BASE}/qa/inquerito`, { waitUntil: 'load' });
  // Enter nas boas-vindas, sem foco em nenhum controlo, começa.
  await p.keyboard.press('Enter');
  confere(await focoNoTitulo(p), 'Enter nas boas-vindas começa');
  confere((await p.getByText('Teclas A–C para escolher').count()) === 1, 'dica de teclas A–C visível com rato');
  await p.keyboard.press('a');
  await p.waitForFunction(() => document.querySelector('form h2 span[id$="-titulo"]')?.textContent === 'Qual?');
  ok('tecla A escolhe «Sim» e avança');
  await p.keyboard.press('Tab');
  await p.keyboard.type('SAP');
  await p.keyboard.press('Enter');
  await p.waitForFunction(() => document.querySelector('form h2 span[id$="-titulo"]')?.textContent === 'Sobre a equipa');
  // A letra dentro de um campo é texto: «SAP» foi escrito, não escolhido.
  await p.keyboard.press('Enter');
  await p.waitForFunction(() => document.querySelector('form h2 span[id$="-titulo"]')?.textContent?.startsWith('Que áreas'));
  ok('Enter no título da secção avança');
  await p.keyboard.press('a');
  await p.keyboard.press('d');
  confere(
    (await p.getByRole('checkbox', { name: 'Finanças' }).isChecked()) &&
      (await p.getByRole('checkbox', { name: 'Operações' }).isChecked()),
    'teclas A e D marcam Finanças e Operações',
  );
  await p.keyboard.press('d');
  confere(!(await p.getByRole('checkbox', { name: 'Operações' }).isChecked()), 'D outra vez desmarca');
  await p.keyboard.press('d');
  await p.getByRole('button', { name: 'Continuar' }).click();
  await p.getByRole('textbox', { name: /Quantas pessoas/ }).fill('12');
  await p.keyboard.press('Enter');
  await p.waitForFunction(() => document.querySelector('form h2 span[id$="-titulo"]')?.textContent?.startsWith('Satisfação'));
  await p.keyboard.press('4');
  await p.waitForFunction(() => document.querySelector('form h2 span[id$="-titulo"]')?.textContent?.startsWith('Recomendaria'));
  ok('tecla 4 escolhe na avaliação e avança');
  await p.keyboard.press('9');
  await p.waitForFunction(() => document.querySelector('form h2 span[id$="-titulo"]')?.textContent?.startsWith('Até quando'));
  ok('tecla 9 escolhe no NPS e avança');
  await p.locator('input[type="date"]').fill('2026-12-31');
  await p.getByRole('button', { name: 'Continuar' }).click();
  await p.getByRole('textbox', { name: 'Mais alguma coisa?' }).fill('nada');
  await p.keyboard.press('Control+Enter');
  await p.waitForFunction(() => document.querySelector('form h2 span[id$="-titulo"]')?.textContent === 'Quer deixar o seu contacto?');
  ok('Ctrl + Enter no texto longo segue');
  // Segmento do progresso: volta à pergunta 1 e regressa ao contacto.
  await p.getByRole('button', { name: /^Ir para o passo 1:/ }).click();
  confere((await tituloDoCartao(p)) === 'A empresa usa um ERP?', 'segmento leva de volta ao passo 1');
  await p.getByRole('button', { name: /^Ir para o passo 10:/ }).click();
  confere((await tituloDoCartao(p)) === 'Quer deixar o seu contacto?', 'segmento já visto leva para a frente');
  await p.screenshot({ path: `${SAIDA}/inquerito-v2-contacto-1440.png` });
  await p.getByRole('button', { name: 'Enviar respostas' }).click();
  await p.getByText('Resposta registada. Obrigado.').waitFor();
  confere((await p.getByText('Respondeu a 8 perguntas.').count()) === 1, 'agradecimento diz quantas respondeu');
  confere(
    JSON.stringify(envios[0]?.respostas) ===
      JSON.stringify({ usa_erp: 'sim', qual_erp: 'SAP', areas: ['financas', 'operacoes'], pessoas: 12, satisfacao: 4, nps: 9, prazo: '2026-12-31', comentario: 'nada' }),
    'só teclado: respostas exactas',
    JSON.stringify(envios[0]?.respostas),
  );
  confere(envios[0]?.contacto === undefined, 'sem contacto, não vai contacto');
  confere(
    (await p.evaluate(() => Object.keys(sessionStorage).filter((k) => k.startsWith('agoraforms:')).length)) === 0,
    'rascunho apagado depois de enviar',
  );
  confere(erros.length === 0, 'sem erros na consola', erros.slice(0, 3).join(' | '));
  await p.screenshot({ path: `${SAIDA}/inquerito-v2-fim-1440.png` });
  await ctx.close();
}

// ── Telemóvel: NPS numa grelha, barra fixa, deslizar, rascunho ────────────────
console.log('\nv2 — telemóvel (390 px)');
{
  const ctx = await b.newContext({ viewport: { width: 390, height: 700 }, reducedMotion: 'reduce', hasTouch: true });
  const { p, erros } = await preparar(ctx);
  await p.goto(`${BASE}/qa/inquerito`, { waitUntil: 'load' });
  await p.screenshot({ path: `${SAIDA}/inquerito-v2-boas-vindas-390.png` });
  await p.getByRole('button', { name: 'Começar' }).click();

  // Deslizar: a direita volta, a esquerda avança (nunca envia).
  async function deslizar(dx) {
    await p.evaluate((dx) => {
      const alvo = document.querySelector('form h2')?.parentElement;
      const op = { bubbles: true, pointerType: 'touch', isPrimary: true, pointerId: 7 };
      alvo.dispatchEvent(new PointerEvent('pointerdown', { ...op, clientX: 200, clientY: 300 }));
      alvo.dispatchEvent(new PointerEvent('pointerup', { ...op, clientX: 200 + dx, clientY: 305 }));
    }, dx);
  }
  await p.getByRole('radio', { name: 'Sim' }).click();
  await p.waitForFunction(() => document.querySelector('form h2 span[id$="-titulo"]')?.textContent === 'Qual?');
  await deslizar(120);
  await p.waitForFunction(() => document.querySelector('form h2 span[id$="-titulo"]')?.textContent === 'A empresa usa um ERP?');
  ok('deslizar para a direita volta');
  await deslizar(-120);
  await p.waitForFunction(() => document.querySelector('form h2 span[id$="-titulo"]')?.textContent === 'Qual?');
  ok('deslizar para a esquerda avança');

  await p.getByRole('textbox', { name: 'Qual?' }).fill('Primavera');
  await p.getByRole('button', { name: 'Continuar' }).click();
  await p.getByRole('button', { name: 'Continuar' }).click();
  await p.getByRole('checkbox', { name: 'Vendas' }).check();
  await p.screenshot({ path: `${SAIDA}/inquerito-v2-multipla-390.png` });
  // Barra de acções fixa: o botão está no ecrã sem rolar.
  const caixa = await p.getByRole('button', { name: 'Continuar' }).boundingBox();
  confere(caixa && caixa.y + caixa.height <= 700, 'barra fixa: «Continuar» visível sem rolar', JSON.stringify(caixa));

  // Rascunho: recarregar e retomar no mesmo cartão, sem dados de contacto.
  const guardado = await p.evaluate(() =>
    Object.entries(sessionStorage).filter(([k]) => k.startsWith('agoraforms:')).map(([, v]) => v).join(''),
  );
  confere(guardado.includes('Primavera') && !guardado.includes('@'), 'rascunho guardado, sem contacto');
  await p.reload({ waitUntil: 'load' });
  await p.getByRole('button', { name: 'Retomar onde parou' }).click();
  confere((await tituloDoCartao(p))?.startsWith('Que áreas'), 'retoma no cartão onde estava');
  confere(await p.getByRole('checkbox', { name: 'Vendas' }).isChecked(), 'retoma com as respostas');
  await p.getByRole('button', { name: 'Continuar' }).click();
  await p.getByRole('textbox', { name: /Quantas pessoas/ }).fill('40');
  await p.getByRole('button', { name: 'Continuar' }).click();
  await p.getByRole('radio', { name: '3 de 5' }).click();
  await p.waitForFunction(() => document.querySelector('form h2 span[id$="-titulo"]')?.textContent?.startsWith('Recomendaria'));

  // NPS: 6 + 5, todos no ecrã, alvos ≥ 44 px, sem scroll horizontal.
  const celulas = await p.getByRole('radio').evaluateAll((els) =>
    els.map((e) => {
      const r = e.getBoundingClientRect();
      return { x: r.x, y: r.y, w: r.width, h: r.height };
    }),
  );
  const linhas = new Set(celulas.map((c) => Math.round(c.y))).size;
  confere(celulas.length === 11 && linhas === 2, 'NPS em duas linhas (6 + 5)', `${celulas.length} em ${linhas}`);
  confere(celulas.every((c) => c.x >= 0 && c.x + c.w <= 390 && c.w >= 44 && c.h >= 44), 'NPS: alvos ≥ 44 px dentro do ecrã');
  confere((await p.evaluate(() => document.documentElement.scrollWidth)) <= 390, 'sem scroll horizontal no NPS');
  await axe(p, 'NPS a 390');
  await p.screenshot({ path: `${SAIDA}/inquerito-v2-nps-390.png` });

  // Descartar o rascunho.
  await p.reload({ waitUntil: 'load' });
  await p.getByRole('button', { name: 'Descartar respostas' }).click();
  confere((await p.getByRole('button', { name: 'Começar' }).count()) === 1, 'descartar volta ao «Começar»');
  confere(
    (await p.evaluate(() => Object.keys(sessionStorage).filter((k) => k.startsWith('agoraforms:')).length)) === 0,
    'descartar apaga o rascunho',
  );
  await axe(p, 'boas-vindas sem rascunho');
  confere(erros.length === 0, 'sem erros na consola', erros.slice(0, 3).join(' | '));
  await ctx.close();
}

await b.close();
console.log(falhas ? `\n${falhas} falha(s)` : '\ntudo verde');
process.exit(falhas ? 1 : 0);
