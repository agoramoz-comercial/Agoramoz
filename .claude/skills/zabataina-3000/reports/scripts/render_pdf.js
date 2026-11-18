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
  if (errors.length) console.warn('Console warnings/errors:\n - ' + errors.join('\n - '));
  await browser.close();
})();
