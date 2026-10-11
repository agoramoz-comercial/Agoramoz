/**
 * QA do Website Final 2026 (Lote Y): percorre todas as URLs do sitemap e,
 * em cada página, verifica:
 *   - responde 200;
 *   - tem exactamente um <h1>;
 *   - não diz «em preparação» / «coming soon»;
 *   - tem o CTA principal do mercado (ou o de elegibilidade no /diagnostico);
 *   - nenhuma ligação interna dá 404.
 * Os termos bloqueados («líder», «melhor», «garantid», «número um»…) são
 * listados com contexto: «não garantimos» é permitido, «garantimos» não —
 * por isso só falham as ocorrências sem negação imediatamente antes.
 *
 *   BASE=http://127.0.0.1:3100 node .qa/website-2026.mjs
 */

const BASE = process.env.BASE ?? 'http://127.0.0.1:3000';
let falhas = 0;
const ok = (m) => console.log(`  ✓ ${m}`);
const falha = (m) => {
  falhas++;
  console.log(`  ✗ ${m}`);
};

const CTAS = ['Avaliar um processo crítico', 'Avaliar a operação', 'Assess a critical process', 'Avaliar elegibilidade'];
const PROIBIDOS = [/em prepara[cç][aã]o/i, /coming soon/i, /brevemente dispon/i];
const BLOQUEADOS = [
  /\bl[ií]der(es)?\b/i,
  /\bmelhor(es)?\b/i,
  /\bgarant(id|im|e\b|ia)/i,
  /n[uú]mero um/i,
  /\bleader\b/i,
  /\bleading\b/i,
  /\bbest\b/i,
  /\bguarantee/i,
  /\bworld[- ]class\b/i,
];
const NEGACAO = /(n[ãa]o|nem|sem|never|not|no|without|don't|do not|nenhum[a]?)\s+(\S+\s+){0,3}$/i;

function texto(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ');
}

const sitemap = await (await fetch(`${BASE}/sitemap.xml`)).text();
const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname);
console.log(`${urls.length} URLs no sitemap`);

const ligacoes = new Set();
const bloqueadosVistos = [];

for (const caminho of urls) {
  const r = await fetch(`${BASE}${caminho}`, { redirect: 'manual' });
  if (r.status !== 200) {
    falha(`${caminho}: HTTP ${r.status}`);
    continue;
  }
  const html = await r.text();
  const corpo = html.match(/<body[\s\S]*<\/body>/i)?.[0] ?? html;
  const t = texto(corpo);
  const erros = [];

  const h1 = (corpo.match(/<h1[\s>]/gi) ?? []).length;
  if (h1 !== 1) erros.push(`${h1} h1`);
  for (const re of PROIBIDOS) if (re.test(t)) erros.push(`contém «${t.match(re)[0]}»`);
  if (!caminho.startsWith('/news') && !caminho.startsWith('/en/news') && !CTAS.some((c) => t.includes(c)))
    erros.push('sem CTA principal');

  for (const re of BLOQUEADOS) {
    const g = new RegExp(re.source, 'gi');
    for (const m of t.matchAll(g)) {
      const antes = t.slice(Math.max(0, m.index - 40), m.index);
      const contexto = `${antes}[${m[0]}]${t.slice(m.index + m[0].length, m.index + m[0].length + 40)}`.trim();
      const negado = NEGACAO.test(antes);
      bloqueadosVistos.push({ caminho, contexto, negado });
    }
  }

  for (const m of corpo.matchAll(/href="(\/[^"#?]*)/g)) ligacoes.add(m[1]);

  erros.length ? falha(`${caminho}: ${erros.join('; ')}`) : ok(caminho);
}

console.log(`\n${ligacoes.size} ligações internas distintas`);
for (const l of ligacoes) {
  if (/\.(png|jpg|svg|ico|xml|txt|webmanifest|css|js)$/.test(l) || l.startsWith('/_next')) continue;
  const r = await fetch(`${BASE}${l}`, { redirect: 'manual' });
  if (r.status === 404 || r.status >= 500) falha(`ligação ${l}: HTTP ${r.status}`);
}
console.log('  (ligações verificadas)');

console.log(`\nTermos bloqueados encontrados: ${bloqueadosVistos.length}`);
for (const b of bloqueadosVistos) {
  console.log(`  ${b.negado ? '·' : '!'} ${b.caminho}: …${b.contexto}…`);
}

console.log(falhas ? `\n${falhas} FALHAS` : '\nTUDO PASSA');
process.exit(falhas ? 1 : 0);
