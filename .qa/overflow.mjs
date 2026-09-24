import { chromium } from '@playwright/test';
/**
 * Transbordo horizontal real, medido por `documentElement.scrollWidth`.
 *
 * Listar rects que passam da viewport dá falsos positivos em massa: qualquer
 * elemento dentro de um contentor com `overflow: hidden` (a malha de contorno)
 * ou num carrossel horizontal (a régua de processo) aparece lá sem que a
 * página transborde. O que conta é o documento ficar mais largo do que o ecrã.
 */
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox','--disable-dev-shm-usage'] });
const ROUTES = ['/', '/mz', '/mz/energia-mineracao', '/solucoes/agentes-ia', '/diagnostico', '/sobre', '/contactos', '/solucoes', '/como-trabalhamos'];
let bad = 0;
for (const r of ROUTES) {
  for (const w of [390, 768, 1024, 1440]) {
    const ctx = await b.newContext({ viewport: { width: w, height: 900 } });
    const p = await ctx.newPage();
    await p.goto('http://127.0.0.1:3000' + r, { waitUntil: 'networkidle' });
    await p.evaluate(async () => { const s = innerHeight * 0.8;
      for (let y = 0; y < document.body.scrollHeight; y += s) { scrollTo(0, y); await new Promise(r => setTimeout(r, 70)); } scrollTo(0, 0); });
    await p.waitForTimeout(500);
    const res = await p.evaluate(() => ({
      scrollW: document.documentElement.scrollWidth,
      bodyScrollW: document.body.scrollWidth,
    }));
    if (res.scrollW > w + 1) {
      bad++;
      console.log(`TRANSBORDA ${r} @${w}  scrollWidth=${res.scrollW} (body ${res.bodyScrollW})`);
    }
    await ctx.close();
  }
}
await b.close();
console.log(bad === 0 ? '\nSem transbordo horizontal em nenhuma rota/largura.' : `\n${bad} combinações com transbordo.`);
