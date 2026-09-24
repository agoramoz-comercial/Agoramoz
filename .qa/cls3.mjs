import { chromium } from '@playwright/test';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox','--disable-dev-shm-usage'] });
const port = process.env.PORT ?? 3000;
const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
const p = await ctx.newPage();
const cdp = await ctx.newCDPSession(p);
await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
await p.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'load' });
const out = await p.evaluate(() => new Promise((resolve) => {
  const shifts = [];
  new PerformanceObserver((l) => {
    for (const e of l.getEntries()) {
      if (e.hadRecentInput) continue;
      shifts.push({
        t: Math.round(e.startTime), v: +e.value.toFixed(4),
        srcs: (e.sources || []).map(s => {
          const n = s.node;
          return n ? `${n.tagName}.${(n.className||'').toString().slice(0,60)}` : 'sem-nó';
        }),
      });
    }
  }).observe({ type: 'layout-shift', buffered: true });
  const step = Math.round(window.innerHeight * 0.8);
  let y = 0;
  const t = setInterval(() => { y += step; window.scrollTo(0, y);
    if (y > document.body.scrollHeight) { clearInterval(t); setTimeout(() => resolve(shifts), 900); } }, 130);
}));
for (const s of out) if (s.v > 0.001) console.log(`t=${s.t}ms v=${s.v}`, s.srcs.join(' | '));
console.log('total', out.reduce((a,s)=>a+s.v,0).toFixed(4));
await b.close();
