import { describe, expect, it } from 'vitest';
import {
  TransitionError,
  allowedFrom,
  assertTransition,
  canTransition,
  isTerminal,
} from './transitions';
import { DIAGNOSTIC_STATES, type DiagnosticState } from './types';

const utilizador = { actorType: 'user' as const, actorId: 'u-1' };
const sistema = { actorType: 'system' as const };
const ia = { actorType: 'ai' as const };

describe('percurso feliz', () => {
  const percurso: readonly [DiagnosticState, DiagnosticState][] = [
    ['computed', 'drafting'],
    ['drafting', 'drafted'],
    ['drafted', 'pending_review'],
    ['pending_review', 'approved'],
    ['approved', 'rendering'],
    ['rendering', 'ready'],
    ['ready', 'sending'],
    ['sending', 'sent'],
  ];

  it.each(percurso)('permite %s → %s', (de, para) => {
    expect(canTransition(de, para)).toBe(true);
  });

  /**
   * Um humano pode redigir e submeter a revisão sem passar por modelo nenhum.
   * O motor não pode exigir IA para se chegar a um documento.
   */
  it('permite saltar a redação automática: computed → pending_review', () => {
    expect(canTransition('computed', 'pending_review')).toBe(true);
  });
});

describe('transições inválidas', () => {
  it.each([
    ['computed', 'approved'],
    ['computed', 'sent'],
    ['drafted', 'approved'],
    ['pending_review', 'sent'],
    ['approved', 'sent'],
    ['ready', 'approved'],
    ['revoked', 'drafting'],
    ['sent', 'sending'],
  ] as const)('recusa %s → %s', (de, para) => {
    expect(canTransition(de, para)).toBe(false);
    expect(() => assertTransition(de, para, utilizador)).toThrow(TransitionError);
  });

  it('lança com código identificável, para o chamador poder reagir', () => {
    try {
      assertTransition('computed', 'sent', utilizador);
      expect.unreachable('devia ter lançado');
    } catch (e) {
      expect((e as TransitionError).code).toBe('TRANSICAO_INVALIDA');
    }
  });
});

describe('guarda da aprovação', () => {
  /**
   * O ponto em que a AGORAMOZ assume o que o documento diz. Tem de ser uma
   * pessoa — e, em particular, o processo de redação não se pode aprovar.
   */
  it.each([
    ['system', sistema],
    ['ai', ia],
  ] as const)('recusa aprovação por %s', (_rotulo, ctx) => {
    expect(() => assertTransition('pending_review', 'approved', ctx)).toThrow(/Só um utilizador/);
  });

  it('exige a identidade de quem aprova', () => {
    expect(() =>
      assertTransition('pending_review', 'approved', { actorType: 'user', actorId: null }),
    ).toThrow(/identidade/);
  });

  it('aceita aprovação por utilizador identificado', () => {
    expect(() => assertTransition('pending_review', 'approved', utilizador)).not.toThrow();
  });

  /**
   * Aprovar conteúdo que mudou é pior do que não aprovar: fica registado que
   * alguém validou um texto que nunca leu.
   */
  it('recusa quando o conteúdo mudou desde a leitura', () => {
    expect(() =>
      assertTransition('pending_review', 'approved', {
        ...utilizador,
        seenRevision: 3,
        currentRevision: 4,
      }),
    ).toThrow(/alterado desde a leitura/);
  });

  it('aceita quando a revisão lida é a actual', () => {
    expect(() =>
      assertTransition('pending_review', 'approved', {
        ...utilizador,
        seenRevision: 4,
        currentRevision: 4,
      }),
    ).not.toThrow();
  });

  it('não exige revisão quando o chamador não a fornece', () => {
    expect(() => assertTransition('pending_review', 'approved', utilizador)).not.toThrow();
  });
});

describe('rejeitar e revogar são decisões de pessoas', () => {
  it.each(['rejected', 'revoked'] as const)('recusa %s por sistema', (destino) => {
    const de: DiagnosticState = destino === 'rejected' ? 'pending_review' : 'sent';
    expect(() => assertTransition(de, destino, sistema)).toThrow(/Só um utilizador/);
  });

  it('permite ao utilizador rejeitar a partir da revisão', () => {
    expect(() => assertTransition('pending_review', 'rejected', utilizador)).not.toThrow();
  });
});

describe('desvios e recuperação', () => {
  it.each([
    ['draft_failed', 'drafting'],
    ['validation_failed', 'drafting'],
    ['render_failed', 'rendering'],
    ['send_failed', 'sending'],
  ] as const)('permite retomar de %s para %s', (de, para) => {
    expect(canTransition(de, para)).toBe(true);
  });

  /**
   * A falha de validação nunca pode seguir para documento. É a barreira que
   * separa «o modelo inventou» de «o cliente recebeu».
   */
  it.each(['approved', 'rendering', 'ready', 'sending', 'sent'] as const)(
    'não permite validation_failed → %s',
    (para) => {
      expect(canTransition('validation_failed', para)).toBe(false);
    },
  );
});

describe('integridade do grafo', () => {
  it('todos os estados têm entrada na tabela', () => {
    for (const estado of DIAGNOSTIC_STATES) {
      expect(allowedFrom(estado)).toBeDefined();
    }
  });

  it('só revoked é terminal', () => {
    const terminais = DIAGNOSTIC_STATES.filter(isTerminal);
    expect(terminais).toEqual(['revoked']);
  });

  it('nenhuma transição aponta para um estado desconhecido', () => {
    const validos = new Set<string>(DIAGNOSTIC_STATES);
    for (const estado of DIAGNOSTIC_STATES) {
      for (const destino of allowedFrom(estado)) expect(validos).toContain(destino);
    }
  });
});
