import { chromium } from '@playwright/test';
const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});

for (const [label, width, height] of [['desktop', 1440, 900], ['mobile', 390, 844]]) {
  const ctx = await browser.newContext({ viewport: { width, height } });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await page.goto('http://127.0.0.1:3000/', { waitUntil: 'load' });

  // A) CLS só no carregamento — nenhum scroll. É o que um utilizador real vê.
  const loadCls = await page.evaluate(
    () => new Promise((res) => {
      let c = 0;
      new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) c += e.value; })
        .observe({ type: 'layout-shift', buffered: true });
      setTimeout(() => res(+c.toFixed(4)), 3000);
    }),
  );

  // B) CLS durante scroll suave, com o observador a arrancar limpo.
  const scrollCls = await page.evaluate(
    () => new Promise((res) => {
      let c = 0;
      const srcs = [];
      new PerformanceObserver((l) => {
        for (const e of l.getEntries()) {
          if (e.hadRecentInput) continue;
          c += e.value;
          for (const s of e.sources || []) srcs.push(s.node?.tagName + '.' + (s.node?.className || '').toString().slice(0, 40));
        }
      }).observe({ type: 'layout-shift' });
      let y = 0;
      const t = setInterval(() => {
        y += 240;
        window.scrollTo({ top: y, behavior: 'instant' });
        if (y > document.body.scrollHeight) {
          clearInterval(t);
          setTimeout(() => res({ cls: +c.toFixed(4), srcs: [...new Set(srcs)].slice(0, 3) }), 800);
        }
      }, 60);
    }),
  );

  console.log(`${label.padEnd(8)} CLS(carregamento)=${loadCls}   CLS(scroll)=${scrollCls.cls}  ${scrollCls.srcs.join(' | ')}`);
  await ctx.close();
}
await browser.close();
