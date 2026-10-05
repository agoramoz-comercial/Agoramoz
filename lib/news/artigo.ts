import { z } from 'zod';
import { validarAnalise, PRIORIDADES, type Analise, type Prioridade } from './esquema';
import { urlPublica } from './limites';

/**
 * O artigo do jornal: o que a redacção escreve à volta de uma análise do
 * motor. A análise é o corpo; título, entrada, secção e endereço são da
 * redacção — o rascunho propõe-nos, uma pessoa decide.
 */

export const SECCOES_JORNAL = [
  'mercados',
  'energia',
  'tecnologia',
  'economia',
  'negocios',
  'politica',
] as const;
export type SeccaoJornal = (typeof SECCOES_JORNAL)[number];

export const NOME_DA_SECCAO: Record<SeccaoJornal, { pt: string; en: string }> = {
  mercados: { pt: 'Mercados', en: 'Markets' },
  energia: { pt: 'Energia & Recursos', en: 'Energy & Resources' },
  tecnologia: { pt: 'Tecnologia & IA', en: 'Technology & AI' },
  economia: { pt: 'Economia', en: 'Economy' },
  negocios: { pt: 'Negócios', en: 'Business' },
  politica: { pt: 'Política Económica', en: 'Policy' },
};

/** Palavras dos sectores do motor (PT e EN) → secção do jornal. A ordem decide empates. */
const PISTAS: readonly [SeccaoJornal, RegExp][] = [
  ['energia', /energ|petr[oó]l|oil|\bg[aá]s\b|lng|gnl|minera|mining|carv[aã]o|coal|renov|solar|e[oó]lic|hidro|electric|el[eé]tric|power|utilit/],
  ['tecnologia', /tecnolog|tech|digital|\bia\b|\bai\b|intelig[eê]ncia artificial|software|telecom|ciber|cyber|dados|\bdata\b/],
  ['mercados', /mercad|market|financ|bolsa|stock|banc|bank|invest|c[aâ]mbi|currency|forex|cr[eé]dito|credit|seguro|insur/],
  ['politica', /pol[ií]tic|polic|govern|regula|fiscal|impost|\btax|or[cç]amento|budget|elei|elect|san[cç][oõ]|sanction/],
  ['negocios', /neg[oó]ci|business|empres|compan|retalh|retail|log[ií]stic|agri|ind[uú]stri|manufact|turism|tourism|transport/],
];

export function seccaoDosSectores(sectores: readonly string[]): SeccaoJornal {
  const texto = sectores.join(' ').toLowerCase();
  for (const [seccao, re] of PISTAS) if (re.test(texto)) return seccao;
  return 'economia';
}

/** Endereço legível e estável: sem acentos, até 80 caracteres, com sufixo único. */
export function slugDeArtigo(titulo: string, sufixo: string): string {
  const base = titulo
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/g, '');
  const limpo = sufixo.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8);
  return [base || 'artigo', limpo].filter(Boolean).join('-');
}

function frase(texto: string | undefined, max: number): string | null {
  const t = texto?.replace(/\s+/g, ' ').trim();
  if (!t) return null;
  if (t.length <= max) return t;
  const corte = t.slice(0, max - 1);
  const espaco = corte.lastIndexOf(' ');
  return `${(espaco > max * 0.6 ? corte.slice(0, espaco) : corte).replace(/[,;:.\s]+$/, '')}…`;
}

export interface RascunhoDeArtigo {
  readonly titulo: string;
  readonly entrada: string | null;
  readonly seccao: SeccaoJornal;
  readonly prioridade: Prioridade | null;
  readonly fonteNome: string | null;
}

/** O que a redacção recebe para rever: nada é publicado sem passar por ela. */
export function rascunhoDeAnalise(a: Analise): RascunhoDeArtigo {
  return {
    titulo: frase(a.titulo.titulo, 200) ?? 'Análise sem título',
    entrada: frase(a.resumo[0] ?? a.interpretacao?.oQue, 400),
    seccao: seccaoDosSectores(a.sectores),
    prioridade: a.prioridade,
    fonteNome: frase(a.titulo.fonte, 120),
  };
}

