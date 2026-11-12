/**
 * QA da página /civico contra um servidor a correr, com o motor simulado.
 *
 *   node .qa/civico-motor-simulado.mjs &
 *   CIVICO_ENGINE=lovable LOVABLE_CIVICO_URL=http://127.0.0.1:4020/api/consulta pnpm build
 *   CIVICO_ENGINE=lovable LOVABLE_CIVICO_URL=http://127.0.0.1:4020/api/consulta pnpm start -p 3111 &
 *   node .qa/civico.mjs http://127.0.0.1:3111
 *
 * Verifica: sem transbordo horizontal, a consulta do princípio ao fim, o foco
 * na resposta, as fontes numeradas, o aviso de resposta sem fonte, a recusa de
 * dados pessoais sem pedido à rede, o erro com «Tentar de novo», o seguimento
 * com histórico, «Nova conversa», nada no armazenamento do browser, e axe
 * (WCAG 2.1 AA) nos três estados.
 */
import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const BASE = process.argv[2] ?? 'http://127.0.0.1:3111';
const falhas = [];
const ok = (cond, nome, detalhe = '') => {
  console.log(`${cond ? 'ok  ' : 'FALHA'} ${nome}${detalhe ? ` — ${detalhe}` : ''}`);
  if (!cond) falhas.push(nome);
};

