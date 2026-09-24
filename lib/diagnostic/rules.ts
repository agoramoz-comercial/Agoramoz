import type { LeadInput } from '@/lib/forms/lead-schema';
import { allowedNumbersFrom, buildEvidence, indexEvidence } from './evidence';
import type { EvidenceBundle, Finding, Rule, RuleContext } from './types';
import { SEVERITY_ORDER } from './types';

/**
 * Registo de regras do diagnóstico.
 *
 * ## O que uma regra pode afirmar
 *
 * Só o que decorre das respostas do próprio cliente ou do nosso catálogo. Uma
 * regra pode dizer «respondeu X e Y, que estão em tensão». Não pode dizer
 * «empresas como a sua perdem 30%» — não temos essa fonte verificada, e um
 * número desses num documento com a nossa marca é um passivo, não um argumento.
 *
 * ## O que este ficheiro deliberadamente NÃO contém
 *
 * A metodologia de consultoria da AGORAMOZ. Os critérios, os limiares e as
 * recomendações comerciais são conhecimento do negócio que não me foi dado, e
 * supô-los seria inventar exactamente o que estas regras existem para impedir.
 *
 * O que está aqui são regras **estruturais**: derivam da forma das respostas,
 * não de conhecimento de mercado. São verdadeiras por construção e servem de
 * esqueleto testado. Acrescentar uma regra de negócio é um objeto neste
 * registo e um teste — a mecânica à volta já está feita e provada.
 */

export const RULESET_VERSION = '2026-09-24.1';

/**
 * Uma regra é imutável depois de usada num diagnóstico emitido. Corrigir
 * comportamento cria `version: 2`, nunca reescreve a 1 — senão um diagnóstico
 * do mês passado deixa de ser reproduzível e a auditoria perde o pé.
 */
export const RULES: readonly Rule[] = [
  {
    id: 'presenca.sem-website',
    version: 1,
    description:
      'O cliente não declarou website. Facto da resposta dele, sem juízo sobre o que isso implica no mercado.',
    code: 'SEM_PRESENCA_WEB',
    severity: 'alta',
    priority: 10,
    uses: ['resp.hasWebsite'],
    evaluate: (ctx) => (ctx.evidence.get('resp.hasWebsite')?.value === false ? {} : null),
  },

  {
    id: 'decisao.responde-quem-nao-decide',
    version: 1,
    description:
      'Quem preencheu não é o decisor. Muda o desenho do seguimento — quem tem de estar na conversa seguinte.',
    code: 'DECISOR_AUSENTE',
    severity: 'media',
    priority: 20,
    uses: ['resp.decisionRole'],
    evaluate: (ctx) => {
      const papel = ctx.evidence.get('resp.decisionRole')?.value;
      return papel === 'influenciador' || papel === 'pesquisa' ? { papel: String(papel) } : null;
    },
  },

  {
    id: 'tensao.urgencia-sem-orcamento',
    version: 1,
    description:
      'Prazo imediato com faixa de investimento por definir. É uma tensão entre DUAS respostas dele, não uma afirmação nossa.',
    code: 'URGENCIA_SEM_ORCAMENTO',
    severity: 'alta',
    priority: 15,
    uses: ['resp.decisionTimeframe', 'resp.investmentBand'],
    evaluate: (ctx) => {
      const prazo = ctx.evidence.get('resp.decisionTimeframe')?.value;
      const faixa = String(ctx.evidence.get('resp.investmentBand')?.value ?? '');
      const porDefinir = faixa.endsWith('-0');
      return prazo === 'imediato' && porDefinir ? { prazo: String(prazo) } : null;
    },
  },

  {
    id: 'ambito.largo-para-a-dimensao',
    version: 1,
    description:
      'Três ou mais processos a melhorar numa organização até nove pessoas. Tensão entre âmbito e capacidade declarados por ele.',
    code: 'AMBITO_LARGO_EQUIPA_PEQUENA',
    severity: 'media',
    priority: 30,
    uses: ['der.processCount', 'resp.companySize'],
    evaluate: (ctx) => {
      const n = Number(ctx.evidence.get('der.processCount')?.value ?? 0);
      const dimensao = ctx.evidence.get('resp.companySize')?.value;
      return n >= 3 && dimensao === '1-9' ? { processos: n } : null;
    },
  },

  {
    id: 'contexto.problema-pouco-detalhado',
    version: 1,
    description:
      'Descrição do impacto curta. Não é juízo sobre o cliente: sinaliza que a conversa seguinte precisa de levantamento antes de propor.',
    code: 'CONTEXTO_INSUFICIENTE',
    severity: 'baixa',
    priority: 40,
    uses: ['der.impactLength'],
    evaluate: (ctx) => {
      const n = Number(ctx.evidence.get('der.impactLength')?.value ?? 0);
      return n < 60 ? { caracteres: n } : null;
    },
  },
];

/** Falha cedo se duas regras partilharem id — um id repetido corrompe a auditoria. */
function assertIdsUnicos(regras: readonly Rule[]): void {
  const vistos = new Set<string>();
  for (const r of regras) {
    if (vistos.has(r.id)) throw new Error(`Regra duplicada: ${r.id}`);
    vistos.add(r.id);
  }
}

/**
 * Corre o conjunto de regras e devolve o pacote completo.
 *
 * Determinístico: sem relógio, sem aleatório, sem I/O. A mesma entrada dá
 * sempre o mesmo pacote — é o que torna um diagnóstico reproduzível e o que
 * permite testá-lo sem base de dados.
 */
export function runRules(input: LeadInput, scoringVersion: string): EvidenceBundle {
  assertIdsUnicos(RULES);

  const evidence = buildEvidence(input);
  const ctx: RuleContext = {
    answers: input as unknown as Record<string, unknown>,
    evidence: indexEvidence(evidence),
  };

  const findings: Finding[] = [];
  for (const rule of RULES) {
    const facts = rule.evaluate(ctx);
    if (facts === null) continue;

    findings.push({
      ruleId: rule.id,
      ruleVersion: rule.version,
      code: rule.code,
      severity: rule.severity,
      priority: rule.priority,
      evidenceIds: rule.uses,
      facts,
    });
  }

  // Gravidade primeiro, prioridade a desempatar, id por último para a ordem
  // ser total — sem isso, dois achados equivalentes podiam trocar de lugar
  // entre execuções e o documento deixava de ser reproduzível.
  findings.sort(
    (a, b) =>
      SEVERITY_ORDER[b.severity] - SEVERITY_ORDER[a.severity] ||
      a.priority - b.priority ||
      (a.ruleId < b.ruleId ? -1 : a.ruleId > b.ruleId ? 1 : 0),
  );

  return {
    rulesetVersion: RULESET_VERSION,
    scoringVersion,
    evidence,
    findings,
    allowedNumbers: allowedNumbersFrom(
      evidence,
      findings.map((f) => f.facts),
    ),
  };
}
