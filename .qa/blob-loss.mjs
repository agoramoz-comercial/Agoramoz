import { chromium } from '@playwright/test';
/**
 * Perda de contexto — testada, não presumida.
 * O gl-boot faz preventDefault() e reconstrói; se isso não funcionar, uma troca
 * de GPU ou uma suspensão deixa um canvas morto no hero em produção.
 */
const b = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--no-sandbox','--disable-dev-shm-usage','--use-gl=swiftshader','--enable-unsafe-swiftshader'],
});
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
const logs = [];
p.on('console', m => { const t = m.text(); if (/chrome-blob/.test(t)) logs.push(t); });
p.on('pageerror', e => logs.push('PAGEERROR: ' + e.message));
await p.goto('http://127.0.0.1:3000/', { waitUntil: 'load' });
await p.waitForTimeout(3000);

const before = await p.evaluate(() => {
  const c = document.querySelector('canvas');
  const gl = c.getContext('webgl2');
  return { vivo: !!gl && !gl.isContextLost() };
});

// forçar a perda
await p.evaluate(() => {
  const c = document.querySelector('canvas');
  const gl = c.getContext('webgl2');
  gl.getExtension('WEBGL_lose_context')?.loseContext();
});
await p.waitForTimeout(400);
const during = await p.evaluate(() => {
  const gl = document.querySelector('canvas').getContext('webgl2');
  return { perdido: gl.isContextLost() };
});

await p.evaluate(() => {
  const gl = document.querySelector('canvas').getContext('webgl2');
  gl.getExtension('WEBGL_lose_context')?.restoreContext();
});
await p.waitForTimeout(2500);
const after = await p.evaluate(() => {
  const c = document.querySelector('canvas');
  const gl = c.getContext('webgl2');
  return { vivo: !!gl && !gl.isContextLost(), w: c.width };
});

console.log('antes  ', JSON.stringify(before));
console.log('durante', JSON.stringify(during));
console.log('depois ', JSON.stringify(after));
console.log('logs   ', logs.length ? logs.join(' | ') : '(nenhum)');
console.log(after.vivo && !logs.some(l => l.startsWith('PAGEERROR')) ? 'RECUPEROU' : 'FALHOU');
await b.close();
