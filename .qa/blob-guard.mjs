import { chromium } from '@playwright/test';
/** O bolbo tem de recusar renderizadores por software — e dizê-lo. */
const b = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--no-sandbox','--disable-dev-shm-usage','--use-gl=swiftshader','--enable-unsafe-swiftshader'],
});
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
const avisos = [];
p.on('console', m => { if (/chrome-blob/.test(m.text())) avisos.push(m.text()); });
await p.goto('http://127.0.0.1:3000/', { waitUntil: 'load' });
await p.waitForTimeout(3500);
const temCanvas = await p.evaluate(() => !!document.querySelector('canvas'));
const nome = await p.evaluate(() => {
  const c = document.createElement('canvas');
  const gl = c.getContext('webgl2');
  const e = gl?.getExtension('WEBGL_debug_renderer_info');
  return e ? gl.getParameter(e.UNMASKED_RENDERER_WEBGL) : 'mascarado';
});
console.log('renderizador deste ambiente:', nome);
console.log('canvas montado:', temCanvas);
console.log('avisos:', avisos.length ? avisos.join(' | ') : '(nenhum)');
console.log(!temCanvas ? 'GUARDA ATIVO — caiu para a malha SVG, como desenhado' : 'canvas montado (GPU real)');
await b.close();
