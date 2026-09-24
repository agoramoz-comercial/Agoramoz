import { chromium } from '@playwright/test';
import fs from 'node:fs';

/**
 * Ligações ALCANÇÁVEIS por ecrã.
 *
 * Rastrear o HTML servido não chega: o que existe no DOM e o que uma pessoa
 * consegue mesmo tocar são coisas diferentes, e a diferença vive nos media
 * queries. Um CTA com `hidden sm:inline-flex` está no HTML em todas as larguras
 * e é invisível abaixo de 640px.
 *
 * Por isso este arnês, em cada viewport:
 *   1. abre a página e revela o conteúdo com scroll;
 *   2. abre o diálogo móvel e os mega-menus, porque metade da navegação vive lá;
 *   3. recolhe só as ligações com caixa visível;
 *   4. verifica as internas (200) e a forma das externas;
 *   5. compara os conjuntos entre ecrãs.
 *
 * O passo 5 é o que interessa: é ele que apanha uma ligação que existe no
 * computador e desaparece no telemóvel.
 */

const BASE = process.env.BASE ?? 'http://127.0.0.1:3000';
const ROUTES = ['/', '/mz', '/mz/energia-mineracao', '/solucoes', '/solucoes/agentes-ia',
                '/diagnostico', '/sobre', '/contactos', '/como-trabalhamos', '/privacidade'];
const VIEWPORTS = [['mobile', 390, 844], ['tablet', 768, 1024], ['web', 1440, 900]];

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});

/** Abre tudo o que esconde navegação, para que ela entre na recolha. */
async function openMenus(page, width) {
  if (width < 1024) {
    const burger = page.locator('header button[aria-label="Abrir menu"]');
    if (await burger.count()) {
      await burger.first().click().catch(() => {});
      await page.waitForTimeout(500);
    }
  } else {
    for (const label of ['Soluções', 'Setores']) {
      const tab = page.locator(`header nav button:has-text("${label}")`).first();
      if (await tab.count()) {
        await tab.click().catch(() => {});
        await page.waitForTimeout(350);
      }
    }
  }
}

async function collect(page) {
  return page.evaluate(() => {
    const out = [];
    for (const a of document.querySelectorAll('a[href]')) {
      const r = a.getBoundingClientRect();
      const cs = getComputedStyle(a);
      const visible =
        r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none';
      if (!visible) continue;

      // Nome acessível aproximado: aria-label, senão o texto, senão sr-only.
      const name = (a.getAttribute('aria-label') || a.innerText || a.textContent || '')
        .replace(/\s+/g, ' ')
        .trim();

      // Isenta pela WCAG 2.2: ligação no meio de uma frase.
      const inline =
        !!a.closest('p, li > span, label') && getComputedStyle(a).display.includes('inline');

      out.push({
        href: a.getAttribute('href'),
        name,
        inline,
        target: a.getAttribute('target'),
        rel: a.getAttribute('rel'),
        w: Math.round(r.width),
        h: Math.round(r.height),
      });
    }
    return out;
  });
}

const EXTERNAL_EXPECTED = {
  'www.linkedin.com': /^\/company\/[a-z0-9-]+$/,
  'mz.linkedin.com': /^\/in\/[a-z0-9-]+$/,
  'www.instagram.com': /^\/[a-z0-9._]+$/,
  'wa.me': /^\/[0-9]{8,15}$/,
};

const problems = [];
const soft = [];
const perViewport = {};

