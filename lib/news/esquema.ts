import { z } from 'zod';

/**
 * Contrato do motor de notícias.
 *
 * O motor é a função `analyze-news` do projecto Lovable (Lovable Cloud). O que
 * devolve é texto gerado por IA a partir de um artigo que o VISITANTE escolhe —
 * ou seja, dado não confiável duas vezes: pode vir malformado, e o artigo pode
 * ter sido escrito para manipular a resposta.
 *
 * Daqui sai um modelo nosso, em português, que as páginas desenham. Trocar de
 * motor é escrever outro `normalizar`; nada a jusante muda.
 *
 * Três regras que os testes prendem:
 *  1. Uma secção malformada cai sozinha. O relatório não se perde por causa de
 *     um campo, e a falta fica registada em `seccoesEmFalta` — nunca é tapada
 *     com um valor escolhido por nós.
 *  2. As pontuações são as do motor, só limitadas a −100..100. Um score que não
 *     é número sai; não vira zero, que seria um número inventado.
 *  3. Texto fica texto. Nada aqui produz marcação: quem desenha é o React, que
 *     escapa. (O original escrevia este texto com `document.write` — ver o
 *     plano do lote N.)
 */

export const PRIORIDADES = ['critical', 'high', 'medium', 'monitor'] as const;
export const SEVERIDADES = ['critical', 'high', 'medium'] as const;
export const DIRECOES = ['up', 'down', 'neutral'] as const;
export const TIPOS_CADEIA = ['growth', 'risk', 'instability'] as const;

export type Prioridade = (typeof PRIORIDADES)[number];
export type Severidade = (typeof SEVERIDADES)[number];
export type Direcao = (typeof DIRECOES)[number];
export type TipoCadeia = (typeof TIPOS_CADEIA)[number];

export interface EntradaMatriz {
  readonly dimensao: string;
  readonly direcao: Direcao;
  readonly explicacao: string;
}
export interface Risco {
  readonly titulo: string;
  readonly descricao: string;
  readonly severidade: Severidade;
}
export interface Oportunidade {
  readonly titulo: string;
  readonly descricao: string;
  readonly accionabilidade?: string;
}
export interface Cadeia {
  readonly cadeia: string;
  readonly tipo: TipoCadeia;
}
export interface Pergunta {
  readonly industria: string;
  readonly pergunta: string;
  readonly insight: string;
}
export interface Pontuacao {
  readonly dimensao: string;
  /** Inteiro em −100..100, tal como o motor o deu (limitado e arredondado). */
  readonly score: number;
}

export interface Analise {
  readonly titulo: { titulo: string; fonte?: string; data?: string; regiao?: string };
  readonly prioridade: Prioridade | null;
  readonly sectores: readonly string[];
  readonly resumo: readonly string[];
  readonly interpretacao: { oQue?: string; porque?: string; sinais: readonly string[] } | null;
  readonly matriz: readonly EntradaMatriz[];
  readonly riscos: readonly Risco[];
  readonly oportunidades: readonly Oportunidade[];
  readonly horizonte: { curto?: string; medio?: string; provavel?: string } | null;
  readonly recomendacoes: { agir: readonly string[]; monitorizar: readonly string[]; ajustar: readonly string[] };
  readonly cadeias: readonly Cadeia[];
  readonly economia: { macro?: string; meso?: string; micro?: string } | null;
  readonly estrategias: { red?: string; blue?: string; paralelos?: string } | null;
  readonly perguntas: readonly Pergunta[];
  readonly pontuacoes: readonly Pontuacao[];
  /** Nomes das secções que o motor não deu, ou deu malformadas. */
  readonly seccoesEmFalta: readonly string[];
}

const MAX_LISTA = 12;
const MAX_MATRIZ = 8;
const CURTO = 60;
const TITULO = 300;
const ITEM = 600;
const PARAGRAFO = 1200;

