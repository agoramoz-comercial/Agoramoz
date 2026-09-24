import { chromium } from '@playwright/test';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox','--disable-dev-shm-usage'] });
const p = await b.newPage({ viewport: { width: 390, height: 900 } });
await p.goto('http://127.0.0.1:3000/', { waitUntil: 'networkidle' });
await p.waitForTimeout(1200);
const h = p.locator('[data-hero-title]');
await h.screenshot({ path: '/home/user/Agoramoz/.qa/dbg-h1-clip.png' });
// 1) sem clip, só o gradiente
await p.evaluate(() => { const e=document.querySelector('[data-hero-title]'); e.style.webkitBackgroundClip='border-box'; e.style.backgroundClip='border-box'; e.style.webkitTextFillColor='red'; });
await h.screenshot({ path: '/home/user/Agoramoz/.qa/dbg-h1-noclip.png' });
// 2) gradiente inline, clip ao texto
await p.evaluate(() => { const e=document.querySelector('[data-hero-title]');
  e.style.backgroundImage='linear-gradient(100deg,#fff 0%,#9ea0a8 50%,#fff 100%)';
  e.style.backgroundSize='100% 100%'; e.style.backgroundPosition='0% 50%';
  e.style.webkitBackgroundClip='text'; e.style.backgroundClip='text'; e.style.webkitTextFillColor='transparent'; });
await h.screenshot({ path: '/home/user/Agoramoz/.qa/dbg-h1-inline.png' });
await b.close(); console.log('ok');
