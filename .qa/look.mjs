import { chromium } from '@playwright/test';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox','--disable-dev-shm-usage'] });
const out = '/home/user/Agoramoz/.qa';
for (const [name, w, h] of [['desktop',1440,900],['tablet',768,1024],['mobile',390,844]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = [];
  p.on('console', m => m.type() === 'error' && errs.push(m.text()));
  p.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  await p.goto('http://127.0.0.1:3000/', { waitUntil: 'networkidle' });
  await p.waitForTimeout(900);
  await p.screenshot({ path: `${out}/v2-hero-${name}.png` });
  await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight * 0.30));
  await p.waitForTimeout(1200);
  await p.screenshot({ path: `${out}/v2-mid-${name}.png` });
  await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight * 0.62));
  await p.waitForTimeout(1200);
  await p.screenshot({ path: `${out}/v2-low-${name}.png` });
  if (errs.length) console.log(name, 'ERROS:', errs.slice(0,5));
  await ctx.close();
}
await b.close();
console.log('feito');
