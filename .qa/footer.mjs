import { chromium } from '@playwright/test';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox','--disable-dev-shm-usage'] });
for (const [label, w, h] of [['mobile',390,844],['tablet',768,1024],['web',1440,900]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h } });
  const p = await ctx.newPage();
  await p.goto('http://127.0.0.1:3000/contactos', { waitUntil: 'networkidle' });
  await p.evaluate(async () => { const s = innerHeight * 0.75;
    for (let y = 0; y < document.body.scrollHeight; y += s) { scrollTo(0, y); await new Promise(r => setTimeout(r, 80)); } });
  await p.waitForTimeout(600);
  await p.locator('footer').screenshot({ path: `/home/user/Agoramoz/.qa/v3-footer-${label}.png` });
  await ctx.close();
}
await b.close(); console.log('ok');
