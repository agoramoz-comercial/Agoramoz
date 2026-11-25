import { lerCurso, NIVEIS, type Curso, type Fonte, type Nivel } from './modelo';

/**
 * CUR-RAS-01 — O rascunho do criador de cursos fica no próprio browser
 * (localStorage), por utilizador, para que fechar o separador ou recarregar a
 * página a meio não perca a geração. Nada disto sai do browser: o servidor só
 * recebe o curso quando se carrega em «Guardar». Ao terminar a sessão, o
 * rascunho é apagado (`LimparRascunhos`), como os dos espaços privados.
 *
 * O que se lê de volta é validado: um rascunho estragado ou de outra versão é
 * ignorado, nunca aplicado às cegas.
 */

export const PREFIXO_RASCUNHO_CURSO = 'agoramoz:curso-rascunho:';
const VERSAO = 1;

export interface FonteRascunho {
  readonly nome: string;
  readonly tipo: Fonte['tipo'];
  readonly texto: string;
  readonly avisos: readonly string[];
  readonly url?: string;
  readonly origem?: Fonte['origem'];
}

export interface RascunhoCurso {
  readonly titulo: string;
  readonly tema: string;
  readonly publico: string;
  readonly nivel: Nivel;
  readonly minutos: number;
  readonly comFontes: boolean;
  readonly fontes: readonly FonteRascunho[];
  readonly curso: Curso | null;
  readonly fontesFinais: readonly Fonte[];
  readonly guardado: { readonly id: string; readonly slug: string; readonly revisao: number } | null;
  /** ISO: quando foi gravado, para dizer «rascunho de há X». */
  readonly em: string;
}

export function chaveRascunho(utilizador: string): string {
  return PREFIXO_RASCUNHO_CURSO + utilizador.replace(/[^\w-]/g, '').slice(0, 64);
}

/** Um rascunho só vale a pena se houver alguma coisa escrita ou gerada. */
export function rascunhoVazio(r: Omit<RascunhoCurso, 'em'>): boolean {
  return !r.titulo.trim() && !r.tema.trim() && !r.publico.trim() && r.fontes.length === 0 && !r.curso;
}

export function serializarRascunho(r: RascunhoCurso): string {
  return JSON.stringify({ v: VERSAO, ...r });
}

const TIPOS: readonly string[] = ['docx', 'pdf', 'txt', 'md', 'texto', 'web'];
const ORIGENS: readonly string[] = ['ia-pesquisa', 'ia-texto'];

const texto = (x: unknown, max: number): string | null => (typeof x === 'string' && x.length <= max ? x : null);

function lerFonte(x: unknown): FonteRascunho | null {
  if (!x || typeof x !== 'object') return null;
  const o = x as Record<string, unknown>;
  const nome = texto(o.nome, 300);
  const tipo = texto(o.tipo, 20);
  const t = texto(o.texto, 500_000);
  if (nome === null || tipo === null || t === null || !TIPOS.includes(tipo)) return null;
  const avisos = Array.isArray(o.avisos) ? o.avisos.filter((a): a is string => typeof a === 'string').slice(0, 20) : [];
  const url = texto(o.url, 2_000);
  const origem = texto(o.origem, 40);
  return {
    nome,
    tipo: tipo as Fonte['tipo'],
    texto: t,
    avisos,
    ...(url && /^https:\/\//.test(url) ? { url } : {}),
    ...(origem && ORIGENS.includes(origem) ? { origem: origem as Fonte['origem'] } : {}),
  };
}

/** Lê e valida; qualquer coisa fora do formato devolve `null`. */
export function lerRascunho(bruto: string | null): RascunhoCurso | null {
  if (!bruto) return null;
  let o: Record<string, unknown>;
  try {
    const v: unknown = JSON.parse(bruto);
    if (!v || typeof v !== 'object' || Array.isArray(v)) return null;
    o = v as Record<string, unknown>;
  } catch {
    return null;
  }
  if (o.v !== VERSAO) return null;
  const titulo = texto(o.titulo, 300);
  const tema = texto(o.tema, 4_000);
  const publico = texto(o.publico, 1_000);
  const em = texto(o.em, 40);
  if (titulo === null || tema === null || publico === null || em === null) return null;
  const nivel = (NIVEIS as readonly string[]).includes(String(o.nivel)) ? (o.nivel as Nivel) : 'iniciacao';
  const minutos = typeof o.minutos === 'number' && o.minutos >= 15 && o.minutos <= 1200 ? Math.round(o.minutos) : 120;
  const fontes = Array.isArray(o.fontes) ? o.fontes.map(lerFonte).filter((f): f is FonteRascunho => f !== null) : [];
  const curso = o.curso ? lerCurso(o.curso) : null;
  const fontesFinais = curso && Array.isArray(o.fontesFinais) ? (o.fontesFinais as Fonte[]) : [];
  const g = o.guardado as Record<string, unknown> | null | undefined;
  const guardado =
    g && typeof g.id === 'string' && typeof g.slug === 'string' && typeof g.revisao === 'number'
      ? { id: g.id, slug: g.slug, revisao: g.revisao }
      : null;
  return { titulo, tema, publico, nivel, minutos, comFontes: o.comFontes === true, fontes, curso, fontesFinais, guardado, em };
}

/**
 * Grava; se o browser recusar por falta de espaço (fontes grandes), tenta sem
 * o texto das fontes — o resto do trabalho não se perde por causa delas.
 * Devolve o que ficou gravado.
 */
export function gravarRascunho(
  armazem: Pick<Storage, 'setItem' | 'removeItem'>,
  chave: string,
  r: RascunhoCurso,
): 'tudo' | 'sem-fontes' | 'nada' {
  try {
    armazem.setItem(chave, serializarRascunho(r));
    return 'tudo';
  } catch {
    try {
      armazem.setItem(chave, serializarRascunho({ ...r, fontes: [], fontesFinais: [], curso: r.curso }));
      return 'sem-fontes';
    } catch {
      try {
        armazem.removeItem(chave);
      } catch {
        /* nada a fazer */
      }
      return 'nada';
    }
  }
}
