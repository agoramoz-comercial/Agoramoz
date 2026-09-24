/**
 * Tipos do motor de diagnóstico.
 *
 * A regra que estes tipos existem para impor: **um facto tem de ter origem**.
 * Não há campo onde caiba um número sem proveniência, nem uma conclusão sem a
 * regra que a produziu. É o que permite responder a «de onde veio este valor?»
 * meses depois, e é o que impede a camada de redação de inventar.
 */

/** Gravidade. Ordem significativa: é usada para ordenar e para decidir corte. */
export const SEVERITIES = ['critica', 'alta', 'media', 'baixa', 'informativa'] as const;
export type Severity = (typeof SEVERITIES)[number];

export const SEVERITY_ORDER: Record<Severity, number> = {
  critica: 5,
  alta: 4,
  media: 3,
  baixa: 2,
  informativa: 1,
};

/**
 * De onde vem um facto. Estas três são as ÚNICAS origens admitidas, e é
 * deliberado que não exista `benchmark_externo` nem `estatistica_de_mercado`:
 * a AGORAMOZ não tem hoje nenhuma fonte dessas verificada, e um tipo que as
 * aceitasse era um convite a preenchê-las com números plausíveis.
 *
 * - `resposta`  o cliente disse-o. É dele, não nosso.
 * - `derivado`  calculado por uma regra a partir de respostas. Reproduzível.
 * - `catalogo`  vem do nosso próprio conteúdo (setores, faixas, soluções).
 */
export type EvidenceSource = 'resposta' | 'derivado' | 'catalogo';

export interface Evidence {
  /** Identificador estável, citável pelas conclusões. Ex.: `resp.currentWebsite`. */
  readonly id: string;
  readonly source: EvidenceSource;
  /** Campo ou chave de origem, para rastrear até ao formulário ou ao conteúdo. */
  readonly key: string;
  /** Valor tipado. Nunca uma frase redigida. */
  readonly value: string | number | boolean | readonly string[] | null;
  /** Quando `derivado`, a regra que o calculou. */
  readonly derivedFrom?: readonly string[];
}

/**
 * Conclusão produzida por uma regra.
 *
 * Note-se o que NÃO existe aqui: nenhum campo de texto livre destinado ao
 * cliente. `code` é uma chave estável que a camada de apresentação usa para
 * escolher o texto; `facts` leva valores tipados. Assim a redação pode mudar
 * sem que a conclusão mude, e a conclusão não pode mudar por alguém ter
 * reescrito uma frase.
 */
export interface Finding {
  readonly ruleId: string;
  readonly ruleVersion: number;
  /** Chave estável do achado. Ex.: `SEM_PRESENCA_WEB`. */
  readonly code: string;
  readonly severity: Severity;
  /** Menor é mais urgente. Determinada pela regra, nunca por um modelo. */
  readonly priority: number;
  /** Ids de `Evidence` que sustentam este achado. Validados: têm de existir. */
  readonly evidenceIds: readonly string[];
  /** Valores tipados que a redação pode citar. Define os números permitidos. */
  readonly facts: Readonly<Record<string, string | number | boolean>>;
}

/** O que se entrega à camada de redação, e mais nada. */
export interface EvidenceBundle {
  readonly rulesetVersion: string;
  readonly scoringVersion: string;
  readonly evidence: readonly Evidence[];
  readonly findings: readonly Finding[];
  /**
   * Conjunto de todos os numerais admissíveis no texto redigido, derivado das
   * evidências e dos factos. O validador rejeita qualquer número fora daqui.
   */
  readonly allowedNumbers: readonly number[];
}

/** Contexto que uma regra recebe. Só leitura, sempre. */
export interface RuleContext {
  readonly answers: Readonly<Record<string, unknown>>;
  readonly evidence: ReadonlyMap<string, Evidence>;
}

export interface Rule {
  readonly id: string;
  readonly version: number;
  /** Descrição interna, para quem lê o código e para auditoria. Não vai para o cliente. */
  readonly description: string;
  readonly code: string;
  readonly severity: Severity;
  readonly priority: number;
  /** Ids de evidência que a regra consulta. Declarados, para a auditoria ser legível. */
  readonly uses: readonly string[];
  /**
   * Devolve os factos quando dispara, ou `null` quando não se aplica.
   * Tem de ser pura: mesma entrada, mesma saída, sem relógio nem aleatório.
   */
  readonly evaluate: (ctx: RuleContext) => Readonly<Record<string, string | number | boolean>> | null;
}

/**
 * Estados do diagnóstico. A ordem aqui é a do percurso feliz; as exceções
 * estão à parte porque não são etapas, são desvios.
 */
export const DIAGNOSTIC_STATES = [
  'computed',
  'drafting',
  'drafted',
  'pending_review',
  'approved',
  'rendering',
  'ready',
  'sending',
  'sent',
  'draft_failed',
  'validation_failed',
  'rejected',
  'render_failed',
  'send_failed',
  'revoked',
] as const;

export type DiagnosticState = (typeof DIAGNOSTIC_STATES)[number];
