import paisesGeo from '@/content/news/geo/paises.json';
import regioesGeo from '@/content/news/geo/regioes.json';
import { CODIGO_BM } from './indicadores';
import type { PaisNews } from './paises';

/**
 * A geografia que uma notícia cita: as regiões do país da notícia (províncias,
 * estados) e os outros países. Só nomes que estão no texto — nada é inferido.
 * Nomes e pontos de rótulo do Natural Earth (admin-1 e admin-0, domínio
 * público), gerados por `.qa/news-geo.py`.
 */

export interface RegiaoCitada {
  readonly nome: string;
  readonly lon: number;
  readonly lat: number;
}

export interface PaisCitado {
  readonly iso2: string;
  readonly pt: string;
  readonly en: string;
  readonly lon: number;
  readonly lat: number;
}

export interface GeografiaCitada {
  readonly regioes: readonly RegiaoCitada[];
  readonly parceiros: readonly PaisCitado[];
}

interface RegiaoGeo {
  nome: string;
  nomes: string[];
  lon: number;
  lat: number;
}
interface PaisGeo {
  iso2: string;
  pt: string;
  en: string;
  nomes: string[];
  lon: number;
  lat: number;
}

const REGIOES = regioesGeo as unknown as Record<PaisNews, RegiaoGeo[]>;
const PAISES = paisesGeo as unknown as PaisGeo[];

/** Nomes curtos ou siglas comuns que o Natural Earth não traz. */
const ALIASES: Readonly<Record<string, readonly string[]>> = {
  us: ['EUA', 'USA', 'Estados Unidos'],
  gb: ['Reino Unido', 'United Kingdom'],
  ae: ['Emirados Árabes Unidos', 'Emirados'],
  cn: ['China'],
  za: ['África do Sul', 'South Africa'],
  cd: ['RDC', 'RD Congo'],
  tz: ['Tanzânia'],
};

const MAX_REGIOES = 8;
const MAX_PARCEIROS = 8;

function normalizar(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/** O nome aparece como palavra inteira (sem acentos nem maiúsculas a atrapalhar)? */
function cita(textoNorm: string, nome: string): boolean {
  const n = normalizar(nome).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^a-z0-9])${n}([^a-z0-9]|$)`).test(textoNorm);
}

/** Siglas (EUA, RDC) só contam em maiúsculas, para não apanhar palavras comuns. */
function citaSigla(texto: string, sigla: string): boolean {
  return new RegExp(`(^|[^A-Za-z0-9])${sigla}([^A-Za-z0-9]|$)`).test(texto);
}

export function geografiaCitada(texto: string, pais: PaisNews | null): GeografiaCitada {
  const norm = normalizar(texto);
  const regioes: RegiaoCitada[] = [];
  if (pais) {
    for (const r of REGIOES[pais] ?? []) {
      if (r.nomes.some((n) => cita(norm, n))) regioes.push({ nome: r.nome, lon: r.lon, lat: r.lat });
      if (regioes.length >= MAX_REGIOES) break;
    }
  }
  const proprio = pais ? CODIGO_BM[pais].toLowerCase() : '';
  const parceiros: PaisCitado[] = [];
  for (const p of PAISES) {
    if (p.iso2 === proprio) continue;
    const aliases = ALIASES[p.iso2] ?? [];
    const achou =
      p.nomes.some((n) => cita(norm, n)) ||
      aliases.some((a) => (/^[A-Z]{2,4}$/.test(a) ? citaSigla(texto, a) : cita(norm, a)));
    if (achou) parceiros.push({ iso2: p.iso2, pt: p.pt, en: p.en, lon: p.lon, lat: p.lat });
    if (parceiros.length >= MAX_PARCEIROS) break;
  }
  return { regioes, parceiros };
}

/** O texto publicado de um artigo (o que se pode procurar sem o documento original). */
export function textoDoArtigo(a: {
  titulo: string;
  entrada?: string | null;
  analise?: unknown;
  profunda?: unknown;
}): string {
  const partes: string[] = [a.titulo, a.entrada ?? ''];
  const juntar = (v: unknown): void => {
    if (typeof v === 'string') partes.push(v);
    else if (Array.isArray(v)) v.forEach(juntar);
    else if (v && typeof v === 'object') Object.values(v).forEach(juntar);
  };
  juntar(a.analise);
  juntar(a.profunda);
  return partes.join('\n');
}

/**
 * A geografia de um artigo publicado: a que ficou guardada da leitura do
 * documento (análise profunda) mais a que o texto publicado cita.
 */
export function geografiaDoArtigo(a: {
  pais: PaisNews | null;
  titulo: string;
  entrada?: string | null;
  analise?: unknown;
  profunda?: { geografia?: { regioes: string[]; parceiros: string[] } | undefined } | null;
}): GeografiaCitada {
  const doTexto = geografiaCitada(textoDoArtigo({ ...a, profunda: a.profunda ?? undefined }), a.pais);
  const g = a.profunda?.geografia;
  const regioes = new Map(doTexto.regioes.map((r) => [r.nome, r]));
  if (g && a.pais) {
    for (const nome of g.regioes) {
      const r = (REGIOES[a.pais] ?? []).find((x) => x.nome === nome);
      if (r && !regioes.has(r.nome)) regioes.set(r.nome, { nome: r.nome, lon: r.lon, lat: r.lat });
    }
  }
  const parceiros = new Map(doTexto.parceiros.map((p) => [p.iso2, p]));
  for (const iso2 of g?.parceiros ?? []) {
    const p = PAISES.find((x) => x.iso2 === iso2);
    if (p && !parceiros.has(iso2)) parceiros.set(iso2, { iso2, pt: p.pt, en: p.en, lon: p.lon, lat: p.lat });
  }
  return {
    regioes: [...regioes.values()].slice(0, MAX_REGIOES),
    parceiros: [...parceiros.values()].slice(0, MAX_PARCEIROS),
  };
}