async function axe(pagina, nome) {
  const r = await new AxeBuilder({ page: pagina }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  const v = r.violations.map((x) => `${x.id}(${x.nodes.length}): ${x.nodes[0]?.target?.join(' ')}`);
  ok(v.length === 0, `axe ${nome}`, v.join(' | '));
}

// Como os outros scripts de QA: o Chromium do contentor, quando existe.
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM ?? '/opt/pw-browsers/chromium',
  args: ['--no-sandbox'],
});
for (const [vista, width, height] of [['desktop', 1440, 900], ['telemovel', 390, 844]]) {
  // O axe exige um contexto explícito.
  const contexto = await browser.newContext({ viewport: { width, height }, reducedMotion: 'reduce' });
  const pagina = await contexto.newPage();
  const erros = [];
  const pedidos = [];
  pagina.on('pageerror', (e) => erros.push(String(e)));
  // O 502 é o que o próprio teste provoca (a pergunta com «falha»): não é um erro da página.
  pagina.on('console', (m) => m.type() === 'error' && !/upgrade-insecure|status of 502/.test(m.text()) && erros.push(m.text()));
  pagina.on('request', (r) => r.url().includes('/api/civico/') && pedidos.push(r.postDataJSON()));

  await pagina.goto(`${BASE}/civico`, { waitUntil: 'networkidle' });
  await pagina.waitForTimeout(1200);
  const largura = await pagina.evaluate(() => document.documentElement.scrollWidth);
  ok(largura <= width, `${vista}: sem transbordo horizontal`, `${largura}px`);
  ok((await pagina.locator('h1').count()) === 1, `${vista}: um só h1`);
  await axe(pagina, `${vista} inicial`);

  const campo = pagina.getByLabel('A sua pergunta');
  const enviar = pagina.getByRole('button', { name: 'Perguntar' }).first();

  // Dados pessoais: recusados no browser, sem pedido à rede.
  await campo.fill('O meu patrão não paga, o meu número é 84 123 4567, o que faço?');
  await enviar.click();
  await pagina.getByText(/parece ter um número de telefone/).waitFor({ timeout: 3000 });
  ok(pedidos.length === 0, `${vista}: pergunta com telefone não sai do browser`);

  await campo.fill('curta');
  await enviar.click();
  await pagina.getByText(/pelo menos 8 caracteres/).waitFor({ timeout: 3000 });
  ok(pedidos.length === 0, `${vista}: pergunta curta não sai do browser`);

  // Falha do motor: mensagem e «Tentar de novo».
  await campo.fill('Esta pergunta provoca uma falha no motor simulado');
  await enviar.click();
  // Pelo texto, não pelo papel: o Next tem o seu próprio `role="alert"` (o anunciador de rota).
  const erro = pagina.locator('[role="alert"]', { hasText: 'não conseguiu responder' });
  await erro.waitFor({ timeout: 10000 });
  ok(await erro.getByRole('button', { name: 'Tentar de novo' }).isVisible(), `${vista}: erro do serviço oferece «Tentar de novo»`);

  // A consulta completa, por Enter.
  await campo.fill('Que aviso prévio tem de dar o empregador para rescindir o contrato?');
  await campo.press('Enter');
  await pagina.getByText('A procurar nas fontes').first().waitFor({ timeout: 3000 });
  await pagina.getByRole('heading', { name: /Que aviso prévio/ }).waitFor({ timeout: 15000 });
  await pagina.waitForTimeout(400);
  ok((await pagina.evaluate(() => document.activeElement?.id)) === 'civico-resposta', `${vista}: o foco vai para a resposta`);
  ok((await erro.count()) === 0, `${vista}: o erro anterior saiu`);
  const fontes = pagina.locator('#civico-fontes + ol > li');
  ok((await fontes.count()) === 3, `${vista}: três fontes numeradas`, String(await fontes.count()));
  ok((await pagina.getByText('Domínio do Estado moçambicano').count()) === 2, `${vista}: duas fontes com o selo gov.mz`);
  const ligacoes = await pagina.locator('article a[href^="http"]').evaluateAll((as) =>
    as.map((a) => [a.getAttribute('href'), a.target, a.rel]),
  );
  ok(ligacoes.length > 0 && ligacoes.every(([h, t, r]) => h.startsWith('https://') && t === '_blank' && r.includes('noopener')), `${vista}: ligações https, noutro separador, noopener`);
  ok((await pagina.locator('article script, article img').count()) === 0, `${vista}: HTML do motor não vira marcação`);
  ok(await pagina.getByText('<script>alert(1)</script>', { exact: false }).isVisible(), `${vista}: o HTML do motor lê-se como texto`);
  ok(await pagina.getByText(/Gerado por inteligência artificial/).isVisible(), `${vista}: aviso de IA junto à resposta`);
  await axe(pagina, `${vista} com resposta`);

  // Seguimento: leva o histórico; resposta sem fonte mostra o aviso.
  const seguimento = pagina.getByLabel('Pergunta de seguimento');
  await seguimento.fill('E se a resposta vier sem fonte nenhuma?');
  await seguimento.press('Enter');
  await pagina.getByText(/não traz ligação para nenhuma fonte/).waitFor({ timeout: 15000 });
  const ultimo = pedidos.at(-1);
  ok(ultimo?.historico?.length === 1 && !('nome' in ultimo), `${vista}: o seguimento leva uma troca de histórico`);
  ok((await pagina.locator('aside ol > li').count()) === 2, `${vista}: duas perguntas na lista da conversa`);
  await axe(pagina, `${vista} sem fonte`);

  // Voltar à primeira e recomeçar.
  await pagina.locator('aside ol > li button').first().click();
  await pagina.locator('#civico-fontes').waitFor({ timeout: 3000 });
  await pagina.getByRole('button', { name: 'Apagar esta conversa e começar outra' }).click();
  ok((await pagina.locator('article').count()) === 0, `${vista}: «Nova conversa» apaga tudo`);

  const guardado = await pagina.evaluate(() => ({ ...localStorage, ...sessionStorage }));
  ok(!JSON.stringify(guardado).toLowerCase().includes('aviso pr'), `${vista}: nada da conversa no armazenamento do browser`);
  ok(erros.length === 0, `${vista}: sem erros na consola`, erros.slice(0, 3).join(' | '));
  await contexto.close();
}
await browser.close();

if (falhas.length) {
  console.error(`\n${falhas.length} falha(s).`);
  process.exit(1);
}
console.log('\nTudo certo.');
