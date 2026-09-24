import { chromium } from '@playwright/test';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox','--disable-dev-shm-usage'] });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto('http://127.0.0.1:3000/', { waitUntil: 'networkidle' });
await p.waitForTimeout(700);
await p.click('header a[href="/diagnostico"]');
for (const t of [90, 200, 340, 520]) {
  await p.waitForTimeout(t === 90 ? 90 : 110);
  await p.screenshot({ path: `/home/user/Agoramoz/.qa/v2-transicao-${t}.png` });
}
await b.close(); console.log('ok');
