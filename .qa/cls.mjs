import { chromium } from '@playwright/test';
const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
await page.goto('http://127.0.0.1:3000/', { waitUntil: 'load' });

const shifts = await page.evaluate(
  () =>
    new Promise((resolve) => {
      const out = [];
      new PerformanceObserver((l) => {
        for (const e of l.getEntries()) {
          if (e.hadRecentInput) continue;
          out.push({
            value: +e.value.toFixed(4),
            t: Math.round(e.startTime),
            sources: (e.sources || []).slice(0, 2).map((s) => ({
              tag: s.node?.tagName,
              cls: (s.node?.className || '').toString().slice(0, 70),
              id: s.node?.id || '',
              from: `${Math.round(s.previousRect.y)}`,
              to: `${Math.round(s.currentRect.y)}`,
            })),
          });
        }
      }).observe({ type: 'layout-shift', buffered: true });

      const step = Math.round(window.innerHeight * 0.8);
      let y = 0;
      const timer = setInterval(() => {
        y += step;
        window.scrollTo(0, y);
        if (y > document.body.scrollHeight) {
          clearInterval(timer);
          setTimeout(() => resolve(out.sort((a, b) => b.value - a.value).slice(0, 8)), 900);
        }
      }, 130);
    }),
);
console.log(JSON.stringify(shifts, null, 1));
await browser.close();
