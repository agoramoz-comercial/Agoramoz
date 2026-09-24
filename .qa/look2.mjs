import { chromium } from '@playwright/test';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox','--disable-dev-shm-usage'] });
const out = '/home/user/Agoramoz/.qa';
const shots = [
  ['home-mercados', '/', 0.42],
  ['home-equipa', '/', 0.80],
  ['home-hero', '/', 0],
  ['contactos', '/contactos', 0],
  ['rodape', '/contactos', 1],
];
for (const [name, path, frac] of shots) {
  for (const [label, w, h] of [['mobile',390,844],['tablet',768,1024],['web',1440,900]]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h } });
    const p = await ctx.newPage();
    await p.goto('http://127.0.0.1:3000' + path, { waitUntil: 'networkidle' });
    await p.evaluate(async () => { const s = innerHeight * 0.75;
      for (let y = 0; y < document.body.scrollHeight; y += s) { scrollTo(0, y); await new Promise(r => setTimeout(r, 90)); } });
    await p.evaluate((f) => scrollTo(0, (document.body.scrollHeight - innerHeight) * f), frac);
    await p.waitForTimeout(900);
    await p.screenshot({ path: `${out}/v3-${name}-${label}.png` });
    await ctx.close();
  }
}
await b.close(); console.log('feito');
