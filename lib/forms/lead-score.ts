import { COUNTRIES } from '@/content/registry';
import type { LeadInput } from './lead-schema';

export type LeadTier = 'A' | 'B' | 'C' | 'D';

/**
 * Função pura, sem dependências de runtime — testável isoladamente.
 *
 * Regras duras: a pontuação NUNCA é mostrada ao utilizador, NUNCA limita o
 * acesso ao diagnóstico e NUNCA altera o que a página diz. Serve só para
 * priorizar o seguimento comercial interno.
 */
export function scoreLead(input: LeadInput): { score: number; tier: LeadTier; reasons: string[] } {
  const reasons: string[] = [];
  let score = 0;

  const band = COUNTRIES[input.country]?.investmentBands.find((b) => b.id === input.investmentBand);
  if (band) {
    score += band.scoreWeight;
    reasons.push(`Faixa de investimento: ${band.label} (+${band.scoreWeight})`);
  }

  const sizeWeights = { '1-9': 5, '10-49': 12, '50-249': 17, '250+': 20 } as const;
  score += sizeWeights[input.companySize];
  reasons.push(`Dimensão ${input.companySize} (+${sizeWeights[input.companySize]})`);

  const timeWeights = { imediato: 20, '1-3-meses': 15, '3-6-meses': 8, 'sem-data': 3 } as const;
  score += timeWeights[input.decisionTimeframe];
  reasons.push(`Prazo ${input.decisionTimeframe} (+${timeWeights[input.decisionTimeframe]})`);

  const roleWeights = { decisor: 15, 'co-decisor': 11, influenciador: 6, pesquisa: 2 } as const;
  score += roleWeights[input.decisionRole];
  reasons.push(`Papel ${input.decisionRole} (+${roleWeights[input.decisionRole]})`);

  // Clareza do problema: um impacto descrito em detalhe é sinal de intenção real.
  const impact = input.problemImpact.trim().length >= 160 ? 10 : input.problemImpact.trim().length >= 60 ? 6 : 2;
  score += impact;
  reasons.push(`Clareza do problema (+${impact})`);

  const breadth = Math.min(input.processToImprove.length * 2, 5);
  score += breadth;
  reasons.push(`Âmbito: ${input.processToImprove.length} processo(s) (+${breadth})`);

  const maturity = input.currentWebsite ? 5 : 2;
  score += maturity;
  reasons.push(`Maturidade digital (+${maturity})`);

  const tier: LeadTier = score >= 70 ? 'A' : score >= 50 ? 'B' : score >= 30 ? 'C' : 'D';
  return { score, tier, reasons };
}
