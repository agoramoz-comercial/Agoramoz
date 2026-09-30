import type { LeadInput } from '@/lib/forms/lead-schema';
import { scoreLead, type LeadTier } from '@/lib/forms/lead-score';

/**
 * Pontuação versionada.
 *
 * Envolve `scoreLead` sem lhe tocar: os pesos, os patamares e as fronteiras de
 * tier continuam exactamente onde estavam, e os cinquenta testes de
 * caracterização do Lote 0 continuam a valer sem uma linha alterada.
 *
 * O que acrescenta é a única coisa que faltava para um diagnóstico ser
 * auditável: saber COM QUE REGRAS foi pontuado. Sem isto, mudar um peso
 * reescrevia retroactivamente o sentido de todos os diagnósticos já emitidos —
 * o número guardado no ano passado passava a não se conseguir reproduzir, e
 * ninguém saberia porquê.
 */

/**
 * Sobe sempre que qualquer peso, patamar ou fronteira em `lead-score.ts`
 * mudar. Nunca se reutiliza uma versão com regras diferentes: é a data da
 * alteração mais um contador, para duas alterações no mesmo dia não colidirem.
 */
// 2026-09-29.1 — os pesos e fronteiras NÃO mudaram. Passaram a existir faixas
// de dez mercados novos, na moeda de cada um, com a mesma escala 6/14/20/25/4.
// A versão sobe para que a auditoria saiba a partir de quando um diagnóstico
// pode ser de um mercado global.
//
// 2026-09-30.1 — os pesos e fronteiras continuam a NÃO mudar. O texto livre
// passou a opcional (carrossel, P2): um texto vazio pontua como um curto (+2),
// que é o que a fórmula já fazia. A versão sobe porque o domínio da entrada
// mudou — a partir daqui, «clareza +2» pode querer dizer «não escreveu nada».
export const SCORING_VERSION = '2026-09-30.1';

export interface ScoreResult {
  readonly score: number;
  readonly tier: LeadTier;
  readonly reasons: readonly string[];
  readonly scoringVersion: string;
}

export function scoreDiagnostic(input: LeadInput): ScoreResult {
  const { score, tier, reasons } = scoreLead(input);
  return { score, tier, reasons, scoringVersion: SCORING_VERSION };
}
