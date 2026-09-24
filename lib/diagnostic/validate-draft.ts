import { z } from 'zod';
import { numbersIn } from './evidence';
import type { EvidenceBundle } from './types';

/**
 * Validador da redação produzida pela IA.
 *
 * O princípio: **rejeitar, nunca corrigir**. Um validador que conserta ensina
 * o sistema a tolerar saídas más e esconde o problema; um que rejeita obriga a
 * nova tentativa ou a intervenção humana, e deixa rasto do que falhou.
 *
 * O que torna isto uma garantia e não uma esperança: nenhuma destas
 * verificações depende de o modelo se portar bem. São mecânicas. Um modelo que
 * invente um número não passa — não porque lhe pedimos que não invente, mas
 * porque o número não está no conjunto admissível.
 */

/** Forma esperada da saída. Qualquer desvio é rejeição, não adaptação. */
export const draftSchema = z.object({
  resumo: z.string().min(1).max(1200),
  secoes: z
    .array(
      z.object({
        findingCode: z.string().min(1).max(64),
        titulo: z.string().min(1).max(160),
        corpo: z.string().min(1).max(2000),
        evidenceIds: z.array(z.string().min(1)).min(1),
      }),
    )
    .min(1)
    .max(12),
  proximosPassos: z.array(z.string().min(1).max(300)).min(1).max(8),
});

export type Draft = z.infer<typeof draftSchema>;

export type IssueCode =
  | 'SCHEMA'
  | 'EVIDENCIA_INEXISTENTE'
  | 'ACHADO_INEXISTENTE'
  | 'NUMERO_INVENTADO'
  | 'PERCENTAGEM_INVENTADA'
  | 'MOEDA_INVENTADA'
  | 'DATA_INVENTADA'
  | 'TERMO_PROIBIDO'
  | 'DISCLAIMER_EM_FALTA';

export interface Issue {
  readonly code: IssueCode;
  /** Onde ocorreu, em notação de caminho. Ex.: `secoes[2].corpo`. */
  readonly path: string;
  readonly detail: string;
}

export type ValidationResult =
  | { readonly ok: true; readonly draft: Draft }
  | { readonly ok: false; readonly issues: readonly Issue[] };

/**
 * Termos proibidos.
 *
 * Codifica as regras de integridade da AGORAMOZ: sem garantias de resultado,
 * sem urgência ou escassez fabricadas, sem afirmações de liderança de mercado,
 * sem superlativos sem evidência. Deixar isto a cargo do prompt era confiar;
 * aqui é verificado.
 *
 * A comparação é feita sem acentos e sem caixa, porque «garantimos» e
 * «GARANTIMOS» são a mesma promessa.
 */
export const FORBIDDEN_PATTERNS: readonly { readonly pattern: RegExp; readonly why: string }[] = [
  { pattern: /\bgarant(imos|ido|ida|e-se|ia de resultado)\b/, why: 'garantia de resultado' },
  { pattern: /\basseguramos que\b/, why: 'garantia de resultado' },
  { pattern: /\bresultados? garantidos?\b/, why: 'garantia de resultado' },
  { pattern: /\bultimas? vagas?\b/, why: 'escassez fabricada' },
  { pattern: /\bvagas? limitadas?\b/, why: 'escassez fabricada' },
  { pattern: /\brestam apenas\b/, why: 'escassez fabricada' },
  { pattern: /\b(so|apenas) (hoje|ate amanha)\b/, why: 'urgência fabricada' },
  { pattern: /\btempo limitado\b/, why: 'urgência fabricada' },
  { pattern: /\bnao perca\b/, why: 'urgência fabricada' },
  { pattern: /\blider (de )?mercado\b/, why: 'liderança de mercado sem evidência' },
  { pattern: /\bnumero 1\b/, why: 'liderança de mercado sem evidência' },
  { pattern: /\b(a|o) (melhor|maior) (empresa|solucao|plataforma)\b/, why: 'superlativo sem evidência' },
  { pattern: /\bunica empresa\b/, why: 'superlativo sem evidência' },
];

