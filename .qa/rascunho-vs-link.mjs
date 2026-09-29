import { chromium } from '@playwright/test';

/**
 * O link manda sobre o rascunho (revisão do lote D). Quem preenche o passo 1
 * como Moçambique e depois clica no CTA de /global/ch, no MESMO separador,
 * tem de chegar à Suíça — e sem o setor moçambicano pendurado.
 */
const BASE = process.env.BASE ?? 'http://127.0.0.1:3000';
const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
const p = await (await b.newContext({ viewport:{ width:1440, height:1100 } })).newPage();

await p.goto(`${BASE}/diagnostico?pais=mz`, { waitUntil:'networkidle' });
await p.getByRole('radiogroup', { name:'Setor' }).getByRole('radio').first().click();
await p.locator('form').getByRole('button', { name:'Continuar' }).click();
await p.waitForTimeout(500);
const guardado = await p.evaluate(() => Object.keys(sessionStorage).map((k) => sessionStorage.getItem(k)).join(' '));
console.log('rascunho guardado com mz:', guardado.includes('"mz"') ? '✓' : '✗');

await p.goto(`${BASE}/global/ch`, { waitUntil:'networkidle' });
await p.locator('a[href="/diagnostico?pais=ch"]').first().click();
await p.waitForURL('**/diagnostico?pais=ch');
await p.waitForTimeout(800);

const escolhidos = await p.locator('[role=radio][aria-checked=true]').allInnerTexts();
const suica = escolhidos.some((t) => t.includes('Suíça'));
const semMz = !escolhidos.some((t) => t.includes('Moçambique'));
const setorVazio = (await p.getByRole('radiogroup', { name:'Setor' }).locator('[aria-checked=true]').count()) === 0;
console.log('país do link (Suíça):', suica ? '✓' : '✗', '| Moçambique não reposto:', semMz ? '✓' : '✗', '| setor de outro mercado não reposto:', setorVazio ? '✓' : '✗');
await b.close();
process.exit(suica && semMz && setorVazio ? 0 : 1);
