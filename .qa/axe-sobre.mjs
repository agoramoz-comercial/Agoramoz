import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
const ctx = await b.newContext({ viewport:{width:1440,height:900} });
const p = await ctx.newPage();
await p.goto('http://127.0.0.1:3000/sobre', { waitUntil:'networkidle' });
await p.locator('.perfil-cartao').first().scrollIntoViewIfNeeded();
await p.waitForTimeout(900);

for (const [nome, prep] of [['repouso', async()=>{}], ['activo', async()=>{ await p.locator('.perfil-cartao').first().hover(); await p.waitForTimeout(600); }]]) {
  await prep();
  const r = await new AxeBuilder({ page: p }).withTags(['wcag2a','wcag2aa','wcag22aa']).analyze();
  const graves = r.violations.filter(v=>['critical','serious'].includes(v.impact));
  console.log(`/sobre (${nome}): ${r.violations.length} violações, ${graves.length} graves`);
  for (const v of r.violations) console.log(`   [${v.impact}] ${v.id}: ${v.nodes.length} nós — ${v.nodes[0]?.html.slice(0,80)}`);
}
await b.close();