/** Remove acentuação para a comparação não depender de como foi escrito. */
function fold(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

/** Percentagens explícitas: `30%`, `30 %`, `30 por cento`. */
function percentagesIn(text: string): number[] {
  const folded = fold(text);
  return [...folded.matchAll(/(-?\d+(?:[.,]\d+)?)\s*(?:%|por cento)/g)].map((m) =>
    Number(m[1]!.replace(',', '.')),
  );
}

/** Valores monetários com código de moeda. `250 000 MZN`, `1.500 EUR`. */
function currenciesIn(text: string): number[] {
  const folded = fold(text);
  return [...folded.matchAll(/((?:\d[\d.,\s ]*\d|\d))\s*(mzn|eur|brl|usd|mt|r\$|€|\$)/g)]
    .flatMap((m) => numbersIn(m[1]!));
}

/** Anos com quatro dígitos. Uma data é uma afirmação; não pode ser inventada. */
function yearsIn(text: string): number[] {
  return [...text.matchAll(/\b(19|20)\d{2}\b/g)].map((m) => Number(m[0]));
}

function todoOTexto(draft: Draft): { path: string; text: string }[] {
  return [
    { path: 'resumo', text: draft.resumo },
    ...draft.secoes.flatMap((s, i) => [
      { path: `secoes[${i}].titulo`, text: s.titulo },
      { path: `secoes[${i}].corpo`, text: s.corpo },
    ]),
    ...draft.proximosPassos.map((p, i) => ({ path: `proximosPassos[${i}]`, text: p })),
  ];
}

/**
 * Valida a redação contra o pacote de evidência.
 *
 * `requireDisclaimerFor` lista códigos de achado cuja presença obriga a um
 * aviso no texto — por exemplo, um achado que assinale contexto insuficiente
 * exige que o documento diga que as conclusões carecem de levantamento.
 */
export function validateDraft(
  input: unknown,
  bundle: EvidenceBundle,
  options: {
    readonly requireDisclaimerFor?: Readonly<Record<string, RegExp>>;
  } = {},
): ValidationResult {
  const parsed = draftSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      issues: parsed.error.issues.map((i) => ({
        code: 'SCHEMA' as const,
        path: i.path.join('.') || '(raiz)',
        detail: i.message,
      })),
    };
  }

  const draft = parsed.data;
  const issues: Issue[] = [];

  const idsValidos = new Set(bundle.evidence.map((e) => e.id));
  const codigosValidos = new Set(bundle.findings.map((f) => f.code));
  const numerosPermitidos = new Set(bundle.allowedNumbers);

  // 1. Cada secção tem de corresponder a um achado real e citar evidência real.
  draft.secoes.forEach((s, i) => {
    if (!codigosValidos.has(s.findingCode)) {
      issues.push({
        code: 'ACHADO_INEXISTENTE',
        path: `secoes[${i}].findingCode`,
        detail: `"${s.findingCode}" não corresponde a nenhum achado produzido pelas regras.`,
      });
    }
    for (const id of s.evidenceIds) {
      if (!idsValidos.has(id)) {
        issues.push({
          code: 'EVIDENCIA_INEXISTENTE',
          path: `secoes[${i}].evidenceIds`,
          detail: `"${id}" não existe no pacote de evidência.`,
        });
      }
    }
  });

  // 2. Nenhum número fora do conjunto admissível, em nenhum campo de texto.
  for (const { path, text } of todoOTexto(draft)) {
    for (const n of percentagesIn(text)) {
      if (!numerosPermitidos.has(n)) {
        issues.push({
          code: 'PERCENTAGEM_INVENTADA',
          path,
          detail: `${n}% não decorre de nenhuma evidência.`,
        });
      }
    }
    for (const n of currenciesIn(text)) {
      if (!numerosPermitidos.has(n)) {
        issues.push({
          code: 'MOEDA_INVENTADA',
          path,
          detail: `O valor monetário ${n} não decorre de nenhuma evidência.`,
        });
      }
    }
    for (const n of yearsIn(text)) {
      if (!numerosPermitidos.has(n)) {
        issues.push({ code: 'DATA_INVENTADA', path, detail: `O ano ${n} não consta da evidência.` });
      }
    }
    for (const n of numbersIn(text)) {
      if (!numerosPermitidos.has(n)) {
        issues.push({
          code: 'NUMERO_INVENTADO',
          path,
          detail: `O número ${n} não decorre de nenhuma evidência nem de nenhum facto.`,
        });
      }
    }
  }

  // 3. Termos proibidos.
  for (const { path, text } of todoOTexto(draft)) {
    const folded = fold(text);
    for (const { pattern, why } of FORBIDDEN_PATTERNS) {
      if (pattern.test(folded)) {
        issues.push({ code: 'TERMO_PROIBIDO', path, detail: `${why} (padrão: ${pattern.source})` });
      }
    }
  }

  // 4. Avisos obrigatórios quando um achado o exige.
  const exigidos = options.requireDisclaimerFor ?? {};
  const textoCompleto = todoOTexto(draft)
    .map((t) => t.text)
    .join('\n');
  for (const f of bundle.findings) {
    const regra = exigidos[f.code];
    if (regra && !regra.test(textoCompleto)) {
      issues.push({
        code: 'DISCLAIMER_EM_FALTA',
        path: '(documento)',
        detail: `O achado ${f.code} exige um aviso que não foi encontrado.`,
      });
    }
  }

  // Dedup: o mesmo número repetido num parágrafo não vale vários problemas.
  const unicos = new Map(issues.map((i) => [`${i.code}|${i.path}|${i.detail}`, i]));

  return unicos.size === 0 ? { ok: true, draft } : { ok: false, issues: [...unicos.values()] };
}
