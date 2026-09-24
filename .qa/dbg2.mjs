import { chromium } from '@playwright/test';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox','--disable-dev-shm-usage'] });
for (const [n,w] of [['desktop',1440],['mobile',390]]) {
  const p = await b.newPage({ viewport: { width: w, height: 900 } });
  await p.goto('http://127.0.0.1:3000/', { waitUntil: 'networkidle' });
  await p.waitForTimeout(1500);
  const r = await p.evaluate(() => {
    const h = document.querySelector('[data-hero-title]');
    const cs = getComputedStyle(h);
    const rect = h.getBoundingClientRect();
    return {
      cls: h.className,
      opacity: cs.opacity, visibility: cs.visibility, color: cs.color,
      fill: cs.webkitTextFillColor, clip: cs.backgroundClip || cs.webkitBackgroundClip,
      bgImage: cs.backgroundImage.slice(0, 80),
      bgPos: cs.backgroundPosition, bgSize: cs.backgroundSize,
      rect: [Math.round(rect.width), Math.round(rect.height), Math.round(rect.top)],
      innerHTML: h.innerHTML.slice(0, 220),
      supports: CSS.supports('background-clip', 'text'),
      propReg: getComputedStyle(h).getPropertyValue('--chrome-pos'),
      chromeA: getComputedStyle(h).getPropertyValue('--chrome-a'),
    };
  });
  console.log(n, JSON.stringify(r, null, 1));
  await p.close();
}
await b.close();
