import { chromium } from '@playwright/test';
import { readFileSync, readdirSync } from 'node:fs';

/**
 * Compara, pixel a pixel, duas pastas de capturas de `.qa/referencia-visual.mjs`.
 * Diz, por ficheiro, quantas linhas diferem e onde — «o design não mudou»
 * passa a ser um número, não uma impressão.
 */
const [A, B] = [process.env.ANTES, process.env.DEPOIS];
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage();
for (const f of readdirSync(A).filter((x) => x.endsWith('.png')).sort()) {
  const uri = (d) => 'data:image/png;base64,' + readFileSync(`${d}/${f}`).toString('base64');
  const r = await p.evaluate(async ([a, c]) => {
    const load = (s) => new Promise((ok) => { const i = new Image(); i.onload = () => ok(i); i.src = s; });
    const [X, Y] = await Promise.all([load(a), load(c)]);
    const w = X.width, h = Math.min(X.height, Y.height);
    const px = (img) => { const k = document.createElement('canvas'); k.width = w; k.height = h; const x = k.getContext('2d'); x.drawImage(img, 0, 0); return x.getImageData(0, 0, w, h).data; };
    const da = px(X), db = px(Y); const linhas = [];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x += 2) { const i = (y * w + x) * 4; if (Math.abs(da[i] - db[i]) + Math.abs(da[i + 1] - db[i + 1]) + Math.abs(da[i + 2] - db[i + 2]) > 60) { linhas.push(y); break; } }
    return { alturas: `${X.height}→${Y.height}`, diferentes: linhas.length, de: linhas[0], ate: linhas.at(-1) };
  }, [uri(A), uri(B)]);
  console.log(f.padEnd(28), JSON.stringify(r));
}
await b.close();
