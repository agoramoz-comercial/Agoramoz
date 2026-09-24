import { chromium } from '@playwright/test';
/**
 * Fuga de ScrollTrigger entre navegações. A PageTransition é nova e corre a
 * cada mudança de rota: se deixasse contextos por reverter, o número subiria
 * a cada ida-e-volta até a página engasgar.
 */
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox','--disable-dev-shm-usage'] });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
const errs = [];
p.on('pageerror', (e) => errs.push(e.message));
await p.goto('http://127.0.0.1:3000/', { waitUntil: 'networkidle' });
const counts = [];
const n = () => p.evaluate(() => window.__AGORAMOZ_ST__?.getAll?.().length ?? -1);
await p.waitForTimeout(800);
counts.push(await n());
for (let i = 0; i < 4; i++) {
  await p.click('a[href="/solucoes/websites-avancados"]').catch(async () => { await p.goto('http://127.0.0.1:3000/solucoes/websites-avancados'); });
  await p.waitForTimeout(1100);
  await p.goBack(); await p.waitForTimeout(1100);
  counts.push(await n());
}
console.log('ScrollTriggers em cada volta:', counts.join(' → '));
console.log(errs.length ? 'ERROS: ' + errs.join(' | ') : 'sem erros de página');
await b.close();
