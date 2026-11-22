import { DIAGNOSTICO } from '@/content/i18n/diagnostico';
import { CONSEQUENCIAS, OBJETIVOS, PAPEIS, PRAZOS, TAMANHOS } from '@/content/i18n/formulario';
import type { Idioma } from '@/content/types';
import { mercadoDoDiagnostico } from '@/lib/diagnostic/mercado';
import type { LeadInput } from '@/lib/forms/lead-schema';
import { TEXTOS, type TextosEnquadramento } from './textos';

/**
 * O «Enquadramento preliminar» que a pessoa recebe por e-mail depois do
 * diagnóstico: o que a fase Enquadramento promete (problema preliminar,
 * sponsor, processo e elegibilidade), feito SÓ com as respostas dela e com o
 * nosso próprio catálogo.
 *
 * Regras que este módulo existe para cumprir:
 * - Nenhum número, poupança, prazo ou preço que a pessoa não tenha dado.
 * - A pontuação e o tier NUNCA aparecem (D-15: não se devolvem ao cliente).
 *   A elegibilidade é uma lista de critérios publicados («indicado» ou «a
 *   confirmar»), não uma nota.
 * - Marcado como preliminar e automático: a decisão (avançar, reenquadrar ou
 *   não prosseguir) é da equipa, na revisão.
 */

export type EstadoCriterio = 'indicado' | 'a-confirmar';

export interface Criterio {
  readonly titulo: string;
  readonly estado: EstadoCriterio;
  /** O que a pessoa respondeu, ou o que falta confirmar. */
  readonly detalhe: string;
}

export interface Enquadramento {
  readonly idioma: Idioma;
  readonly t: TextosEnquadramento;
  readonly nome: string;
  readonly empresa: string;
  readonly problema: {
    readonly processos: readonly string[];
    /** O texto da pessoa, tal como escrito (vazio se não escreveu). */
    readonly impacto: string;
    readonly consequencias: readonly string[];
    readonly sistemas: string;
    readonly decisaoDesejada: string;
  };
  readonly contexto: {
    readonly mercado: string;
    readonly setor: string;
    readonly dimensao: string;
  };
  readonly sponsor: {
    readonly papel: string;
    readonly prazo: string;
    readonly faixa: string;
  };
  readonly elegibilidade: readonly Criterio[];
  readonly entregas: readonly string[];
  readonly garantias: readonly string[];
  readonly passos: readonly string[];
}

const rotulo = <K extends string>(tabela: Record<K, { pt: string; en: string }>, chave: string, idioma: Idioma) =>
  (tabela as Record<string, { pt: string; en: string }>)[chave]?.[idioma] ?? chave;

export function construirEnquadramento(input: LeadInput, idioma: Idioma): Enquadramento {
  const t = TEXTOS[idioma];
  const mercado = mercadoDoDiagnostico(input.country, idioma);
  const setor = mercado?.sectors.find((s) => s.slug === input.sector)?.label ?? input.sector;
  const faixa = mercado?.investmentBands.find((b) => b.id === input.investmentBand);
  const faixaIndefinida = !faixa || faixa.id.endsWith('-0');

  const processos = input.processToImprove.map((p) => rotulo(OBJETIVOS, p, idioma));
  const impacto = (input.problemImpact ?? '').trim();
  const decide = input.decisionRole === 'decisor' || input.decisionRole === 'co-decisor';
  const semData = input.decisionTimeframe === 'sem-data';

  const elegibilidade: Criterio[] = [
    {
      titulo: t.criterios.problema,
      estado: processos.length > 0 && impacto.length > 0 ? 'indicado' : 'a-confirmar',
      detalhe: impacto.length > 0 ? processos.join(' · ') : t.faltas.impacto,
    },
    {
      titulo: t.criterios.sponsor,
      estado: decide ? 'indicado' : 'a-confirmar',
      detalhe: decide ? rotulo(PAPEIS, input.decisionRole, idioma) : t.faltas.sponsor,
    },
    {
      titulo: t.criterios.prazo,
      estado: semData ? 'a-confirmar' : 'indicado',
      detalhe: semData ? t.faltas.prazo : rotulo(PRAZOS, input.decisionTimeframe, idioma),
    },
    {
      titulo: t.criterios.capacidade,
      estado: faixaIndefinida ? 'a-confirmar' : 'indicado',
      detalhe: faixaIndefinida ? t.faltas.capacidade : faixa!.label,
    },
  ];

  return {
    idioma,
    t,
    nome: input.name.trim(),
    empresa: input.company.trim(),
    problema: {
      processos,
      impacto,
      consequencias: (input.problemConsequences ?? []).map((c) => rotulo(CONSEQUENCIAS, c, idioma)),
      sistemas: (input.currentSystems ?? '').trim(),
      decisaoDesejada: (input.desiredDecision ?? '').trim(),
    },
    contexto: {
      mercado: mercado?.name ?? input.country,
      setor,
      dimensao: rotulo(TAMANHOS, input.companySize, idioma),
    },
    sponsor: {
      papel: rotulo(PAPEIS, input.decisionRole, idioma),
      prazo: rotulo(PRAZOS, input.decisionTimeframe, idioma),
      faixa: faixa?.label ?? input.investmentBand,
    },
    elegibilidade,
    entregas: DIAGNOSTICO.entregas.map((e) => e[idioma]),
    garantias: t.garantias,
    passos: t.passos,
  };
}

/** Assunto do e-mail, na língua da pessoa. */
export function assunto(doc: Enquadramento): string {
  return doc.t.assunto.replace('{empresa}', doc.empresa);
}

/** Nome do ficheiro anexo, sem caracteres que os clientes de e-mail estraguem. */
export function nomeDoFicheiro(doc: Enquadramento): string {
  const base = doc.empresa
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
  return `${doc.t.ficheiro}${base ? `-${base}` : ''}.pdf`;
}
