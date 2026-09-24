/**
 * Conta violações de Content-Security-Policy num browser real.
 *
 * Responde a uma pergunta só: a política pode passar de `Report-Only` a
 * imposta sem partir o site? Enquanto este script devolver violações, não
 * pode. Quando devolver zero em todas as rotas e nos três ecrãs, pode.
 *
 *   node .qa/csp.mjs                    # contra http://127.0.0.1:3000
 *   BASE=http://127.0.0.1:3210 node .qa/csp.mjs
 */
import { chromium } from '@playwright/test';

const BASE = process.env.BASE ?? 'http://127.0.0.1:3000';

const ROTAS = [
  '/',
  '/diagnostico',
  '/solucoes',
  '/solucoes/agentes-ia',
  '/mz',
  '/mz/energia-mineracao',
  '/sobre',
  '/contactos',
  '/como-trabalhamos',
  '/privacidade',
];

const ECRAS = [
  { nome: 'mobile', width: 390, height: 844 },
  { nome: 'tablet', width: 768, height: 1024 },
  { nome: 'web', width: 1440, height: 900 },
];

const violacoes = [];

/**
 * O Chromium do ambiente pode não ser a revisão que esta versão do Playwright
 * espera. Apontar ao binário existente evita um download que a rede de saída
 * deste contentor bloquearia. `CHROMIUM_PATH` permite sobrepor noutra máquina.
 */
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium',
});

for (const ecra of ECRAS) {
  const context = await browser.newContext({
    viewport: { width: ecra.width, height: ecra.height },
  });
  const page = await context.newPage();

  /**
   * O browser reporta violações de duas maneiras: uma mensagem na consola e
   * um pedido POST ao `report-uri`. A consola é a que apanha tudo, incluindo
   * o que é bloqueado antes de haver rede.
   */
  page.on('console', (msg) => {
    const texto = msg.text();

    /**
     * Ruído informativo, não violação: o browser avisa que esta diretiva não
     * faz nada enquanto a política for só de relatório. Contá-la escondia as
     * violações verdadeiras atrás de dezenas de linhas iguais.
     */
    if (/is ignored when delivered in a report-only policy/i.test(texto)) return;

    if (/Content Security Policy|Refused to (load|execute|evaluate|apply|connect)/i.test(texto)) {
      violacoes.push({ ecra: ecra.nome, rota: page.url().replace(BASE, ''), texto });
    }
  });

  for (const rota of ROTAS) {
    await page.goto(`${BASE}${rota}`, { waitUntil: 'networkidle' });
    // Rolar até ao fim: muito do movimento e do WebGL só arranca ao entrar na
    // viewport, e é aí que uma política apertada costuma partir.
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(400);
  }

  await context.close();
}

await browser.close();

if (violacoes.length === 0) {
  console.log(`SEM VIOLACOES em ${ROTAS.length} rotas x ${ECRAS.length} ecras.`);
  console.log('A politica pode passar a imposta: CSP_REPORT_ONLY=false');
  process.exit(0);
}

console.log(`${violacoes.length} VIOLACAO(OES) — nao impor ainda:\n`);

const porTexto = new Map();
for (const v of violacoes) {
  const chave = v.texto;
  const registo = porTexto.get(chave) ?? { n: 0, rotas: new Set(), ecras: new Set() };
  registo.n += 1;
  registo.rotas.add(v.rota || '/');
  registo.ecras.add(v.ecra);
  porTexto.set(chave, registo);
}

for (const [texto, r] of [...porTexto].sort((a, b) => b[1].n - a[1].n)) {
  console.log(`[${r.n}x] ${texto}`);
  console.log(`      rotas: ${[...r.rotas].join(', ')}`);
  console.log(`      ecras: ${[...r.ecras].join(', ')}\n`);
}
process.exit(1);
