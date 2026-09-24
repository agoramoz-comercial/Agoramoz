import { chromium } from '@playwright/test';
const b = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--no-sandbox','--disable-dev-shm-usage','--use-gl=swiftshader','--enable-unsafe-swiftshader'],
});
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto('http://127.0.0.1:3000/', { waitUntil: 'load' });
await p.waitForTimeout(3000);
// espiar os eventos que o BROWSER dispara, independentemente do nosso código
await p.evaluate(() => {
  const c = document.querySelector('canvas');
  window.__ev = [];
  c.addEventListener('webglcontextlost', () => window.__ev.push('lost'));
  c.addEventListener('webglcontextrestored', () => window.__ev.push('restored'));
});
await p.evaluate(() => {
  const gl = document.querySelector('canvas').getContext('webgl2');
  window.__ext = gl.getExtension('WEBGL_lose_context');
  window.__ext.loseContext();
});
await p.waitForTimeout(600);
await p.evaluate(() => window.__ext.restoreContext());
for (const w of [1000, 2000, 3000]) {
  await p.waitForTimeout(1000);
  console.log(w + 'ms', await p.evaluate(() => {
    const c = document.querySelector('canvas');
    const gl = c.getContext('webgl2');
    return JSON.stringify({ eventos: window.__ev, perdido: gl.isContextLost() });
  }));
}
await b.close();
