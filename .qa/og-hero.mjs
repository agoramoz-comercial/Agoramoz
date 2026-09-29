import { chromium } from '@playwright/test';
import { mkdirSync, statSync } from 'node:fs';

/**
 * A imagem de partilha é o Hero, capturado da própria página.
 *
 * Corre-se contra `next start` sempre que o Hero mudar, e os ficheiros vão
 * para `public/og/`, de onde `OG_IMAGE_PADRAO` e `OG_IMAGE_PADRAO_EN` os
 * servem. Uma captura, e não um desenho à parte em `next/og`: o que se
 * partilha é o que se vê ao abrir a ligação.
 *
 * O único ajuste é o espaço vazio acima do título, reduzido para que caibam
 * logótipo, título, parágrafo e CTA em 1200×630 — o formato que LinkedIn,
 * WhatsApp, Facebook e X esperam. Movimento reduzido, para capturar o estado
 * final e não um fotograma da animação de entrada.
 */
const BASE = process.env.BASE ?? 'http://127.0.0.1:3000';
const DESTINO = 'public/og';
mkdirSync(DESTINO, { recursive: true });

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
for (const [rota, nome] of [['/', 'hero-pt'], ['/en', 'hero-en']]) {
  const p = await b.newPage({ viewport: { width: 1200, height: 900 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
  await p.goto(BASE + rota, { waitUntil: 'networkidle' });
  await p.waitForTimeout(1200);
  const topo = await p.evaluate(() => {
    const hero = document.querySelector('main section');
    hero.style.paddingTop = '36px';
    const interior = hero.querySelector('.pt-8');
    if (interior) interior.style.paddingTop = '0';
    return document.querySelector('header').getBoundingClientRect().top;
  });
  const ficheiro = `${DESTINO}/${nome}.png`;
  await p.screenshot({ path: ficheiro, clip: { x: 0, y: topo, width: 1200, height: 630 } });
  console.log(`${rota} → ${ficheiro} (${Math.round(statSync(ficheiro).size / 1024)} KB)`);
  await p.close();
}
await b.close();
