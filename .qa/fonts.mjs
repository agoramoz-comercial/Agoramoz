import { chromium } from '@playwright/test';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox','--disable-dev-shm-usage'] });
const port = process.env.PORT ?? 3000;
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
const p = await ctx.newPage();
const cdp = await ctx.newCDPSession(p);
await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
const fonts = [];
p.on('response', async (r) => { if (/\.(woff2?|ttf)$/.test(new URL(r.url()).pathname)) fonts.push(new URL(r.url()).pathname.split('/').pop()); });
await p.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'load' });
const r = await p.evaluate(() => new Promise((res) => {
  const t0 = performance.now();
  let fontsReady = 0;
  document.fonts.ready.then(() => { fontsReady = Math.round(performance.now()); });
  let best = null;
  new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!best || e.startTime > best.startTime) best = e; })
    .observe({ type: 'largest-contentful-paint', buffered: true });
  setTimeout(() => {
    const res2 = performance.getEntriesByType('resource').filter(e => /woff|ttf/.test(e.name))
      .map(e => ({ n: e.name.split('/').pop().slice(0,24), end: Math.round(e.responseEnd) }));
    res({ lcp: Math.round(best?.startTime ?? 0), fontsReady, faces: document.fonts.size, res: res2,
          domInt: Math.round(performance.getEntriesByType('navigation')[0]?.domInteractive ?? 0) });
  }, 3200);
}));
console.log(`porta ${port}: LCP=${r.lcp} domInt=${r.domInt} fonts.ready=${r.fontsReady} faces=${r.faces}`);
for (const f of r.res) console.log(`   ${f.n.padEnd(26)} fim=${f.end}ms`);
await b.close();
