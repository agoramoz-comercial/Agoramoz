import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  ESTADO_DO_EVENTO,
  EVENTOS_CAL,
  REF_VALIDO,
  assinaturaValida,
  gerarRef,
  hashRef,
  lerEntrega,
  urlDeMarcacao,
} from './cal';

const SEGREDO = 'segredo-de-teste-com-mais-de-trinta-e-dois-caracteres';
const assinar = (corpo: string) => createHmac('sha256', SEGREDO).update(corpo).digest('hex');

/** Forma do exemplo da documentação do Cal, com dados sintéticos. */
function marcacao(extra: Record<string, unknown> = {}, evento = 'BOOKING_CREATED') {
  return {
    triggerEvent: evento,
    createdAt: '2026-10-01T09:00:00.000Z',
    payload: {
      type: 'conversa-30',
      title: 'Conversa',
      startTime: '2026-10-05T09:30:00Z',
      endTime: '2026-10-05T10:00:00Z',
      uid: 'uid-sintetico-1',
      attendees: [{ email: 'pessoa@exemplo.test', name: 'Pessoa Exemplo' }],
      responses: { name: { value: 'Pessoa Exemplo' } },
      metadata: { ref: 'A'.repeat(32), videoCallUrl: 'https://video.exemplo.test/sala' },
      ...extra,
    },
  };
}

describe('ref', () => {
  it('gera 32 caracteres base64url, diferentes a cada chamada', () => {
    const a = gerarRef();
    expect(a).toMatch(REF_VALIDO);
    expect(gerarRef()).not.toBe(a);
  });

  it('o hash é SHA-256 em hex e determinístico', () => {
    expect(hashRef('x')).toMatch(/^[0-9a-f]{64}$/);
    expect(hashRef('x')).toBe(hashRef('x'));
    expect(hashRef('x')).not.toBe(hashRef('y'));
  });
});

describe('urlDeMarcacao', () => {
  it('leva só o ref, codificado, e nada pessoal', () => {
    const url = new URL(urlDeMarcacao('https://cal.com', 'agoramoz/conversa-30', 'A'.repeat(32)));
    expect(url.origin).toBe('https://cal.com');
    expect(url.pathname).toBe('/agoramoz/conversa-30');
    expect([...url.searchParams.keys()]).toEqual(['metadata[ref]']);
    expect(url.searchParams.get('metadata[ref]')).toBe('A'.repeat(32));
  });
});

describe('assinaturaValida', () => {
  const corpo = JSON.stringify(marcacao());

  it('aceita o HMAC certo', () => {
    expect(assinaturaValida(corpo, assinar(corpo), SEGREDO)).toBe(true);
  });

  it('aceita o HMAC em maiúsculas', () => {
    expect(assinaturaValida(corpo, assinar(corpo).toUpperCase(), SEGREDO)).toBe(true);
  });

  it('recusa corpo alterado, segredo errado, cabeçalho em falta ou malformado', () => {
    expect(assinaturaValida(`${corpo} `, assinar(corpo), SEGREDO)).toBe(false);
    expect(assinaturaValida(corpo, assinar(corpo), `${SEGREDO}x`)).toBe(false);
    expect(assinaturaValida(corpo, null, SEGREDO)).toBe(false);
    expect(assinaturaValida(corpo, 'abc', SEGREDO)).toBe(false);
    expect(assinaturaValida(corpo, 'z'.repeat(64), SEGREDO)).toBe(false);
  });
});

describe('lerEntrega', () => {
  it('lê uma marcação e deita fora participantes, respostas e link de vídeo', () => {
    const r = lerEntrega(marcacao());
    expect(r).toEqual({
      tipo: 'reuniao',
      reuniao: {
        evento: 'BOOKING_CREATED',
        uid: 'uid-sintetico-1',
        inicio: '2026-10-05T09:30:00Z',
        fim: '2026-10-05T10:00:00Z',
        tipo: 'conversa-30',
        ref: 'A'.repeat(32),
        uidAnterior: null,
      },
    });
    expect(JSON.stringify(r)).not.toMatch(/exemplo\.test|Pessoa/);
  });

  it('numa remarcação guarda o uid anterior', () => {
    const r = lerEntrega(marcacao({ uid: 'uid-novo', rescheduleUid: 'uid-sintetico-1' }, 'BOOKING_RESCHEDULED'));
    expect(r.tipo === 'reuniao' && r.reuniao.uidAnterior).toBe('uid-sintetico-1');
  });

  it('aceita o MEETING_ENDED plano, sem invólucro payload', () => {
    const r = lerEntrega({ triggerEvent: 'MEETING_ENDED', uid: 'uid-sintetico-1', startTime: '2026-10-05T09:30:00Z' });
    expect(r.tipo === 'reuniao' && r.reuniao.evento).toBe('MEETING_ENDED');
  });

  it('um ref com outro formato é descartado, não confiado', () => {
    const r = lerEntrega(marcacao({ metadata: { ref: "'; drop table deals; --" } }));
    expect(r.tipo === 'reuniao' && r.reuniao.ref).toBeNull();
  });

  it('datas malformadas ficam nulas em vez de recusar a entrega', () => {
    const r = lerEntrega(marcacao({ startTime: 'amanhã' }));
    expect(r.tipo === 'reuniao' && r.reuniao.inicio).toBeNull();
  });

  it('eventos que não subscrevemos são ignorados', () => {
    expect(lerEntrega(marcacao({}, 'BOOKING_PAID'))).toEqual({ tipo: 'ignorada', motivo: 'evento' });
  });

  it('sem uid, ou lixo, é ignorado por forma — com o evento, se for um dos subscritos', () => {
    expect(lerEntrega(marcacao({ uid: '' }))).toEqual({ tipo: 'ignorada', motivo: 'forma', evento: 'BOOKING_CREATED' });
    expect(lerEntrega('texto')).toEqual({ tipo: 'ignorada', motivo: 'forma' });
    expect(lerEntrega(null)).toEqual({ tipo: 'ignorada', motivo: 'forma' });
  });

  it('cada evento subscrito tem estado', () => {
    for (const e of EVENTOS_CAL) expect(ESTADO_DO_EVENTO[e]).toBeTruthy();
  });
});
