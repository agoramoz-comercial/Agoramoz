import { chromium } from '@playwright/test';

/**
 * Orçamento de performance medido, não presumido, com throttling de CPU 4x —
 * o cenário de um telemóvel de gama média, que é o mercado principal.
 *
 * Duas fases separadas de propósito: o scroll programático NÃO congela o LCP
 * (só input real o faz), pelo que medir LCP enquanto se percorre a página
 * promove blocos grandes mais abaixo a candidatos e inflaciona o número. O
 * LCP é medido no carregamento, parado; o CLS e as tarefas longas na fase de
 * scroll, que é onde os ScrollTriggers trabalham.
 */
const ROUTES = ['/', '/mz/energia-mineracao'];
const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});

for (const route of ROUTES) {
  for (const [label, width, height] of [['desktop', 1440, 900], ['mobile', 390, 844]]) {
    const ctx = await browser.newContext({ viewport: { width, height } });
    const page = await ctx.newPage();
    const cdp = await ctx.newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });

    await page.goto('http://127.0.0.1:3000' + route, { waitUntil: 'load' });

    // Fase 1 — LCP no carregamento, sem scroll.
    const lcp = await page.evaluate(
      () =>
        new Promise((resolve) => {
          let v = 0;
          new PerformanceObserver((l) => {
            for (const e of l.getEntries()) v = Math.max(v, e.startTime);
          }).observe({ type: 'largest-contentful-paint', buffered: true });
          setTimeout(() => resolve(Math.round(v)), 2500);
        }),
    );

    // Fase 2 — CLS e tarefas longas ao percorrer a página.
    const scroll = await page.evaluate(
      () =>
        new Promise((resolve) => {
          let cls = 0;
          const long = [];
          new PerformanceObserver((l) => {
            for (const e of l.getEntries()) if (!e.hadRecentInput) cls += e.value;
          }).observe({ type: 'layout-shift', buffered: true });
          new PerformanceObserver((l) => {
            for (const e of l.getEntries()) if (e.duration > 50) long.push(Math.round(e.duration));
          }).observe({ type: 'longtask' });

          const step = Math.round(window.innerHeight * 0.8);
          let y = 0;
          const timer = setInterval(() => {
            y += step;
            window.scrollTo(0, y);
            if (y > document.body.scrollHeight) {
              clearInterval(timer);
              setTimeout(() => resolve({ cls: +cls.toFixed(4), long }), 900);
            }
          }, 130);
        }),
    );

    const st = await page.evaluate(() => window.__AGORAMOZ_ST__?.getAll?.().length ?? -1);
    const ok = lcp < 2500 && scroll.cls < 0.1;
    console.log(
      `${ok ? 'OK   ' : 'REVER'} ${route.padEnd(24)} ${label.padEnd(8)} LCP=${String(lcp).padStart(5)}ms  CLS=${String(scroll.cls).padEnd(7)} tarefas>50ms=${String(scroll.long.length).padEnd(2)} máx=${scroll.long.length ? Math.max(...scroll.long) : 0}ms  ST=${st}`,
    );
    await ctx.close();
  }
}
await browser.close();
