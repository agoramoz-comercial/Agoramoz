import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

/**
 * Capturas de página inteira das rotas PT, para provar que o lote E não mexe
 * no design. Corre-se antes e depois com DESTINO diferente e compara-se.
 * Movimento reduzido: sem ele, as capturas diferem por causa das animações,
 * não do código.
 */
const BASE = process.env.BASE ?? 'http://127.0.0.1:3000';
const DESTINO = process.env.DESTINO ?? '.qa/ref-antes';
const ROTAS = (process.env.ROTAS ?? '/,/solucoes,/solucoes/agentes-ia,/diagnostico,/global').split(',');
mkdirSync(DESTINO, { recursive: true });

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
for (const largura of [390, 1440]) {
  const ctx = await b.newContext({ viewport: { width: largura, height: 900 }, reducedMotion: 'reduce' });
  for (const rota of ROTAS) {
    const p = await ctx.newPage();
    await p.goto(BASE + rota, { waitUntil: 'networkidle' });
    await p.waitForTimeout(600);
    const nome = (rota === '/' ? 'inicio' : rota.slice(1).replaceAll('/', '_')) + `-${largura}.png`;
    await p.screenshot({ path: `${DESTINO}/${nome}`, fullPage: true });
    const altura = await p.evaluate(() => document.documentElement.scrollHeight);
    console.log(`${largura} ${rota} → ${altura}px`);
    await p.close();
  }
  await ctx.close();
}
await b.close();
