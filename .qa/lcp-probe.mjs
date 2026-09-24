import { chromium } from '@playwright/test';

/**
 * Sonda de LCP com a CPU a 4x.
 *
 * Reporta LCP e LCP − domInteractive. A segunda é a que interessa numa
 * comparação: a máquina onde isto corre tem carga variável, e o domInteractive
 * absorve essa variação. Comparar só o LCP absoluto entre dois builds medidos
 * em momentos diferentes leva a perseguir ruído.
 */
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox','--disable-dev-shm-usage'] });
const port = process.env.PORT ?? 3000;
const runs = Number(process.env.RUNS ?? 5);
const rows = [];
for (let i = 0; i < runs; i++) {
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  const cdp = await ctx.newCDPSession(p);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await p.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'load' });
  const r = await p.evaluate(() => new Promise((res) => {
    let best = null;
    new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!best || e.startTime > best.startTime) best = e; })
      .observe({ type: 'largest-contentful-paint', buffered: true });
    setTimeout(() => {
      const nav = performance.getEntriesByType('navigation')[0];
      res({ lcp: Math.round(best?.startTime ?? 0), domInt: Math.round(nav?.domInteractive ?? 0),
            el: best?.element ? best.element.tagName : '?' });
    }, 3000);
  }));
  rows.push(r);
  await ctx.close();
}
await b.close();
const med = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
const lcps = rows.map((r) => r.lcp);
const rel = rows.map((r) => r.lcp - r.domInt);
if (process.env.RAW) {
  // Só os números, para o comparador intercalado agregar.
  console.log(rel.join(' '));
} else {
  console.log(`  LCP: ${lcps.join(' ')}  → mediana ${med(lcps)}ms`);
  console.log(`  LCP−domInteractive: ${rel.join(' ')}  → mediana ${med(rel)}ms   (elemento ${rows[0].el})`);
}
