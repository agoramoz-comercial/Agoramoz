import { chromium } from '@playwright/test';
const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox','--disable-dev-shm-usage'] });
const c = await b.newContext({ viewport:{width:1440,height:900} });
const p = await c.newPage();
await p.goto('http://127.0.0.1:3000/', { waitUntil:'networkidle' });
await p.waitForTimeout(900);
const radio = p.locator('[role="radio"]').first();
await radio.focus();
await p.keyboard.press('ArrowRight');
await p.keyboard.press('ArrowRight');
const checked = await p.locator('[role="radio"][aria-checked="true"]').first().textContent();
await p.keyboard.press('Tab'); // sair do radiogroup (roving tabindex)
const after = await p.evaluate(() => document.activeElement?.textContent?.trim().slice(0,30));
console.log('  seta direita selecionou:', JSON.stringify(checked?.trim().slice(0,40)));
console.log('  Tab seguinte foca:', JSON.stringify(after));
await b.close();
