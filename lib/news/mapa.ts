import {
  geoAzimuthalEqualArea,
  geoArea,
  geoCentroid,
  geoEquirectangular,
  geoGraticule10,
  geoNaturalEarth1,
  geoPath,
} from 'd3-geo';
import type { Feature, FeatureCollection, Geometry, MultiPolygon, Polygon } from 'geojson';
import { feature } from 'topojson-client';
import type { GeometryCollection, Topology } from 'topojson-specification';
import mundo110 from 'world-atlas/countries-110m.json';
import mundo50 from 'world-atlas/countries-50m.json';
import type { PaisNews } from './paises';

/**
 * Mapas do News, desenhados no servidor a partir do Natural Earth (pacote
 * `world-atlas`, domínio público): nada de mosaicos nem de servidores de
 * mapas de terceiros. Só geometria — os números que os mapas mostram vêm
 * sempre de quem os chama (contagens reais da base).
 */

/** Código numérico ISO 3166-1 de cada país (o `id` do world-atlas). */
export const ISO_DO_PAIS: Record<PaisNews, string> = {
  mz: '508',
  pt: '620',
  br: '076',
  ch: '756',
  sg: '702',
  us: '840',
  uk: '826',
  de: '276',
  fr: '250',
  ae: '784',
  sa: '682',
  za: '710',
  ca: '124',
};

/** Onde pôr o marcador de cada país [longitude, latitude] (centro aproximado do território principal). */
export const PONTO_DO_PAIS: Record<PaisNews, readonly [number, number]> = {
  mz: [35.3, -17.6],
  pt: [-8.1, 39.6],
  br: [-51.9, -10.8],
  ch: [8.2, 46.8],
  sg: [103.82, 1.35],
  us: [-98.5, 39.5],
  uk: [-2.0, 53.6],
  de: [10.4, 51.1],
  fr: [2.4, 46.6],
  ae: [54.3, 24.0],
  sa: [45.0, 24.0],
  za: [24.7, -29.0],
  ca: [-106.0, 56.0],
};

type Pais = Feature<Polygon | MultiPolygon, { name: string }>;

function paisesDe(topo: unknown): Pais[] {
  const t = topo as Topology<{ countries: GeometryCollection<{ name: string }> }>;
  return (feature(t, t.objects.countries) as FeatureCollection<Polygon | MultiPolygon, { name: string }>).features;
}

let cache50: Pais[] | null = null;
let cache110: Pais[] | null = null;
const p50 = () => (cache50 ??= paisesDe(mundo50));
const p110 = () => (cache110 ??= paisesDe(mundo110));

/** O polígono principal (o maior): o Alasca não deve encolher os EUA, nem os Açores Portugal. */
function principal(f: Pais): Feature<Geometry> {
  if (f.geometry.type === 'Polygon') return f;
  const maior = f.geometry.coordinates
    .map((c) => ({ c, a: geoArea({ type: 'Polygon', coordinates: c }) }))
    .sort((a, b) => b.a - a.a)[0]!.c;
  return { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: maior } };
}

export interface CaminhoPais {
  readonly id: string;
  readonly d: string;
}

export interface MapaRegional {
  readonly largura: number;
  readonly altura: number;
  readonly grelha: string;
  readonly paises: readonly CaminhoPais[];
  /** O país da notícia (desenhado por cima, em destaque). */
  readonly destaque: string;
  readonly marcador: readonly [number, number];
}

const regionais = new Map<string, MapaRegional>();

/**
 * O país da notícia no meio da sua região (projecção azimutal de área igual,
 * centrada nele), com os vizinhos à volta. O zoom tem tecto: Singapura e a
 * Suíça mostram a vizinhança em vez de encher o quadro.
 */
export function mapaDoPais(pais: PaisNews, largura = 640, altura = 400): MapaRegional {
  const chave = `${pais}:${largura}x${altura}`;
  const feito = regionais.get(chave);
  if (feito) return feito;
  const todos = p50();
  const alvo = todos.find((f) => f.id === ISO_DO_PAIS[pais]);
  const [lon, lat] = PONTO_DO_PAIS[pais];
  const proj = geoAzimuthalEqualArea().rotate([-lon, -lat]).clipAngle(90).precision(0.3);
  if (alvo) proj.fitExtent([[largura * 0.27, altura * 0.18], [largura * 0.73, altura * 0.82]], principal(alvo));
  const tecto = Math.min(largura, altura) * 4.2;
  if (!alvo || proj.scale() > tecto) proj.scale(tecto).translate([largura / 2, altura / 2]);
  const caminho = geoPath(proj).digits(1);
  const paises: CaminhoPais[] = [];
  let destaque = '';
  for (const f of todos) {
    const [[x0, y0], [x1, y1]] = caminho.bounds(f);
    if (!(x1 >= 0 && y1 >= 0 && x0 <= largura && y0 <= altura)) continue;
    const d = caminho(f);
    if (!d) continue;
    if (f.id === ISO_DO_PAIS[pais]) destaque = d;
    else paises.push({ id: String(f.id), d });
  }
  const marcador = (proj([lon, lat]) ?? [largura / 2, altura / 2]).map((v) => Math.round(v * 10) / 10) as [number, number];
  const mapa: MapaRegional = {
    largura,
    altura,
    grelha: caminho(geoGraticule10()) ?? '',
    paises,
    destaque,
    marcador,
  };
  regionais.set(chave, mapa);
  return mapa;
}

export interface MapaMundo {
  readonly largura: number;
  readonly altura: number;
  readonly contorno: string;
  readonly paises: readonly CaminhoPais[];
  readonly pontos: Readonly<Record<PaisNews, readonly [number, number]>>;
}

let mundoPlano: MapaMundo | null = null;

/** O mundo inteiro (Natural Earth I, 110m), para o mapa de cobertura plano e para a revista. */
export function mapaMundo(): MapaMundo {
  if (mundoPlano) return mundoPlano;
  const largura = 960;
  const altura = 500;
  const proj = geoNaturalEarth1().fitExtent([[4, 4], [largura - 4, altura - 4]], { type: 'Sphere' });
  const caminho = geoPath(proj).digits(1);
  const pontos = Object.fromEntries(
    (Object.keys(PONTO_DO_PAIS) as PaisNews[]).map((p) => [
      p,
      (proj(PONTO_DO_PAIS[p] as [number, number]) ?? [0, 0]).map((v) => Math.round(v * 10) / 10),
    ]),
  ) as unknown as Record<PaisNews, [number, number]>;
  mundoPlano = {
    largura,
    altura,
    contorno: caminho({ type: 'Sphere' }) ?? '',
    paises: p110().flatMap((f) => {
      const d = caminho(f);
      return d ? [{ id: String(f.id), d }] : [];
    }),
    pontos,
  };
  return mundoPlano;
}

/**
 * O mundo em coordenadas equirectangulares (x 0–360, y 0–180), para a textura
 * do globo 3D: o cliente desenha cada caminho num canvas com `Path2D`.
 */
export function mundoParaTextura(): CaminhoPais[] {
  const proj = geoEquirectangular().scale(180 / Math.PI).translate([180, 90]).precision(0.2);
  const caminho = geoPath(proj).digits(2);
  return p110().flatMap((f) => {
    const d = caminho(f);
    return d ? [{ id: String(f.id), d }] : [];
  });
}

/** Centro geográfico de um país (para testes e rótulos). */
export function centroDoPais(pais: PaisNews): [number, number] | null {
  const f = p50().find((x) => x.id === ISO_DO_PAIS[pais]);
  return f ? geoCentroid(principal(f)) : null;
}
