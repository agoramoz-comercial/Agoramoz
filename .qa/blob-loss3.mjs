import { chromium } from '@playwright/test';
import fs from 'node:fs';
/** Prova de que o bolbo VOLTA A DESENHAR depois de o contexto se perder. */
const b = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--no-sandbox','--disable-dev-shm-usage','--use-gl=swiftshader','--enable-unsafe-swiftshader'],
});
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
const erros = [];
p.on('pageerror', e => erros.push(e.message));
await p.goto('http://127.0.0.1:3000/', { waitUntil: 'load' });
await p.waitForTimeout(3000);

const shot = async (nome) => {
  const buf = await p.locator('canvas').screenshot();
  fs.writeFileSync(`/home/user/Agoramoz/.qa/v4-loss-${nome}.png`, buf);
  // fração de píxeis não transparentes/não pretos
  return p.evaluate(() => {
    const c = document.querySelector('canvas');
    const gl = c.getContext('webgl2');
    if (!gl || gl.isContextLost()) return { desenhado: 0, perdido: true };
    const px = new Uint8Array(4 * 64 * 64);
    gl.readPixels(0, 0, 64, 64, gl.RGBA, gl.UNSIGNED_BYTE, px);
    let n = 0;
    for (let i = 3; i < px.length; i += 4) if (px[i] > 8) n++;
    return { desenhado: +(n / (64 * 64)).toFixed(3), perdido: false };
  });
};

console.log('antes da perda ', JSON.stringify(await shot('antes')));
await p.evaluate(() => {
  const gl = document.querySelector('canvas').getContext('webgl2');
  window.__ext = gl.getExtension('WEBGL_lose_context');
  window.__ext.loseContext();
});
await p.waitForTimeout(500);
console.log('com o contexto perdido', JSON.stringify(await shot('durante')));
await p.evaluate(() => window.__ext.restoreContext());
await p.waitForTimeout(3000);
const depois = await shot('depois');
console.log('depois do restauro', JSON.stringify(depois));
console.log('erros de página:', erros.length ? erros.join(' | ') : 'nenhum');
console.log(!depois.perdido && depois.desenhado > 0.01 && erros.length === 0 ? 'RECUPEROU E VOLTOU A DESENHAR' : 'NÃO RECUPEROU');
await b.close();
