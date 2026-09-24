import { chromium } from '@playwright/test';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox','--disable-dev-shm-usage'] });
for (const [label, w, h] of [['mobile',390,844],['tablet',768,1024],['web',1440,900]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h } });
  const p = await ctx.newPage();
  await p.goto('http://127.0.0.1:3000/sobre', { waitUntil: 'networkidle' });
  await p.evaluate(async () => { const s = innerHeight * 0.7;
    for (let y = 0; y < document.body.scrollHeight; y += s) { scrollTo(0, y); await new Promise(r => setTimeout(r, 90)); } });
  await p.waitForTimeout(700);
  const el = p.locator('li:has-text("Gerson Samussene")').first();
  await el.scrollIntoViewIfNeeded();
  await p.waitForTimeout(400);
  await el.screenshot({ path: `/home/user/Agoramoz/.qa/v3-fundador-${label}.png` });
  await ctx.close();
}
await b.close(); console.log('ok');
