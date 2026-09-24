import { chromium } from '@playwright/test';
const b = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--no-sandbox','--disable-dev-shm-usage','--use-gl=swiftshader','--enable-unsafe-swiftshader'],
});
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
const p = await ctx.newPage();
const cdp = await ctx.newCDPSession(p);
await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
await p.goto('http://127.0.0.1:3000/', { waitUntil: 'load' });
const out = await p.evaluate(() => new Promise((resolve) => {
  const shifts = [];
  new PerformanceObserver((l) => {
    for (const e of l.getEntries()) {
      if (e.hadRecentInput) continue;
      shifts.push({ t: Math.round(e.startTime), v: +e.value.toFixed(4),
        srcs: (e.sources || []).map(s => {
          const n = s.node;
          if (!n) return 'sem-nó';
          const cls = (n.className || '').toString().slice(0, 50);
          return `${n.tagName}.${cls} prev=[${Math.round(s.previousRect.top)},${Math.round(s.previousRect.height)}] cur=[${Math.round(s.currentRect.top)},${Math.round(s.currentRect.height)}]`;
        }) });
    }
  }).observe({ type: 'layout-shift', buffered: true });
  const step = Math.round(window.innerHeight * 0.8);
  let y = 0;
  const t = setInterval(() => { y += step; window.scrollTo(0, y);
    if (y > document.body.scrollHeight) { clearInterval(t); setTimeout(() => resolve(shifts), 1200); } }, 130);
}));
let total = 0;
for (const s of out) { total += s.v; if (s.v > 0.001) { console.log(`t=${s.t}ms v=${s.v}`); for (const x of s.srcs) console.log('    ' + x); } }
console.log('CLS total', total.toFixed(4));
await b.close();
