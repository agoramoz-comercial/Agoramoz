import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/** axe (WCAG 2.2 AA) numa lista de rotas, a 390 e 1440px. Sai com 1 se houver violações. */
const BASE = process.env.BASE ?? 'http://127.0.0.1:3000';
const ROTAS = (process.env.ROTAS ?? '/').split(',');

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
let total = 0;
for (const largura of [390, 1440]) {
  const ctx = await b.newContext({ viewport: { width: largura, height: 900 }, reducedMotion: 'reduce' });
  for (const rota of ROTAS) {
    const p = await ctx.newPage();
    await p.goto(BASE + rota, { waitUntil: 'networkidle' });
    await p.waitForTimeout(600);
    const r = await new AxeBuilder({ page: p }).withTags(['wcag2a', 'wcag2aa', 'wcag22aa']).analyze();
    total += r.violations.length;
    console.log(`${largura} ${rota}: ${r.violations.length} violações`);
    for (const v of r.violations) console.log(`   [${v.impact}] ${v.id}: ${v.nodes.length} nós — ${v.nodes[0]?.html.slice(0, 100)}`);
    await p.close();
  }
  await ctx.close();
}
await b.close();
process.exit(total > 0 ? 1 : 0);
