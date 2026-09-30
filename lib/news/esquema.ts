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
 *     com um valor escolhido por nós. «Falta» mede-se pelo que SOBREVIVE:
 *     uma lista cujos itens caem todos está em falta, não «vazia».
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

/** Os nomes das secções do modelo, pela ordem do relatório. */
export const SECCOES = [
  'titulo',
  'prioridade',
  'sectores',
  'resumo',
  'interpretacao',
  'matriz',
  'riscos',
  'oportunidades',
  'horizonte',
  'recomendacoes',
  'cadeias',
  'economia',
  'estrategias',
  'perguntas',
  'pontuacoes',
] as const;
export type Seccao = (typeof SECCOES)[number];

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
  /**
   * Secções que o motor não deu, deu malformadas, ou deu só com itens que não
   * passaram. Uma lista que o motor devolveu VAZIA é resposta («nenhum
   * risco»), não falta.
   */
  readonly seccoesEmFalta: readonly Seccao[];
  /** Itens que o motor enviou e que não passaram a validação, somados em todas as listas. */
  readonly descartados: number;
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

/**
 * Item a item: um item mau sai, a lista fica. Devolve também quantos itens
 * foram recusados — os cortados pelo tecto `max` não contam, esses eram
 * válidos e simplesmente não cabem.
 */
