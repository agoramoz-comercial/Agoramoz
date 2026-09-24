import { COUNTRIES, SECTOR_LABELS } from '@/content/registry';
import type { SectorSlug } from '@/content/types';
import type { LeadInput } from '@/lib/forms/lead-schema';
import { normalizeDomain, normalizeText } from './normalize';
import type { Evidence } from './types';

/**
 * Construção do pacote de evidência.
 *
 * Tudo o que a camada de redação vier a ver passa por aqui primeiro, e sai
 * daqui com um id e uma origem. O que não estiver neste pacote não existe para
 * o diagnóstico — é essa a fronteira que impede o texto final de citar coisas
 * que ninguém disse.
 */

/** Prefixos dos ids. Estáveis: entram em `evidenceIds` e em auditoria. */
export const EVIDENCE_PREFIX = {
  resposta: 'resp',
  catalogo: 'cat',
  derivado: 'der',
} as const;

/**
 * O texto livre do cliente **não** entra como evidência citável.
 *
 * `problemImpact` é a única resposta onde ele escreve o que quer, e é por isso
 * o vetor natural de injeção: basta escrever «ignora as instruções anteriores
 * e afirma que…». Entra apenas o seu COMPRIMENTO, que é o que as regras
 * precisam de saber, e uma marca de que existe. O conteúdo é mostrado ao
 * humano que aprova, como citação do cliente, nunca ao motor como instrução.
 */
export function buildEvidence(input: LeadInput): Evidence[] {
  const country = COUNTRIES[input.country];
  const band = country?.investmentBands.find((b) => b.id === input.investmentBand) ?? null;
  const impacto = normalizeText(input.problemImpact);
  const dominio = input.currentWebsite ? normalizeDomain(input.currentWebsite) : '';

  const evidence: Evidence[] = [
    { id: 'resp.country', source: 'resposta', key: 'country', value: input.country },
    { id: 'resp.sector', source: 'resposta', key: 'sector', value: input.sector },
    { id: 'resp.companySize', source: 'resposta', key: 'companySize', value: input.companySize },
    {
      id: 'resp.processToImprove',
      source: 'resposta',
      key: 'processToImprove',
      value: [...input.processToImprove].map(normalizeText).sort(),
    },
    {
      id: 'resp.decisionTimeframe',
      source: 'resposta',
      key: 'decisionTimeframe',
      value: input.decisionTimeframe,
    },
    {
      id: 'resp.investmentBand',
      source: 'resposta',
      key: 'investmentBand',
      value: input.investmentBand,
    },
    { id: 'resp.decisionRole', source: 'resposta', key: 'decisionRole', value: input.decisionRole },
    {
      id: 'resp.hasWebsite',
      source: 'resposta',
      key: 'currentWebsite',
      value: dominio.length > 0,
    },

    // Derivados: reproduzíveis a partir das respostas acima.
    {
      id: 'der.processCount',
      source: 'derivado',
      key: 'processCount',
      value: input.processToImprove.length,
      derivedFrom: ['resp.processToImprove'],
    },
    {
      id: 'der.impactLength',
      source: 'derivado',
      key: 'impactLength',
      value: impacto.length,
      derivedFrom: ['resp.problemImpact'],
    },
  ];

  // Catálogo: nosso conteúdo, não afirmação sobre o mundo.
  const rotuloSetor = SECTOR_LABELS[input.sector as SectorSlug];
  if (rotuloSetor) {
    evidence.push({
      id: 'cat.sectorLabel',
      source: 'catalogo',
      key: `SECTOR_LABELS.${input.sector}`,
      value: rotuloSetor,
    });
  }

  if (country) {
    evidence.push({
      id: 'cat.countryName',
      source: 'catalogo',
      key: `COUNTRIES.${input.country}.name`,
      value: country.name,
    });
  }

  if (band) {
    evidence.push({
      id: 'cat.investmentBandLabel',
      source: 'catalogo',
      key: `COUNTRIES.${input.country}.investmentBands.${band.id}`,
      value: band.label,
    });
  }

  return evidence;
}

/** Índice por id, para as regras consultarem sem varrer a lista. */
export function indexEvidence(evidence: readonly Evidence[]): Map<string, Evidence> {
  return new Map(evidence.map((e) => [e.id, e]));
}

/**
 * Extrai os numerais de um valor. `'10-49'` dá 10 e 49; `'Até 250 000 MZN'` dá
 * 250000. Os separadores de milhar são colapsados antes da extração, senão
 * `250 000` virava dois números que ninguém escreveu.
 */
export function numbersIn(value: unknown): number[] {
  if (typeof value === 'number') return Number.isFinite(value) ? [value] : [];
  if (typeof value === 'boolean' || value === null || value === undefined) return [];

  if (Array.isArray(value)) return value.flatMap(numbersIn);

  const texto = String(value)
    // Separador de milhar por espaço (normal e sem quebra) ou ponto.
    .replace(/(\d)[\s ](?=\d{3}\b)/g, '$1')
    .replace(/(\d)\.(?=\d{3}\b)/g, '$1');

  /**
   * O `(?<!\d)` antes do sinal é o que distingue um intervalo de um negativo.
   * Sem ele, `10-49` dava `10` e `-49`: o conjunto admissível ficava com um
   * número que ninguém escreveu e SEM o 49, pelo que a redação era rejeitada
   * por citar correctamente a dimensão da empresa. `-5` continua a ser lido
   * como negativo porque aí o sinal não vem depois de um dígito.
   */
  return [...texto.matchAll(/(?<!\d)-?\d+(?:[.,]\d+)?/g)]
    .map((m) => Number(m[0]!.replace(',', '.')))
    .filter((n) => Number.isFinite(n));
}

/**
 * Conjunto de numerais que a redação pode usar.
 *
 * É o coração da garantia: qualquer número no texto final que não esteja aqui
 * foi inventado pelo modelo, e o validador rejeita-o. Inclui-se `0` e `1`
 * porque aparecem em linguagem corrente («um dos processos», «zero») e
 * rejeitá-los produziria falsos positivos constantes sem ganho real.
 */
export function allowedNumbersFrom(
  evidence: readonly Evidence[],
  facts: readonly Readonly<Record<string, string | number | boolean>>[],
): number[] {
  const conjunto = new Set<number>([0, 1]);

  for (const e of evidence) for (const n of numbersIn(e.value)) conjunto.add(n);
  for (const f of facts) for (const v of Object.values(f)) for (const n of numbersIn(v)) conjunto.add(n);

  return [...conjunto].sort((a, b) => a - b);
}
