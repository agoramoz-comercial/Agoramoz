#!/usr/bin/env node
/*
 * Render a ZABATAINA editorial report (HTML) to an A4 PDF, optionally with PNG previews.
 *
 *   node scripts/render_pdf.js <input.html> [output.pdf] [--png] [--scale 1|2]
 *
 * Requires Playwright (require('playwright')) with Chromium.
 * Waits for web fonts and for window.__chartsReady (set by ZChart.autoRender()).
 */
const path = require('path');
let chromium;
try { ({ chromium } = require('playwright')); }
catch (e) { console.error('Playwright not found. Install it (npm i playwright) or run where it is available.'); process.exit(2); }

(async () => {
  const args = process.argv.slice(2);
  const input = args.find(a => !a.startsWith('--'));
  if (!input) { console.error('usage: node render_pdf.js <input.html> [output.pdf] [--png] [--scale 2]'); process.exit(2); }
  const positional = args.filter(a => !a.startsWith('--'));
  const output = positional[1] || input.replace(/\.html?$/i, '') + '.pdf';
  const png = args.includes('--png');
  const si = args.indexOf('--scale');
  const scale = si >= 0 ? Number(args[si + 1]) || 1 : 1;

  const launchOpts = {};
  if (process.env.CHROMIUM_PATH) launchOpts.executablePath = process.env.CHROMIUM_PATH;
  const browser = await chromium.launch(launchOpts);
  const page = await browser.newPage({ viewport: { width: 1000, height: 1300 }, deviceScaleFactor: scale });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.text()); });

  await page.goto('file://' + path.resolve(input), { waitUntil: 'networkidle', timeout: 60000 });
  await page.evaluate(() => document.fonts && document.fonts.ready);
  const hasCharts = await page.evaluate(() => !!document.querySelector('[data-chart]'));
  if (hasCharts) {
    await page.waitForFunction(() => window.__chartsReady === true, null, { timeout: 20000 })
      .catch(() => errors.push('Charts did not signal ready (call ZChart.autoRender()).'));
  }
  await page.waitForTimeout(300);

  if (png) {
    const pages = await page.$$('.page');
    const stem = output.replace(/\.pdf$/i, '');
    for (let i = 0; i < pages.length; i++) {
      await pages[i].screenshot({ path: `${stem}-p${String(i + 1).padStart(2, '0')}.png` });
    }
    console.log(`PNG previews: ${pages.length} page(s) → ${stem}-pNN.png`);
  }

  await page.emulateMedia({ media: 'print' });
  await page.pdf({ path: output, preferCSSPageSize: true, printBackground: true });
  const n = await page.evaluate(() => document.querySelectorAll('.page').length);
  console.log(`PDF: ${output} (${n} page(s))`);

  // Overflow check: content taller than its page is clipped — report it.
  const overflow = await page.evaluate(() => [...document.querySelectorAll('.page')].map((p, i) => {
    const body = p.querySelector('.page-body') || p;
    return body.scrollHeight > body.clientHeight + 2 ? i + 1 : null;
  }).filter(Boolean));
  if (overflow.length) console.warn('WARNING: content overflows on page(s): ' + overflow.join(', '));

  // v2.1 — Equilíbrio: página com mais de um terço vazio em baixo (capa e páginas com data-nofill à parte).
  const underfill = await page.evaluate(() => [...document.querySelectorAll('.page')].map((p, i) => {
    const flow = p.querySelector('.flow');
    const body = p.querySelector('.page-body');
    if (!flow || !body || p.hasAttribute('data-nofill')) return null;
    const blks = [...flow.querySelectorAll(':scope > .blk, :scope > .blk-group')];
    if (!blks.length) return null;
    const last = Math.max(...blks.map(b => b.getBoundingClientRect().bottom));
    const empty = (body.getBoundingClientRect().bottom - last) / body.getBoundingClientRect().height;
    return empty > 0.33 ? `${i + 1} (${Math.round(empty * 100)}% vazia)` : null;
  }).filter(Boolean));
  if (underfill.length) console.warn('WARNING: underfilled page(s): ' + underfill.join(', ') +
    ' — use "align": "spread", a {"type":"push"} block, or add useful content.');

  // v2.1 — Sobreposição: um cartão cujo conteúdo é mais alto do que ele, ou blocos seguidos que se tocam.
  const overlap = await page.evaluate(() => {
    const out = [];
    document.querySelectorAll('.page').forEach((p, i) => {
      p.querySelectorAll('.chart-card').forEach(c => { if (c.scrollHeight > c.clientHeight + 2) out.push(`${i + 1} (gráfico «${(c.querySelector('h4') || {}).textContent || ''}» mais alto do que o cartão)`); });
      const blks = [...p.querySelectorAll('.flow > .blk, .flow > .blk-group')];
      for (let k = 1; k < blks.length; k++) {
        if (blks[k].getBoundingClientRect().top < blks[k - 1].getBoundingClientRect().bottom - 1) out.push(`${i + 1} (blocos ${k} e ${k + 1})`);
      }
    });
    return out;
  });
  if (overlap.length) console.warn('WARNING: overlapping content on page(s): ' + overlap.join(', '));
  if (errors.length) console.warn('Console warnings/errors:\n - ' + errors.join('\n - '));
  await browser.close();
})();