function listaContada<T>(v: unknown, item: z.ZodType<T>, max = MAX_LISTA): { itens: T[]; recusados: number } {
  if (!Array.isArray(v)) return { itens: [], recusados: 0 };
  const itens: T[] = [];
  let recusados = 0;
  for (const i of v) {
    if (itens.length === max) break;
    const r = item.safeParse(i);
    if (r.success) itens.push(r.data);
    else recusados += 1;
  }
  return { itens, recusados };
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
// `.optional()` é obrigatório: no zod 4, `z.unknown()` sozinho recusa a chave em
// falta — e toda a oportunidade sem `actionability` caía em silêncio.
const oportunidade = z.object({
  title: texto(TITULO),
  description: texto(PARAGRAFO),
  actionability: z.unknown().optional(),
});
const cadeia = z.object({ chain: texto(ITEM), impact: enumTolerante(TIPOS_CADEIA) });
const pergunta = z.object({ industry: texto(CURTO), question: texto(ITEM), strategic_insight: texto(PARAGRAFO) });
const pontuacao = z
  .object({ dimension: texto(CURTO), score: z.unknown() })
  .transform((p) => ({ dimensao: p.dimension, bruto: numero(p.score) }))
  .refine((p): p is { dimensao: string; bruto: number } => p.bruto !== null)
  .transform((p) => ({ dimensao: p.dimensao, score: Math.round(Math.min(100, Math.max(-100, p.bruto))) }));

function matriz(v: unknown): { itens: EntradaMatriz[]; recusados: number } {
  if (!eObjecto(v)) return { itens: [], recusados: 0 };
  const direcao = enumTolerante(DIRECOES);
  const itens: EntradaMatriz[] = [];
  let recusados = 0;
  for (const [chave, valor] of Object.entries(v)) {
    if (itens.length === MAX_MATRIZ) break;
    const d = eObjecto(valor) ? direcao.safeParse(valor.direction) : null;
    const dimensao = limpar(chave, CURTO);
    if (!d?.success || !dimensao || !eObjecto(valor)) {
      recusados += 1;
      continue;
    }
    itens.push({ dimensao, direcao: d.data, explicacao: opcional(valor.explanation, PARAGRAFO) ?? '' });
  }
  return { itens, recusados };
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

  const falta: Seccao[] = [];
  let descartados = 0;
  const marca = <T>(nome: Seccao, valor: T, presente: boolean): T => {
    if (!presente) falta.push(nome);
    return valor;
  };
  /**
   * Uma lista está presente se o motor mandou um array e (a) ele vinha vazio
   * de propósito ou (b) sobrou pelo menos um item. Se todos os itens caíram,
   * a secção está em falta — mostrar «nenhum» seria afirmar o que não se sabe.
   */
  const secLista = <T>(nome: Seccao, v: unknown, r: { itens: T[]; recusados: number }): T[] => {
    descartados += r.recusados;
    const presente = Array.isArray(v) && (v.length === 0 || r.itens.length > 0);
    return marca(nome, r.itens, presente);
  };

  const h = eObjecto(bruto.headline) ? bruto.headline : {};
  const titulo = opcional(h.title, TITULO) ?? '';
  const resumoBruto = listaContada(bruto.executive_summary, texto(ITEM));
  if (!titulo && resumoBruto.itens.length === 0) return null;

  const prioridade = enumTolerante(PRIORIDADES).safeParse(bruto.priority_level);

  const ci = bruto.core_interpretation;
  const sinais = eObjecto(ci) ? listaContada(ci.hidden_signals, texto(ITEM)) : { itens: [], recusados: 0 };
  descartados += sinais.recusados;
  const oQue = eObjecto(ci) ? opcional(ci.what_is_happening, PARAGRAFO) : undefined;
  const porque = eObjecto(ci) ? opcional(ci.why_it_matters, PARAGRAFO) : undefined;
  const interpretacao = oQue || porque || sinais.itens.length ? { oQue, porque, sinais: sinais.itens } : null;

  const rec = eObjecto(bruto.recommendations) ? bruto.recommendations : {};
  const agir = listaContada(rec.immediate_actions, texto(ITEM));
  const monitorizar = listaContada(rec.monitor_closely, texto(ITEM));
  const ajustar = listaContada(rec.strategic_adjustments, texto(ITEM));
  descartados += agir.recusados + monitorizar.recusados + ajustar.recusados;
  const temRecomendacoes = agir.itens.length + monitorizar.itens.length + ajustar.itens.length > 0;

  const graficos = eObjecto(bruto.chart_data) ? bruto.chart_data : {};
  const mat = matriz(bruto.impact_matrix);
  descartados += mat.recusados;

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

  const analise: Omit<Analise, 'seccoesEmFalta' | 'descartados'> = {
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
    sectores: secLista('sectores', bruto.sector_tags, listaContada(bruto.sector_tags, texto(CURTO))),
    resumo: secLista('resumo', bruto.executive_summary, resumoBruto),
    interpretacao: marca('interpretacao', interpretacao, interpretacao !== null),
    matriz: marca(
      'matriz',
      mat.itens,
      eObjecto(bruto.impact_matrix) && (Object.keys(bruto.impact_matrix).length === 0 || mat.itens.length > 0),
    ),
    riscos: secLista('riscos', bruto.risks, listaContada(bruto.risks, risco)).map((r) => ({
      titulo: r.title,
      descricao: r.description,
      severidade: r.severity,
    })),
    oportunidades: secLista('oportunidades', bruto.opportunities, listaContada(bruto.opportunities, oportunidade)).map(
      (o) => ({ titulo: o.title, descricao: o.description, accionabilidade: opcional(o.actionability, CURTO) }),
    ),
    horizonte: marca('horizonte', horizonte, horizonte !== null),
    recomendacoes: marca(
      'recomendacoes',
      { agir: agir.itens, monitorizar: monitorizar.itens, ajustar: ajustar.itens },
      temRecomendacoes,
    ),
    cadeias: secLista('cadeias', bruto.signal_chains, listaContada(bruto.signal_chains, cadeia)).map((c) => ({
      cadeia: c.chain,
      tipo: c.impact,
    })),
    economia: marca('economia', economia, economia !== null),
    estrategias: marca('estrategias', estrategias, estrategias !== null),
    perguntas: secLista('perguntas', bruto.ultra_questions, listaContada(bruto.ultra_questions, pergunta)).map((p) => ({
      industria: p.industry,
      pergunta: p.question,
      insight: p.strategic_insight,
    })),
    pontuacoes: secLista('pontuacoes', graficos.impact_scores, listaContada(graficos.impact_scores, pontuacao)),
  };

  return { ...analise, seccoesEmFalta: falta, descartados };
}

// ── Validação do modelo já normalizado ────────────────────────────────────

const str = z.string();
const strOpc = z.string().optional();
const lst = <T extends z.ZodTypeAny>(t: T) => z.array(t).max(MAX_LISTA);

const modelo = z.object({
  titulo: z.object({ titulo: str, fonte: strOpc, data: strOpc, regiao: strOpc }),
  prioridade: z.enum(PRIORIDADES).nullable(),
  sectores: lst(str),
  resumo: lst(str),
  interpretacao: z.object({ oQue: strOpc, porque: strOpc, sinais: lst(str) }).nullable(),
  matriz: z.array(z.object({ dimensao: str, direcao: z.enum(DIRECOES), explicacao: str })).max(MAX_MATRIZ),
  riscos: lst(z.object({ titulo: str, descricao: str, severidade: z.enum(SEVERIDADES) })),
  oportunidades: lst(z.object({ titulo: str, descricao: str, accionabilidade: strOpc })),
  horizonte: z.object({ curto: strOpc, medio: strOpc, provavel: strOpc }).nullable(),
  recomendacoes: z.object({ agir: lst(str), monitorizar: lst(str), ajustar: lst(str) }),
  cadeias: lst(z.object({ cadeia: str, tipo: z.enum(TIPOS_CADEIA) })),
  economia: z.object({ macro: strOpc, meso: strOpc, micro: strOpc }).nullable(),
  estrategias: z.object({ red: strOpc, blue: strOpc, paralelos: strOpc }).nullable(),
  perguntas: lst(z.object({ industria: str, pergunta: str, insight: str })),
  pontuacoes: lst(z.object({ dimensao: str, score: z.number().int().min(-100).max(100) })),
  seccoesEmFalta: z.array(z.enum(SECCOES)),
  descartados: z.number().int().min(0),
});

/**
 * O que volta do `localStorage` tem de ter EXACTAMENTE a forma do modelo
 * actual. Uma entrada de uma versão antiga, ou mexida à mão, sai — em vez de
 * rebentar o relatório ao ser aberta.
 */
export function validarAnalise(x: unknown): x is Analise {
  return modelo.safeParse(x).success;
}