/** Sem caracteres de controlo, espaços colapsados, tamanho limitado. */
export function limpar(valor: string, max: number): string {
  return valor
    .replace(/[\u0000-\u001f\u007f]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max)
    .trim();
}

const texto = (max: number) => z.string().transform((s) => limpar(s, max)).pipe(z.string().min(1));

/** Enum que aceita `Critical` ou ` MEDIUM ` — o motor é uma IA, não um contrato rígido. */
const enumTolerante = <T extends readonly [string, ...string[]]>(valores: T) =>
  z
    .string()
    .transform((s) => s.trim().toLowerCase())
    .pipe(z.enum(valores));

const eObjecto = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

function opcional(v: unknown, max: number): string | undefined {
  if (typeof v !== 'string') return undefined;
  return limpar(v, max) || undefined;
}

/** Item a item: um item mau sai, a lista fica. */
function lista<T>(v: unknown, item: z.ZodType<T>, max = MAX_LISTA): T[] {
  if (!Array.isArray(v)) return [];
  const bons: T[] = [];
  for (const i of v) {
    const r = item.safeParse(i);
    if (r.success) bons.push(r.data);
    if (bons.length === max) break;
  }
  return bons;
}

function numero(v: unknown): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v.trim());
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

const risco = z.object({ title: texto(TITULO), description: texto(PARAGRAFO), severity: enumTolerante(SEVERIDADES) });
const oportunidade = z.object({ title: texto(TITULO), description: texto(PARAGRAFO), actionability: z.unknown() });
const cadeia = z.object({ chain: texto(ITEM), impact: enumTolerante(TIPOS_CADEIA) });
const pergunta = z.object({ industry: texto(CURTO), question: texto(ITEM), strategic_insight: texto(PARAGRAFO) });
const pontuacao = z
  .object({ dimension: texto(CURTO), score: z.unknown() })
  .transform((p) => ({ dimensao: p.dimension, bruto: numero(p.score) }))
  .refine((p): p is { dimensao: string; bruto: number } => p.bruto !== null)
  .transform((p) => ({ dimensao: p.dimensao, score: Math.round(Math.min(100, Math.max(-100, p.bruto))) }));

function matriz(v: unknown): EntradaMatriz[] {
  if (!eObjecto(v)) return [];
  const direcao = enumTolerante(DIRECOES);
  const entradas: EntradaMatriz[] = [];
  for (const [chave, valor] of Object.entries(v)) {
    if (!eObjecto(valor)) continue;
    const d = direcao.safeParse(valor.direction);
    const dimensao = limpar(chave, CURTO);
    if (!d.success || !dimensao) continue;
    entradas.push({ dimensao, direcao: d.data, explicacao: opcional(valor.explanation, PARAGRAFO) ?? '' });
    if (entradas.length === MAX_MATRIZ) break;
  }
  return entradas;
}

/** Objecto de campos de texto; `null` quando não traz nenhum. */
function blocoDeTexto<K extends string>(v: unknown, mapa: Record<K, string>): Partial<Record<K, string>> | null {
  if (!eObjecto(v)) return null;
  const saida: Partial<Record<K, string>> = {};
  let algum = false;
  for (const [nosso, deles] of Object.entries(mapa) as [K, string][]) {
    const t = opcional(v[deles], PARAGRAFO);
    if (t) {
      saida[nosso] = t;
      algum = true;
    }
  }
  return algum ? saida : null;
}

/**
 * De `analysis` (o objecto que o motor devolve) para o nosso modelo.
 * `null` quando não há nada que se possa chamar análise: nem título nem resumo.
 */