/** Minutos de leitura a 220 palavras por minuto, sobre o texto real da análise. */
export function tempoDeLeitura(a: Analise): number {
  const partes: string[] = [
    a.titulo.titulo,
    ...a.resumo,
    a.interpretacao?.oQue ?? '',
    a.interpretacao?.porque ?? '',
    ...(a.interpretacao?.sinais ?? []),
    ...a.matriz.map((m) => `${m.dimensao} ${m.explicacao}`),
    ...a.riscos.map((r) => `${r.titulo} ${r.descricao}`),
    ...a.oportunidades.map((o) => `${o.titulo} ${o.descricao} ${o.accionabilidade ?? ''}`),
    a.horizonte?.curto ?? '',
    a.horizonte?.medio ?? '',
    a.horizonte?.provavel ?? '',
    ...a.recomendacoes.agir,
    ...a.recomendacoes.monitorizar,
    ...a.recomendacoes.ajustar,
    ...a.cadeias.map((c) => c.cadeia),
    a.economia?.macro ?? '',
    a.economia?.meso ?? '',
    a.economia?.micro ?? '',
    a.estrategias?.red ?? '',
    a.estrategias?.blue ?? '',
    a.estrategias?.paralelos ?? '',
    ...a.perguntas.map((p) => `${p.pergunta} ${p.insight}`),
  ];
  const palavras = partes.join(' ').split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(palavras / 220));
}

// ── Formulário do editor (o que chega à Server Action) ───────────────────────

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const opcional = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v === '' ? null : v));

export const formularioArtigo = z.object({
  slug: z.string().trim().min(3).max(90).regex(SLUG, 'Só letras minúsculas, números e hífenes.'),
  titulo: z.string().trim().min(3).max(200),
  entrada: opcional(400),
  seccao: z.enum(SECCOES_JORNAL),
  nota: opcional(2000),
  fonteNome: opcional(120),
  fonteUrl: opcional(2048).refine((v) => v === null || urlPublica(v), {
    message: 'A fonte tem de ser um endereço https público.',
  }),
});
export type FormularioArtigo = z.infer<typeof formularioArtigo>;

// ── Leitura do que a base devolve (dados, não confiança) ─────────────────────

const data = z.string().min(10);

export const artigoDaLista = z.object({
  id: z.string().uuid(),
  slug: z.string().regex(SLUG),
  idioma: z.enum(['pt', 'en']),
  titulo: z.string(),
  entrada: z.string().nullable(),
  seccao: z.enum(SECCOES_JORNAL),
  prioridade: z.enum(PRIORIDADES).nullable(),
  publicado_em: data,
  actualizado_em: data,
  gostos: z.number().int().nonnegative(),
  partilhas: z.number().int().nonnegative(),
});
export type ArtigoDaLista = z.infer<typeof artigoDaLista>;

const artigoBruto = artigoDaLista.extend({
  analise: z.unknown(),
  nota_editorial: z.string().nullable(),
  fonte_nome: z.string().nullable(),
  fonte_url: z.string().nullable(),
});

export interface ArtigoCompleto extends ArtigoDaLista {
  readonly analise: Analise;
  readonly nota_editorial: string | null;
  readonly fonte_nome: string | null;
  readonly fonte_url: string | null;
}

/** Um artigo só se mostra se a análise guardada ainda for uma análise válida. */
export function lerArtigo(bruto: unknown): ArtigoCompleto | null {
  const r = artigoBruto.safeParse(bruto);
  if (!r.success) return null;
  const { analise, ...resto } = r.data;
  if (!validarAnalise(analise)) return null;
  return { ...resto, analise };
}

export function lerLista(bruto: unknown): ArtigoDaLista[] {
  if (!Array.isArray(bruto)) return [];
  return bruto.flatMap((linha) => {
    const r = artigoDaLista.safeParse(linha);
    return r.success ? [r.data] : [];
  });
}