for (const [label, width, height] of VIEWPORTS) {
  const seen = new Map();
  const ctx = await browser.newContext({ viewport: { width, height } });
  const page = await ctx.newPage();

  for (const route of ROUTES) {
    await page.goto(BASE + route, { waitUntil: 'networkidle' });
    await page.evaluate(async () => {
      const step = window.innerHeight * 0.75;
      for (let y = 0; y < document.body.scrollHeight; y += step) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 70));
      }
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(450);
    await openMenus(page, width);

    for (const link of await collect(page)) {
      const key = `${link.href}`;
      if (!seen.has(key)) seen.set(key, { ...link, routes: [] });
      seen.get(key).routes.push(route);

      /**
       * Alvo de toque, com o limiar certo.
       *
       * A WCAG 2.2 AA (2.5.8, Target Size Minimum) exige 24x24 CSS px. Os 44px
       * são a recomendação de conforto da Apple e do Material, não um critério
       * de conformidade. Separar os dois evita transformar o relatório em ruído
       * — uma primeira versão deste arnês marcou 404 "problemas" por medir tudo
       * contra 44px, e enterrou as falhas a sério no meio.
       *
       * `inline` fica de fora: uma ligação dentro de uma frase está isenta pela
       * própria norma.
       */
      if (width < 1024 && link.href !== '#' && !link.inline) {
        if (link.h < 24 || link.w < 24) {
          problems.push(
            `[AA 2.5.8] ${label} ${route} ${link.w}x${link.h}px · ${link.href} · "${link.name.slice(0, 44)}"`,
          );
        } else if (link.h < 44) {
          soft.push(`[conforto] ${link.h}px · ${link.href} · "${link.name.slice(0, 44)}"`);
        }
      }
      if (!link.name) {
        problems.push(`[sem nome] ${label} ${route} · ${link.href}`);
      }
    }
  }

  perViewport[label] = seen;
  await ctx.close();
}

// ---------------------------------------------------- internas respondem 200
const internal = new Set();
for (const map of Object.values(perViewport)) {
  for (const href of map.keys()) {
    if (href.startsWith('/')) internal.add(href.split('#')[0] || '/');
  }
}
for (const path of [...internal].sort()) {
  const res = await fetch(BASE + path).catch(() => null);
  const code = res?.status ?? 0;
  if (code !== 200) problems.push(`[${code}] interna morta · ${path}`);
}

// ------------------------------------------------------- externas bem formadas
const externals = new Map();
for (const [label, map] of Object.entries(perViewport)) {
  for (const [href, link] of map) {
    if (!/^https?:/.test(href)) continue;
    const u = new URL(href);
    externals.set(href, link);
    const expected = EXTERNAL_EXPECTED[u.host];
    if (!expected) problems.push(`[externa] host inesperado em ${label} · ${href}`);
    else if (!expected.test(u.pathname)) problems.push(`[externa] caminho estranho · ${href}`);
    if (u.protocol !== 'https:') problems.push(`[externa] sem https · ${href}`);
    if (link.target !== '_blank') problems.push(`[externa] sem target=_blank · ${href}`);
    if (!(link.rel ?? '').includes('noopener')) problems.push(`[externa] sem rel=noopener · ${href}`);
  }
}

// ------------------------------------------------- diferenças entre ecrãs
const all = new Set(Object.values(perViewport).flatMap((m) => [...m.keys()]));
const diffs = [];
for (const href of all) {
  const missing = VIEWPORTS.map(([l]) => l).filter((l) => !perViewport[l].has(href));
  if (missing.length && missing.length < VIEWPORTS.length) {
    const present = VIEWPORTS.map(([l]) => l).filter((l) => perViewport[l].has(href));
    diffs.push({ href, present, missing });
  }
}

// ------------------------------------------------------------------ relatório
for (const [label] of VIEWPORTS) {
  console.log(`${label.padEnd(7)} ${perViewport[label].size} ligações alcançáveis`);
}

console.log(`\nExternas encontradas: ${externals.size}`);
for (const [href, l] of externals) console.log(`   ${href}  "${l.name.slice(0, 46)}"`);
console.log('   (destino NÃO verificável: a rede de saída deste ambiente bloqueia estes domínios)');

if (diffs.length) {
  console.log(`\nLigações que NÃO existem em todos os ecrãs (${diffs.length}):`);
  for (const d of diffs) console.log(`   ${d.href}\n      só em: ${d.present.join(', ')}  ·  falta em: ${d.missing.join(', ')}`);
} else {
  console.log('\nTodas as ligações existem nos três ecrãs.');
}

const unique = [...new Set(problems)];
console.log(`\nFalhas WCAG 2.2 AA: ${unique.length}`);
for (const p of unique.slice(0, 30)) console.log('   ' + p);

const softUnique = [...new Set(soft)];
console.log(`\nAbaixo dos 44px de conforto (não é falha): ${softUnique.length}`);
for (const p of softUnique.slice(0, 10)) console.log('   ' + p);

fs.writeFileSync('.qa/links-viewport.json', JSON.stringify({ diffs, problems: unique, soft: [...new Set(soft)] }, null, 2));
await browser.close();
