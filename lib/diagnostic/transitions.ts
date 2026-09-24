import type { DiagnosticState } from './types';

/**
 * Máquina de estados do diagnóstico.
 *
 * Existe porque o estado não pode ser uma coluna que qualquer código atualiza
 * à vontade. Duas coisas têm de ser impossíveis, não improváveis: enviar um
 * documento que ninguém aprovou, e o processo de redação aprovar-se a si
 * próprio. Aqui isso lança; na base de dados haverá a constraint equivalente,
 * porque uma defesa só na aplicação é uma defesa que uma migração desatenta
 * contorna.
 */

export type ActorType = 'user' | 'system' | 'ai';

export interface TransitionContext {
  readonly actorType: ActorType;
  /** Id de quem age. Obrigatório quando `actorType` é `user`. */
  readonly actorId?: string | null;
  /**
   * Revisão que o ator viu quando decidiu. Comparada com a actual para não se
   * aprovar conteúdo que entretanto mudou.
   */
  readonly seenRevision?: number;
  readonly currentRevision?: number;
}

export class TransitionError extends Error {
  constructor(
    message: string,
    readonly code:
      | 'TRANSICAO_INVALIDA'
      | 'ATOR_NAO_AUTORIZADO'
      | 'APROVADOR_EM_FALTA'
      | 'REVISAO_DESATUALIZADA',
  ) {
    super(message);
    this.name = 'TransitionError';
  }
}

/** Percurso feliz, mais os desvios. Tudo o que não esteja aqui é inválido. */
const ALLOWED: Readonly<Record<DiagnosticState, readonly DiagnosticState[]>> = {
  computed: ['drafting', 'pending_review'],
  drafting: ['drafted', 'draft_failed'],
  drafted: ['pending_review', 'validation_failed'],
  pending_review: ['approved', 'rejected', 'drafting'],
  approved: ['rendering', 'revoked'],
  rendering: ['ready', 'render_failed'],
  ready: ['sending', 'revoked'],
  sending: ['sent', 'send_failed'],
  sent: ['revoked'],

  // Desvios recuperáveis: voltam ao ponto onde faz sentido retomar.
  draft_failed: ['drafting', 'rejected'],
  validation_failed: ['drafting', 'rejected'],
  render_failed: ['rendering', 'rejected'],
  send_failed: ['sending', 'rejected'],

  // Terminais.
  rejected: ['drafting'],
  revoked: [],
};

/**
 * `computed → pending_review` existe para o caso de não haver camada de IA:
 * um humano redige e submete a revisão. O motor não obriga a passar por um
 * modelo para se chegar a um documento.
 */
export function canTransition(from: DiagnosticState, to: DiagnosticState): boolean {
  return ALLOWED[from]?.includes(to) ?? false;
}

export function allowedFrom(from: DiagnosticState): readonly DiagnosticState[] {
  return ALLOWED[from] ?? [];
}

/**
 * Valida uma transição e lança quando não é permitida.
 *
 * Lança em vez de devolver um booleano de propósito: um chamador que ignore um
 * `false` produz um envio não aprovado em silêncio. Uma exceção não se ignora
 * por distração.
 */
export function assertTransition(
  from: DiagnosticState,
  to: DiagnosticState,
  ctx: TransitionContext,
): void {
  if (!canTransition(from, to)) {
    throw new TransitionError(`Transição inválida: ${from} → ${to}.`, 'TRANSICAO_INVALIDA');
  }

  /**
   * A aprovação é o ponto em que a AGORAMOZ assume o que o documento diz.
   * Tem de ser uma pessoa — nem o sistema, nem o processo de redação.
   */
  if (to === 'approved') {
    if (ctx.actorType !== 'user') {
      throw new TransitionError(
        `Só um utilizador aprova um diagnóstico; recebido actorType="${ctx.actorType}".`,
        'ATOR_NAO_AUTORIZADO',
      );
    }
    if (!ctx.actorId) {
      throw new TransitionError('Aprovação exige a identidade de quem aprova.', 'APROVADOR_EM_FALTA');
    }
    /**
     * Aprovar o que já mudou é pior do que não aprovar: fica registado que
     * alguém validou um conteúdo que nunca leu.
     */
    if (
      ctx.seenRevision !== undefined &&
      ctx.currentRevision !== undefined &&
      ctx.seenRevision !== ctx.currentRevision
    ) {
      throw new TransitionError(
        `Conteúdo alterado desde a leitura (viu ${ctx.seenRevision}, actual ${ctx.currentRevision}).`,
        'REVISAO_DESATUALIZADA',
      );
    }
  }

  // Rejeitar e revogar são decisões com consequência; também são de pessoas.
  if ((to === 'rejected' || to === 'revoked') && ctx.actorType !== 'user') {
    throw new TransitionError(
      `Só um utilizador pode ${to === 'rejected' ? 'rejeitar' : 'revogar'}.`,
      'ATOR_NAO_AUTORIZADO',
    );
  }
}

/** Estados a partir dos quais já não há caminho para `sent`. */
export function isTerminal(state: DiagnosticState): boolean {
  return ALLOWED[state].length === 0;
}
