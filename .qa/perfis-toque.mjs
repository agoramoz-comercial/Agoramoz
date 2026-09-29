import { chromium } from '@playwright/test';
const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox','--disable-dev-shm-usage'] });

// Telemóvel a sério: hasTouch + isMobile fazem o Chromium reportar
// `hover: none` e `pointer: coarse`, que é o ramo onde a chapa fica no fluxo.
const ctx = await b.newContext({ viewport:{width:390,height:844}, hasTouch:true, isMobile:true, deviceScaleFactor:3 });
const p = await ctx.newPage();
await p.goto('http://127.0.0.1:3000/sobre', { waitUntil:'networkidle' });
await p.locator('.perfil-cartao').first().scrollIntoViewIfNeeded();
await p.waitForTimeout(800);
const r = await p.evaluate(() => {
  const ch = document.querySelector('.perfil-chapa');
  const cs = getComputedStyle(ch);
  return {
    hoverNone: matchMedia('(hover: none)').matches,
    pointerCoarse: matchMedia('(pointer: coarse)').matches,
    chapaPos: cs.position, chapaOpacity: cs.opacity,
    chapaVisivel: ch.getBoundingClientRect().height > 40,
  };
});
console.log('toque:', JSON.stringify(r));
const ul = await p.locator('.perfil-cartao').first().locator('xpath=ancestor::ul').boundingBox();
await p.screenshot({ path:'.qa/v5-perfis-toque.png', clip:{x:ul.x,y:ul.y-8,width:ul.width,height:Math.min(ul.height+16,2400)} });

// Teclado: Tab até à ligação do LinkedIn revela a chapa por :focus-within.
const ctx2 = await b.newContext({ viewport:{width:1440,height:900}, deviceScaleFactor:2 });
const p2 = await ctx2.newPage();
await p2.goto('http://127.0.0.1:3000/sobre', { waitUntil:'networkidle' });
// O <li data-animate> arranca com visibility:hidden até o GSAP o revelar, e
// um elemento invisível não recebe foco. Sem este scroll o teste focava a
// ligação «saltar para o conteúdo» e media a coisa errada.
await p2.locator('.perfil-cartao').first().scrollIntoViewIfNeeded();
await p2.waitForTimeout(900);
await p2.locator('.perfil-cartao a').first().focus();
await p2.waitForTimeout(500);
const foco = await p2.evaluate(() => {
  const ch = document.querySelector('.perfil-chapa');
  return { opacidade: getComputedStyle(ch).opacity, focado: document.activeElement?.textContent?.slice(0,40) };
});
console.log('teclado:', JSON.stringify(foco));
const ul2 = await p2.locator('.perfil-cartao').first().boundingBox();
await p2.screenshot({ path:'.qa/v5-perfis-teclado.png', clip:{x:ul2.x-4,y:ul2.y-4,width:ul2.width+8,height:ul2.height+8} });

// Movimento reduzido: a troca continua a acontecer, sem transição.
const ctx3 = await b.newContext({ viewport:{width:1440,height:900}, reducedMotion:'reduce', deviceScaleFactor:2 });
const p3 = await ctx3.newPage();
await p3.goto('http://127.0.0.1:3000/sobre', { waitUntil:'networkidle' });
await p3.locator('.perfil-cartao').first().scrollIntoViewIfNeeded();
await p3.waitForTimeout(600);
await p3.locator('.perfil-cartao').first().hover();
await p3.waitForTimeout(200);
const mr = await p3.evaluate(() => {
  const ch = document.querySelector('.perfil-chapa'), im = document.querySelector('.perfil-retrato');
  return { chapa: getComputedStyle(ch).opacity, transicao: getComputedStyle(ch).transitionDuration,
           retratoTransform: getComputedStyle(im).transform };
});
console.log('movimento reduzido:', JSON.stringify(mr));
await b.close();
