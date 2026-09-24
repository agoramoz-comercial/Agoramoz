import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const SOLS = ['websites-avancados', 'software-empresarial', 'agentes-ia', 'infraestrutura-digital'];
const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});

for (const s of SOLS) {
  for (const [label, width, height] of [['desktop', 1440, 900], ['mobile', 390, 844]]) {
    const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 2 });
    const page = await ctx.newPage();
    const errs = [];
    page.on('pageerror', (e) => errs.push(e.message));
    page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });

    await page.goto(`http://127.0.0.1:3000/solucoes/${s}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    // Percorrer antes de capturar: o fullPage redimensiona o viewport e o
    // ScrollTrigger não recalcula, pelo que as revelações ficariam por disparar.
    const docH = await page.evaluate(() => document.body.scrollHeight);
    for (let y = 0; y < docH; y += Math.round(height * 0.7)) {
      await page.evaluate((v) => window.scrollTo(0, v), y);
      await page.waitForTimeout(120);
    }
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(600);
    await page.screenshot({ path: `.qa/sol-${s}-${label}.png`, fullPage: true });

    if (label === 'desktop') {
      const scan = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();
      const hidden = await page.evaluate(() =>
        [...document.querySelectorAll('[data-animate]')].filter((el) => {
          const st = getComputedStyle(el);
          return st.visibility === 'hidden' || Number(st.opacity) < 0.05;
        }).length,
      );
      console.log(
        `${s.padEnd(24)} axe=${scan.violations.length} escondidos=${hidden} consola=${errs.length ? errs[0].slice(0, 40) : 'limpa'}`,
      );
    }
    await ctx.close();
  }
}
await browser.close();
