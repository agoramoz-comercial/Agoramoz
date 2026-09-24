import { chromium } from '@playwright/test';
const b = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--no-sandbox','--disable-dev-shm-usage','--use-gl=swiftshader','--enable-unsafe-swiftshader'],
});
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto('http://127.0.0.1:3000/', { waitUntil: 'load' });
await p.waitForTimeout(2000);
await p.evaluate(async () => { const s = innerHeight * 0.8;
  for (let y = 0; y < document.body.scrollHeight; y += s) { scrollTo(0, y); await new Promise(r => setTimeout(r, 80)); } });
await p.evaluate(() => { const c = document.querySelector('canvas'); c?.scrollIntoView({ block: 'center' }); });
await p.waitForTimeout(3000);
await p.screenshot({ path: '/home/user/Agoramoz/.qa/v4-blob-cta.png' });
await b.close(); console.log('ok');
