import { chromium } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';

/**
 * Fotografia do TEXTO do site público, para provar que um redesenho não muda
 * nenhuma palavra.
 *
 *   node .qa/texto-publico.mjs <BASE> <saida.json>                 tirar a fotografia
 *   node .qa/texto-publico.mjs <BASE> <saida.json> --comparar <ref.json>
 *
 * Lê os URLs do /sitemap.xml (mais extras fixos) e segue os links internos de
 * cada página (o sitemap não lista tudo), abre cada um com movimento
 * reduzido, rola até ao fim e guarda, por página: título, descrição, texto
 * visível (innerText, linha a linha), alt das imagens e aria-label de links e
 * botões. Fora: /admin, /qa, /api, documentos A4 dos cursos.
 *
 * Linhas que mudam sozinhas (relógio, datas relativas) filtram-se em VOLATIL.
 * Ao comparar, sai com código 1 se houver uma diferença.
 */

const [BASE = 'http://127.0.0.1:3111', SAIDA = 'texto-publico.json'] = process.argv.slice(2);
const iRef = process.argv.indexOf('--comparar');
const REF = iRef > 0 ? process.argv[iRef + 1] : null;
const EXTRAS = ['/nao-encontrado'];
const FORA = /^\/(admin|qa|api)(\/|$)|\/documento$/;
const VOLATIL = [/\b\d{1,2}:\d{2}(:\d{2})?\b/g];

const limpar = (s) => VOLATIL.reduce((t, re) => t.replace(re, '⟨hora⟩'), s.replace(/\s+/g, ' ').trim());

async function urls() {
  const xml = await (await fetch(`${BASE}/sitemap.xml`)).text();
  const caminhos = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname);
  return [...new Set([...caminhos, ...EXTRAS])].filter((p) => !FORA.test(p)).sort();
}

async function fotografar(pagina, caminho) {
  const r = await pagina.goto(`${BASE}${caminho}`, { waitUntil: 'networkidle', timeout: 60_000 });
  await pagina.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight && y < 60_000; y += 600) {
      window.scrollTo(0, y);
      await new Promise((ok) => setTimeout(ok, 30));
    }
    window.scrollTo(0, 0);
  });
  await pagina.waitForTimeout(300);
  const d = await pagina.evaluate(() => ({
    titulo: document.title,
    descricao: document.querySelector('meta[name="description"]')?.getAttribute('content') ?? '',
    texto: document.body.innerText,
    alts: [...document.querySelectorAll('img[alt]')].map((i) => i.getAttribute('alt')).filter(Boolean),
    rotulos: [...document.querySelectorAll('a[aria-label],button[aria-label],[role="button"][aria-label]')].map((e) =>
      e.getAttribute('aria-label'),
    ),
    links: [...document.querySelectorAll('a[href]')].map((a) => a.href),
  }));
  for (const h of d.links) {
    try {
      const u = new URL(h);
      if (u.origin === new URL(BASE).origin && !FORA.test(u.pathname) && !/\.[a-z0-9]{2,5}$/i.test(u.pathname)) descobrir(u.pathname);
    } catch {}
  }
  return {
    estado: r?.status() ?? 0,
    titulo: limpar(d.titulo),
    descricao: limpar(d.descricao),
    linhas: d.texto.split('\n').map(limpar).filter(Boolean),
    alts: d.alts.map(limpar),
    rotulos: d.rotulos.map(limpar),
  };
}

const lista = await urls();
const vistos = new Set(lista);
const TECTO = 4000;
function descobrir(c) {
  const p = c.length > 1 ? c.replace(/\/+$/, '') : c;
  if (!vistos.has(p) && vistos.size < TECTO) {
    vistos.add(p);
    lista.push(p);
  }
}
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
const foto = {};
const FILAS = 4;
let i = 0;
let activos = 0;
let feitas = 0;
await Promise.all(
  Array.from({ length: FILAS }, async () => {
    const p = await ctx.newPage();
    while (i < lista.length || activos > 0) {
      if (i >= lista.length) {
        await new Promise((ok) => setTimeout(ok, 200));
        continue;
      }
      const c = lista[i++];
      activos += 1;
      try {
        foto[c] = await Promise.race([
          fotografar(p, c),
          new Promise((_, nao) => setTimeout(() => nao(new Error('tempo esgotado (90 s)')), 90_000)),
        ]);
      } catch (e) {
        foto[c] = { erro: String(e).slice(0, 200) };
      }
      activos -= 1;
      feitas += 1;
      if (feitas % 100 === 0) console.error(`… ${feitas}/${lista.length}`);
    }
    await p.close();
  }),
);
await b.close();
const ordenado = Object.fromEntries(Object.keys(foto).sort().map((k) => [k, foto[k]]));
writeFileSync(SAIDA, JSON.stringify(ordenado, null, 1));
const erros = Object.entries(ordenado).filter(([, v]) => v.erro || v.estado >= 400);
console.log(`${lista.length} página(s) fotografadas → ${SAIDA}; ${erros.length} com erro ou estado ≥ 400.`);
if (vistos.size >= TECTO) console.log(`ATENÇÃO: chegou ao tecto de ${TECTO} páginas; a fotografia pode estar incompleta.`);
for (const [c, v] of erros.slice(0, 20)) console.log(`  ${c}: ${v.erro ?? v.estado}`);

if (REF) {
  const ref = JSON.parse(readFileSync(REF, 'utf8'));
  let dif = 0;
  let estilo = 0;
  const comparar = (c, campo, a, n) => {
    const A = Array.isArray(a) ? a : [a];
    const N = Array.isArray(n) ? n : [n];
    let sai = A.filter((x) => !N.includes(x));
    let entra = N.filter((x) => !A.includes(x));
    // Só maiúsculas/minúsculas (text-transform no CSS): é estilo, não texto.
    const baixo = (xs) => xs.map((x) => x.toLocaleLowerCase('pt'));
    const so = sai.filter((x) => baixo(entra).includes(x.toLocaleLowerCase('pt')));
    if (so.length) {
      estilo += so.length;
      sai = sai.filter((x) => !so.includes(x));
      entra = entra.filter((x) => !baixo(so).includes(x.toLocaleLowerCase('pt')));
    }
    if (sai.length || entra.length) {
      dif += 1;
      console.log(`\n✗ ${c} · ${campo}`);
      for (const x of sai.slice(0, 10)) console.log(`   − ${x.slice(0, 160)}`);
      for (const x of entra.slice(0, 10)) console.log(`   + ${x.slice(0, 160)}`);
    }
  };
  for (const c of new Set([...Object.keys(ref), ...Object.keys(ordenado)])) {
    const a = ref[c];
    const n = ordenado[c];
    if (!a || !n) {
      dif += 1;
      console.log(`\n✗ ${c}: ${a ? 'desapareceu' : 'página nova'}`);
      continue;
    }
    for (const campo of ['titulo', 'descricao', 'linhas', 'alts', 'rotulos']) comparar(c, campo, a[campo], n[campo]);
  }
  if (estilo) console.log(`\n(${estilo} linha(s) só com outra caixa de letra — estilo, não contam.)`);
  console.log(dif ? `\n${dif} diferença(s) de texto.` : '\nTexto igual em todas as páginas.');
  process.exit(dif ? 1 : 0);
}
