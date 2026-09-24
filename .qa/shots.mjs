import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import fs from 'node:fs';

const BASE = 'http://127.0.0.1:3000';
const ROUTES = [
  ['home', '/'],
  ['mz', '/mz'],
  ['setor-mz-energia', '/mz/energia-mineracao'],
  ['solucao-automacao', '/solucoes/automacao-de-processos'],
  ['diagnostico', '/diagnostico'],
  ['sobre', '/sobre'],
  ['contactos', '/contactos'],
];

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});

const results = { a11y: [], console: [], motion: null };

for (const [name, path] of ROUTES) {
  for (const [label, width, height] of [['desktop', 1440, 900], ['laptop', 1024, 768], ['tablet', 768, 1024], ['mobile', 390, 844]]) {
    const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 2 });
    const page = await ctx.newPage();
    const msgs = [];
    page.on('console', (m) => { if (m.type() === 'error') msgs.push(m.text()); });
    page.on('pageerror', (e) => msgs.push(`pageerror: ${e.message}`));

    await page.goto(BASE + path, { waitUntil: 'networkidle' });
    await page.waitForTimeout(900);
    // Percorrer a página primeiro: o fullPage redimensiona o viewport e o
    // ScrollTrigger não recalcula, pelo que as revelações ficariam por disparar.
    const docH = await page.evaluate(() => document.body.scrollHeight);
    for (let y = 0; y < docH; y += Math.round(height * 0.7)) {
      await page.evaluate((v) => window.scrollTo(0, v), y);
      await page.waitForTimeout(140);
    }
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(700);
    await page.screenshot({ path: `.qa/${name}-${label}.png`, fullPage: true });

    if (msgs.length) results.console.push({ path, label, msgs });

    if (label === 'desktop') {
      const scan = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
      const serious = scan.violations.filter((v) => ['critical', 'serious'].includes(v.impact));
      results.a11y.push({
        path,
        total: scan.violations.length,
        serious: serious.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length, help: v.help })),
      });
    }
    await ctx.close();
  }
}

// Fuga de ScrollTrigger entre navegações SPA
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(BASE + '/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  const counts = [];
  for (let i = 0; i < 4; i++) {
    await page.click('a[href="/mz/energia-mineracao"]').catch(() => page.goto(BASE + '/mz/energia-mineracao'));
    await page.waitForTimeout(700);
    await page.goBack();
    await page.waitForTimeout(700);
    counts.push(await page.evaluate(() => window.__AGORAMOZ_ST__?.getAll?.().length ?? -1));
  }
  results.motion = { scrollTriggerCounts: counts };
  await ctx.close();
}

// Reduced motion: conteúdo tem de ficar visível
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.goto(BASE + '/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  const hidden = await page.evaluate(() =>
    [...document.querySelectorAll('[data-animate]')].filter((el) => {
      const s = getComputedStyle(el);
      return s.visibility === 'hidden' || Number(s.opacity) === 0;
    }).length,
  );
  const total = await page.locator('[data-animate]').count();
  results.reducedMotion = { total, hidden };
  await page.screenshot({ path: '.qa/home-reduced-motion.png', fullPage: true });
  await ctx.close();
}

await browser.close();
fs.writeFileSync('.qa/report.json', JSON.stringify(results, null, 2));
console.log(JSON.stringify(results, null, 2));
