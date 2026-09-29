import { chromium } from '@playwright/test';

const base = 'http://127.0.0.1:3000';
const larguras = { mobile: 390, tablet: 768, web: 1440 };
const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});

async function tirar(nome, rota, largura, { js = true, hover = false } = {}) {
  const ctx = await browser.newContext({
    viewport: { width: largura, height: 900 },
    javaScriptEnabled: js,
    deviceScaleFactor: 2,
  });
  const page = await ctx.newPage();
  const falhas = [];
  page.on('response', (r) => { if (r.status() >= 400) falhas.push(`${r.status()} ${r.url()}`); });
  await page.goto(base + rota, { waitUntil: 'networkidle' });
  const cartao = page.locator('.perfil-cartao').first();
  await cartao.scrollIntoViewIfNeeded();
  await page.waitForTimeout(700);
  if (hover) { await cartao.hover(); await page.waitForTimeout(500); }
  const caixa = await page.locator('.perfil-cartao').first().boundingBox();
  const lista = await page.locator('.perfil-cartao').first().locator('xpath=ancestor::ul').boundingBox();
  await page.screenshot({
    path: `.qa/${nome}.png`,
    clip: lista ? { x: lista.x, y: lista.y - 8, width: lista.width, height: Math.min(lista.height + 16, 2400) } : undefined,
  });
  // O texto tem de estar no DOM em todos os cenários, com ou sem rato.
  const bio = await page.locator('.perfil-chapa p').first().innerText();
  const visivel = await page.locator('.perfil-chapa p').first().isVisible();
  console.log(`${nome.padEnd(28)} cartão ${caixa ? Math.round(caixa.width)+'×'+Math.round(caixa.height) : '—'} | bio ${bio.length} car., visível=${visivel} | ${falhas.length ? 'FALHAS: '+falhas.join(', ') : 'sem 4xx/5xx'}`);
  await ctx.close();
}

for (const [nome, w] of Object.entries(larguras)) await tirar(`v5-perfis-${nome}`, '/sobre', w);
await tirar('v5-perfis-web-hover', '/sobre', 1440, { hover: true });
await tirar('v5-perfis-sem-js', '/sobre', 1440, { js: false });
await tirar('v5-perfis-home', '/', 1440);
await browser.close();
