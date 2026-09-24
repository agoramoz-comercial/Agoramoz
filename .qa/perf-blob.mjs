import { chromium } from '@playwright/test';
/**
 * Ablação do WebGL: o mesmo build, medido com e sem o bolbo, intercalado.
 * Blocos alternados porque medir A N vezes e depois B N vezes atribui a deriva
 * de carga da máquina ao caso — já produziu conclusões falsas neste projeto.
 */
const KILL = 'canvas{display:none !important}';
const ROUNDS = Number(process.env.ROUNDS ?? 6);
const med = (a) => { const s=[...a].sort((x,y)=>x-y); return s[Math.floor(s.length/2)]; };
const b = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--no-sandbox','--disable-dev-shm-usage','--use-gl=swiftshader','--enable-unsafe-swiftshader'],
});
const res = { 'com bolbo': [], 'sem bolbo': [] };

async function sample(css) {
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  const cdp = await ctx.newCDPSession(p);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  // controlo injeta regra inócua: o custo do próprio mecanismo cai nos dois lados
  await p.addInitScript((c) => {
    const s = document.createElement('style'); s.textContent = c;
    new MutationObserver((_, o) => { if (document.head) { document.head.appendChild(s); o.disconnect(); } })
      .observe(document.documentElement, { childList: true, subtree: true });
  }, css);
  await p.goto('http://127.0.0.1:3000/', { waitUntil: 'load' });
  const r = await p.evaluate(() => new Promise((resolve) => {
    let best = 0, cls = 0; const long = [];
    new PerformanceObserver((l) => { for (const e of l.getEntries()) best = Math.max(best, e.startTime); })
      .observe({ type: 'largest-contentful-paint', buffered: true });
    new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) cls += e.value; })
      .observe({ type: 'layout-shift', buffered: true });
    new PerformanceObserver((l) => { for (const e of l.getEntries()) if (e.duration > 50) long.push(Math.round(e.duration)); })
      .observe({ type: 'longtask' });
    const step = Math.round(window.innerHeight * 0.8);
    let y = 0;
    const t = setInterval(() => {
      y += step; window.scrollTo(0, y);
      if (y > document.body.scrollHeight) { clearInterval(t); setTimeout(() => resolve({
        lcp: Math.round(best),
        domInt: Math.round(performance.getEntriesByType('navigation')[0]?.domInteractive ?? 0),
        cls: +cls.toFixed(4), long: long.length, maxLong: long.length ? Math.max(...long) : 0,
      }), 1200); }
    }, 130);
  }));
  await ctx.close();
  return r;
}

for (let i = 0; i < ROUNDS; i++) {
  res['com bolbo'].push(await sample('.__controlo{color:inherit}'));
  res['sem bolbo'].push(await sample(KILL));
}
await b.close();

for (const [k, rows] of Object.entries(res)) {
  const rel = rows.map(r => r.lcp - r.domInt);
  console.log(
    `${k.padEnd(11)} LCP−domInt=${String(med(rel)).padStart(5)}ms  LCP=${String(med(rows.map(r=>r.lcp))).padStart(5)}ms  ` +
    `CLS=${med(rows.map(r=>r.cls))}  tarefas>50ms=${med(rows.map(r=>r.long))} (máx ${Math.max(...rows.map(r=>r.maxLong))}ms)`,
  );
}
