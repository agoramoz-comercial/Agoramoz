import { chromium } from '@playwright/test';

/**
 * Ablação de variável única, sem rebuild: desliga um efeito por CSS injetado
 * antes do primeiro paint e mede o mesmo build. Compara-se LCP − domInteractive,
 * que é a fase pós-hidratação onde a timeline do hero vive.
 */
/**
 * O caso de controlo injeta uma regra inócua de propósito. Sem isso, o
 * controlo era o único caso sem `addInitScript`, e o custo do próprio
 * mecanismo de injeção aparecia como se fosse custo do efeito ablado — o que
 * dava o absurdo de "remover o efeito torna a página mais lenta".
 */
const CASES = {
  'tudo ligado (controlo)': '.__ablacao-controlo{color:inherit}',
  'sem varrimento de crómio': '.chrome-sweep,.chrome-loop{animation:none !important}',
  'sem deriva da malha': '[data-contour-drift]{animation:none !important;will-change:auto !important}',
  'sem malha nenhuma': '[data-contour-drift]{display:none !important}',
  'sem crómio nenhum': '.chrome-text{background-image:none !important;color:var(--on-surface) !important;-webkit-text-fill-color:currentColor !important;animation:none !important}',
};
const ROUNDS = Number(process.env.ROUNDS ?? 10);
const med = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox','--disable-dev-shm-usage'] });

/**
 * Ronda a ronda, um caso de cada vez. Correr N vezes o caso A e só depois N
 * vezes o caso B atribui a deriva de carga da máquina ao caso — foi assim que
 * uma primeira ablação aqui deu "remover coisas piora", que é impossível.
 */
const results = Object.fromEntries(Object.keys(CASES).map((k) => [k, []]));

async function sample(css) {
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  const cdp = await ctx.newCDPSession(p);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  if (css) await p.addInitScript((c) => {
    const s = document.createElement('style'); s.textContent = c;
    new MutationObserver((_, o) => { if (document.head) { document.head.appendChild(s); o.disconnect(); } })
      .observe(document.documentElement, { childList: true, subtree: true });
  }, css);
  await p.goto('http://127.0.0.1:3000/', { waitUntil: 'load' });
  const r = await p.evaluate(() => new Promise((res) => {
    let best = null;
    new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!best || e.startTime > best.startTime) best = e; })
      .observe({ type: 'largest-contentful-paint', buffered: true });
    setTimeout(() => res({ lcp: Math.round(best?.startTime ?? 0),
      domInt: Math.round(performance.getEntriesByType('navigation')[0]?.domInteractive ?? 0) }), 3000);
  }));
  await ctx.close();
  return r.lcp - r.domInt;
}

for (let round = 0; round < ROUNDS; round++) {
  for (const [name, css] of Object.entries(CASES)) results[name].push(await sample(css));
}
await b.close();

const baseline = med(results['tudo ligado (controlo)']);
for (const [name, xs] of Object.entries(results)) {
  const m = med(xs);
  const d = m - baseline;
  console.log(`${name.padEnd(28)} mediana ${String(m).padStart(5)}ms  ${(d >= 0 ? '+' : '') + d}ms`);
}
