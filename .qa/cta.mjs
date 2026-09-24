import { chromium } from '@playwright/test';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox','--disable-dev-shm-usage'] });
for (const [label, w, h] of [['mobile',390,844],['tablet',768,1024]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h } });
  const p = await ctx.newPage();
  await p.goto('http://127.0.0.1:3000/', { waitUntil: 'networkidle' });
  await p.waitForTimeout(800);
  await p.screenshot({ path: `/home/user/Agoramoz/.qa/v4-cta-topo-${label}.png` });
  await p.evaluate(() => window.scrollTo(0, window.innerHeight * 2));
  await p.waitForTimeout(900);
  await p.screenshot({ path: `/home/user/Agoramoz/.qa/v4-cta-meio-${label}.png` });
  // no fim da página a barra tem de sair
  await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await p.waitForTimeout(1000);
  await p.screenshot({ path: `/home/user/Agoramoz/.qa/v4-cta-fim-${label}.png` });
  const y = await p.evaluate(() => {
    const el = document.querySelector('[data-mobile-cta]');
    return el ? Math.round(el.getBoundingClientRect().top - window.innerHeight) : null;
  });
  console.log(label, 'barra no fim: offset relativo ao fundo =', y, '(positivo = escondida)');
  await ctx.close();
}
await b.close();
