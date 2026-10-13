// Gera content/projetos/mapa-mz.ts: as 11 províncias de Moçambique em SVG.
//
// Fonte: Natural Earth, admin-1 10m (domínio público), descarregado à parte:
//   curl -o ne.geojson https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_1_states_provinces.geojson
//   node .qa/gerar-mapa-mz.mjs ne.geojson
//
// Projecção equirectangular com o meridiano encolhido por cos(18°), a latitude
// média do país: chega para um mapa de localização, não para medir distâncias.
// Simplificação Douglas–Peucker em píxeis do viewBox. O ficheiro gerado não
// depende de nada em tempo de execução.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const entrada = process.argv[2];
if (!entrada) {
  console.error('uso: node .qa/gerar-mapa-mz.mjs <ne_10m_admin_1.geojson>');
  process.exit(1);
}

const LARGURA = 600;
const TOLERANCIA = 0.6; // px
const AREA_MINIMA = 1.5; // px² — ilhas mais pequenas que isto saem
const K = Math.cos((18 * Math.PI) / 180);

const NOMES = {
  'MOZ-1927': ['maputo', 'Maputo'],
  'MOZ-5854': ['maputo-cidade', 'Maputo Cidade'],
};
const SLUG = (s) =>
  s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().replace(/[^a-z]+/g, '-').replace(/^-|-$/g, '');
const NOME_PT = { Zambezia: 'Zambézia' };

const g = JSON.parse(readFileSync(entrada, 'utf8'));
const feats = g.features.filter((f) => f.properties.adm0_a3 === 'MOZ');
if (feats.length !== 11) throw new Error(`esperadas 11 províncias, vieram ${feats.length}`);

const aneis = (geo) => (geo.type === 'Polygon' ? [geo.coordinates] : geo.coordinates);
let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
for (const f of feats)
  for (const poli of aneis(f.geometry))
    for (const anel of poli)
      for (const [lon, lat] of anel) {
        const x = lon * K, y = -lat;
        minX = Math.min(minX, x); maxX = Math.max(maxX, x);
        minY = Math.min(minY, y); maxY = Math.max(maxY, y);
      }
const MARGEM = 8;
const escala = (LARGURA - 2 * MARGEM) / (maxX - minX);
const ALTURA = Math.ceil((maxY - minY) * escala + 2 * MARGEM);
const proj = ([lon, lat]) => [MARGEM + (lon * K - minX) * escala, MARGEM + (-lat - minY) * escala];

function dp(pts, tol) {
  if (pts.length < 3) return pts;
  const [ax, ay] = pts[0], [bx, by] = pts[pts.length - 1];
  let max = -1, idx = 0;
  const dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy) || 1;
  for (let i = 1; i < pts.length - 1; i++) {
    const d = Math.abs(dy * pts[i][0] - dx * pts[i][1] + bx * ay - by * ax) / len;
    if (d > max) { max = d; idx = i; }
  }
  if (max <= tol) return [pts[0], pts[pts.length - 1]];
  return [...dp(pts.slice(0, idx + 1), tol).slice(0, -1), ...dp(pts.slice(idx), tol)];
}
// Num anel fechado o primeiro e o último ponto coincidem e a recta de
// referência degenera: parte-se no ponto mais longe do início.
function dpAnel(pts, tol) {
  const [x0, y0] = pts[0];
  let longe = 0, max = -1;
  pts.forEach(([x, y], i) => {
    const d = Math.hypot(x - x0, y - y0);
    if (d > max) { max = d; longe = i; }
  });
  return [...dp(pts.slice(0, longe + 1), tol).slice(0, -1), ...dp(pts.slice(longe), tol)];
}
const area = (pts) => Math.abs(pts.reduce((s, [x, y], i) => {
  const [x2, y2] = pts[(i + 1) % pts.length];
  return s + x * y2 - x2 * y;
}, 0)) / 2;

const r1 = (n) => Math.round(n * 10) / 10;
const provincias = feats.map((f) => {
  const p = f.properties;
  const [id, nome] = NOMES[p.adm1_code] ?? [SLUG(p.name), NOME_PT[p.name] ?? p.name];
  let d = '';
  for (const poli of aneis(f.geometry)) {
    const exterior = poli[0].map(proj);
    if (area(exterior) < AREA_MINIMA) continue;
    for (const anel of poli) {
      const s = dpAnel(anel.map(proj), TOLERANCIA);
      if (s.length < 4) continue;
      d += 'M' + s.slice(0, -1).map(([x, y]) => `${r1(x)} ${r1(y)}`).join('L') + 'Z';
    }
  }
  const [cx, cy] = proj([p.longitude, p.latitude]);
  return { id, nome, d, rotulo: [r1(cx), r1(cy)] };
}).sort((a, b) => a.nome.localeCompare(b.nome, 'pt'));

const saida = `// GERADO por .qa/gerar-mapa-mz.mjs — não editar à mão.
// Fonte: Natural Earth, admin-1 10m (domínio público, naturalearthdata.com).
// Projecção equirectangular (cos 18°), simplificada a ${TOLERANCIA} px.

export const MAPA_MZ_VIEWBOX = { largura: ${LARGURA}, altura: ${ALTURA} } as const;

/** A mesma projecção do gerador, para pôr pinos por longitude e latitude. */
export const MAPA_MZ_PROJECCAO = { k: ${K}, minX: ${minX}, minY: ${minY}, escala: ${escala}, margem: ${MARGEM} } as const;

export interface ProvinciaMapa {
  readonly id: string;
  readonly nome: string;
  readonly d: string;
  readonly rotulo: readonly [number, number];
}

export const PROVINCIAS_MZ: readonly ProvinciaMapa[] = ${JSON.stringify(provincias, null, 2)} as const;
`;
const destino = fileURLToPath(new URL('../content/projetos/mapa-mz.ts', import.meta.url));
writeFileSync(destino, saida);
console.log(`ok: ${provincias.length} províncias, ${saida.length} bytes, viewBox ${LARGURA}×${ALTURA} → ${destino}`);
