import { chromium } from '@playwright/test';
/**
 * A regra vinculativa do bolbo, em código: NENHUM texto por cima dele.
 *
 * Os rácios de contraste do globals.css foram calculados contra superfícies
 * fixas. Um fundo que se mexe por baixo de texto invalida-os todos, e nenhuma
 * ferramenta de acessibilidade apanha isso — o axe não sabe ler um canvas.
 */
const b = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--no-sandbox','--disable-dev-shm-usage','--use-gl=swiftshader','--enable-unsafe-swiftshader'],
});
let falhas = 0;
for (const w of [1024, 1280, 1440, 1920]) {
  const p = await b.newPage({ viewport: { width: w, height: 900 } });
  await p.goto('http://127.0.0.1:3000/', { waitUntil: 'load' });
  await p.waitForTimeout(2600);
  const r = await p.evaluate(() => {
    const c = document.querySelector('canvas');
    if (!c) return { semCanvas: true, colisoes: [] };
    const cb = c.getBoundingClientRect();
    const colisoes = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      const txt = (node.textContent || '').trim();
      if (txt.length < 2) continue;
      const el = node.parentElement;
      if (!el || el.closest('[aria-hidden="true"]')) continue;
      const cs = getComputedStyle(el);
      if (cs.visibility === 'hidden' || cs.display === 'none' || cs.opacity === '0') continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      const overlap =
        r.left < cb.right && r.right > cb.left && r.top < cb.bottom && r.bottom > cb.top;
      if (!overlap) continue;
      // Fundo opaco próprio protege o texto — não é sobreposição a valer.
      const bg = cs.backgroundColor;
      const opaco = bg && !/rgba\(.*,\s*0(\.\d+)?\)/.test(bg) && bg !== 'transparent';
      if (opaco) continue;
      colisoes.push(`${el.tagName} "${txt.slice(0, 40)}"`);
    }
    return { semCanvas: false, canvas: [Math.round(cb.left), Math.round(cb.right)], colisoes: [...new Set(colisoes)] };
  });
  if (r.semCanvas) { console.log(`${w}px  sem canvas (esperado abaixo de 1024)`); }
  else if (r.colisoes.length) {
    falhas += r.colisoes.length;
    console.log(`${w}px  ${r.colisoes.length} TEXTOS por cima do bolbo (canvas x ${r.canvas[0]}..${r.canvas[1]}):`);
    for (const c of r.colisoes.slice(0, 8)) console.log('     ' + c);
  } else {
    console.log(`${w}px  nenhum texto por cima do bolbo (canvas x ${r.canvas[0]}..${r.canvas[1]})`);
  }
  await p.close();
}
await b.close();
console.log(falhas === 0 ? '\nRegra respeitada em todas as larguras.' : `\n${falhas} violações.`);
