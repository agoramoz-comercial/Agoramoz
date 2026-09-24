import { chromium } from '@playwright/test';
const b = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--no-sandbox','--disable-dev-shm-usage','--use-gl=swiftshader','--enable-unsafe-swiftshader'],
});
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const p = await ctx.newPage();
p.on('console', m => { const t = m.text(); if (/chrome-blob|WebGL|shader/i.test(t)) console.log('CONSOLE:', t.slice(0,200)); });
p.on('pageerror', e => console.log('PAGEERROR:', e.message.slice(0,200)));
await p.goto('http://127.0.0.1:3000/', { waitUntil: 'load' });
await p.waitForTimeout(3500);
const info = await p.evaluate(() => {
  const c = document.querySelector('canvas');
  if (!c) return { canvas: false };
  const gl = c.getContext('webgl2');
  return {
    canvas: true,
    w: c.width, h: c.height,
    cssW: Math.round(c.getBoundingClientRect().width),
    contextoVivo: !!gl && !gl.isContextLost(),
  };
});
console.log('canvas:', JSON.stringify(info));
await p.screenshot({ path: '/home/user/Agoramoz/.qa/v4-blob-desktop.png' });
await b.close();