export function normalizar(bruto: unknown): Analise | null {
  if (!eObjecto(bruto)) return null;

  const falta: string[] = [];
  const marca = <T>(nome: string, valor: T, presente: boolean): T => {
    if (!presente) falta.push(nome);
    return valor;
  };

  const h = eObjecto(bruto.headline) ? bruto.headline : {};
  const titulo = opcional(h.title, TITULO) ?? '';
  const resumo = lista(bruto.executive_summary, texto(ITEM));
  if (!titulo && resumo.length === 0) return null;

  const prioridade = enumTolerante(PRIORIDADES).safeParse(bruto.priority_level);

  const ci = bruto.core_interpretation;
  const interpretacao = eObjecto(ci)
    ? {
        oQue: opcional(ci.what_is_happening, PARAGRAFO),
        porque: opcional(ci.why_it_matters, PARAGRAFO),
        sinais: lista(ci.hidden_signals, texto(ITEM)),
      }
    : null;

  const rec = eObjecto(bruto.recommendations) ? bruto.recommendations : {};
  const graficos = eObjecto(bruto.chart_data) ? bruto.chart_data : {};

  const horizonte = blocoDeTexto(bruto.forward_outlook, {
    curto: 'short_term',
    medio: 'mid_term',
    provavel: 'most_likely_scenario',
  });
  const economia = blocoDeTexto(bruto.macro_analysis, {
    macro: 'macroeconomic',
    meso: 'mesoeconomic',
    micro: 'microeconomic',
  });
  const estrategias = blocoDeTexto(bruto.growth_strategies, {
    red: 'red_ocean',
    blue: 'blue_ocean',
    paralelos: 'historical_parallels',
  });

  return {
    titulo: marca(
      'titulo',
      {
        titulo,
        fonte: opcional(h.source, CURTO * 2),
        data: opcional(h.timestamp, CURTO),
        regiao: opcional(h.region_tag, CURTO),
      },
      titulo !== '',
    ),
    prioridade: marca('prioridade', prioridade.success ? prioridade.data : null, prioridade.success),
    sectores: marca('sectores', lista(bruto.sector_tags, texto(CURTO)), Array.isArray(bruto.sector_tags)),
    resumo: marca('resumo', resumo, Array.isArray(bruto.executive_summary)),
    interpretacao: marca('interpretacao', interpretacao, interpretacao !== null),
    matriz: marca('matriz', matriz(bruto.impact_matrix), eObjecto(bruto.impact_matrix)),
    riscos: marca(
      'riscos',
      lista(bruto.risks, risco).map((r) => ({ titulo: r.title, descricao: r.description, severidade: r.severity })),
      Array.isArray(bruto.risks),
    ),
    oportunidades: marca(
      'oportunidades',
      lista(bruto.opportunities, oportunidade).map((o) => ({
        titulo: o.title,
        descricao: o.description,
        accionabilidade: opcional(o.actionability, CURTO),
      })),
      Array.isArray(bruto.opportunities),
    ),
    horizonte: marca('horizonte', horizonte, horizonte !== null),
    recomendacoes: marca(
      'recomendacoes',
      {
        agir: lista(rec.immediate_actions, texto(ITEM)),
        monitorizar: lista(rec.monitor_closely, texto(ITEM)),
        ajustar: lista(rec.strategic_adjustments, texto(ITEM)),
      },
      eObjecto(bruto.recommendations),
    ),
    cadeias: marca(
      'cadeias',
      lista(bruto.signal_chains, cadeia).map((c) => ({ cadeia: c.chain, tipo: c.impact })),
      Array.isArray(bruto.signal_chains),
    ),
    economia: marca('economia', economia, economia !== null),
    estrategias: marca('estrategias', estrategias, estrategias !== null),
    perguntas: marca(
      'perguntas',
      lista(bruto.ultra_questions, pergunta).map((p) => ({
        industria: p.industry,
        pergunta: p.question,
        insight: p.strategic_insight,
      })),
      Array.isArray(bruto.ultra_questions),
    ),
    pontuacoes: marca('pontuacoes', lista(graficos.impact_scores, pontuacao), Array.isArray(graficos.impact_scores)),
    seccoesEmFalta: falta,
  };
}
