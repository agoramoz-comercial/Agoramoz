import { createHmac } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Reuniao } from '@/lib/agendamento/cal';

/**
 * O webhook do Cal.com, com a base substituída. Prova as guardas (interruptor,
 * tipo, tamanho, assinatura antes de qualquer parsing), a leitura mínima e as
 * respostas que o Cal precisa para saber se reenvia.
 */

const SEGREDO = 'segredo-de-teste-com-mais-de-trinta-e-dois-caracteres';
const LIGADO = {
  SCHEDULING: 'cal',
  CAL_LINK: 'agoramoz/conversa-30',
  CAL_WEBHOOK_SECRET: SEGREDO,
  SUPABASE_URL: 'https://projecto.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'chave-de-teste-suficientemente-longa',
};

const registar =
  vi.fn<(c: unknown, r: Reuniao) => Promise<{ ligada: boolean; mudou: boolean; estado: string; motivo: string }>>();
const clienteDb = vi.fn<() => unknown>();

vi.mock('@/lib/db/client', () => ({ dbAdmin: () => clienteDb() }));
vi.mock('@/lib/agendamento/servidor', () => ({ registarReuniao: (c: unknown, r: Reuniao) => registar(c, r) }));

async function carregarRota(env: Record<string, string> = LIGADO) {
  vi.resetModules();
  for (const [k, v] of Object.entries(env)) vi.stubEnv(k, v);
  return (await import('./route')).POST;
}

const assinar = (corpo: string, segredo = SEGREDO) => createHmac('sha256', segredo).update(corpo).digest('hex');

function entrega(evento = 'BOOKING_CREATED', payload: Record<string, unknown> = {}) {
  return JSON.stringify({
    triggerEvent: evento,
    createdAt: '2026-10-01T09:00:00.000Z',
    payload: {
      uid: 'uid-sintetico-1',
      type: 'conversa-30',
      startTime: '2026-10-05T09:30:00Z',
      endTime: '2026-10-05T10:00:00Z',
      attendees: [{ email: 'pessoa@exemplo.test', name: 'Pessoa Exemplo' }],
      metadata: { ref: 'A'.repeat(32), videoCallUrl: 'https://video.exemplo.test/sala' },
      ...payload,
    },
  });
}

function pedido(corpo: string, headers: Record<string, string> = {}) {
  return new Request('https://agoramoz.com/api/agendamentos/cal', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-cal-signature-256': assinar(corpo), ...headers },
    body: corpo,
  });
}

let linhas: string[] = [];
beforeEach(() => {
  linhas = [];
  const guardar = (l: unknown) => void linhas.push(String(l));
  vi.spyOn(console, 'log').mockImplementation(guardar);
  vi.spyOn(console, 'warn').mockImplementation(guardar);
  vi.spyOn(console, 'error').mockImplementation(guardar);
  clienteDb.mockReturnValue({});
  registar.mockResolvedValue({ ligada: true, mudou: true, estado: 'marcada', motivo: 'ref' });
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  registar.mockReset();
  clienteDb.mockReset();
});

describe('interruptor e guardas', () => {
  it('SCHEDULING desligado: 503, sem tocar na base', async () => {
    const POST = await carregarRota({});
    const res = await POST(pedido(entrega()));
    expect(res.status).toBe(503);
    expect(registar).not.toHaveBeenCalled();
  });

  it('tipo de conteúdo errado: 415', async () => {
    const POST = await carregarRota();
    expect((await POST(pedido(entrega(), { 'content-type': 'text/plain' }))).status).toBe(415);
  });

  it('corpo acima de 64 KB: 413', async () => {
    const POST = await carregarRota();
    const grande = entrega('BOOKING_CREATED', { title: 'x'.repeat(70_000) });
    expect((await POST(pedido(grande))).status).toBe(413);
  });
});

describe('assinatura', () => {
  it('sem assinatura, com outro segredo ou com o corpo alterado: 401, sem parsing nem base', async () => {
    const POST = await carregarRota();
    const corpo = entrega();
    const semAssinatura = new Request('https://agoramoz.com/api/agendamentos/cal', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: corpo,
    });
    expect((await POST(semAssinatura)).status).toBe(401);
    expect((await POST(pedido(corpo, { 'x-cal-signature-256': assinar(corpo, `${SEGREDO}x`) }))).status).toBe(401);
    expect((await POST(pedido(`${corpo} `, { 'x-cal-signature-256': assinar(corpo) }))).status).toBe(401);
    expect(registar).not.toHaveBeenCalled();
  });

  it('JSON inválido mas assinado: 400', async () => {
    const POST = await carregarRota();
    expect((await POST(pedido('{isto não é json'))).status).toBe(400);
  });
});

describe('entregas', () => {
  it('uma marcação chega à base só com uid, datas, tipo e ref', async () => {
    const POST = await carregarRota();
    const res = await POST(pedido(entrega()));
    expect(res.status).toBe(200);
    expect(registar).toHaveBeenCalledWith(
      {},
      {
        evento: 'BOOKING_CREATED',
        uid: 'uid-sintetico-1',
        inicio: '2026-10-05T09:30:00Z',
        fim: '2026-10-05T10:00:00Z',
        tipo: 'conversa-30',
        ref: 'A'.repeat(32),
        uidAnterior: null,
      },
    );
  });

  it('uma entrega subscrita mas ilegível: 202, e em ERRO com o evento — nunca misturada com as ignoradas', async () => {
    const POST = await carregarRota();
    const res = await POST(pedido(entrega('BOOKING_CREATED', { uid: '' })));
    expect(res.status).toBe(202);
    const linha = JSON.parse(linhas.find((l) => l.includes('"reason":"forma"'))!);
    expect(linha).toMatchObject({ level: 'error', event: 'agendamento.falhou', evento: 'BOOKING_CREATED' });
  });

  it('um evento que não subscrevemos: 202, ignorado, sem base', async () => {
    const POST = await carregarRota();
    const res = await POST(pedido(entrega('BOOKING_PAID')));
    expect(res.status).toBe(202);
    expect(registar).not.toHaveBeenCalled();
  });

  it('a base falha: 503, para o Cal reenviar', async () => {
    registar.mockRejectedValueOnce(Object.assign(new Error('x'), { code: '40001' }));
    const POST = await carregarRota();
    expect((await POST(pedido(entrega()))).status).toBe(503);
    expect(linhas.join('\n')).toContain('40001');
  });

  it('sem cliente de base: 503', async () => {
    clienteDb.mockReturnValue(null);
    const POST = await carregarRota();
    expect((await POST(pedido(entrega()))).status).toBe(503);
  });

  it('uma reunião que não liga fica em aviso, com o motivo sem-ref', async () => {
    registar.mockResolvedValueOnce({ ligada: false, mudou: true, estado: 'marcada', motivo: 'sem-ref' });
    const POST = await carregarRota();
    await POST(pedido(entrega('BOOKING_CREATED', { metadata: {} })));
    const linha = JSON.parse(linhas.find((l) => l.includes('agendamento.registado'))!);
    expect(linha).toMatchObject({ level: 'warn', evento: 'BOOKING_CREATED', ligada: false, reason: 'sem-ref' });
  });
});

describe('logs', () => {
  it('nem participantes, nem o ref, nem o link de vídeo, nem o segredo', async () => {
    const POST = await carregarRota();
    await POST(pedido(entrega()));
    await POST(pedido(entrega(), { 'x-cal-signature-256': '0'.repeat(64) }));
    const tudo = linhas.join('\n');
    for (const proibido of ['exemplo.test', 'Pessoa', 'A'.repeat(32), 'video', SEGREDO]) {
      expect(tudo, proibido).not.toContain(proibido);
    }
  });
});

describe('limites da revisão', () => {
  it('corpo sem Content-Length acima de 64 KB: 413, sem ler tudo', async () => {
    const POST = await carregarRota();
    const fluxo = new ReadableStream<Uint8Array>({
      pull(c) {
        c.enqueue(new Uint8Array(16 * 1024));
      },
    });
    const res = await POST(
      new Request('https://agoramoz.com/api/agendamentos/cal', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: fluxo,
        duplex: 'half',
      } as RequestInit),
    );
    expect(res.status).toBe(413);
    expect(registar).not.toHaveBeenCalled();
  });

  it('inundação da mesma origem: 429', async () => {
    const POST = await carregarRota();
    const estados: number[] = [];
    for (let i = 0; i < 125; i++) {
      estados.push((await POST(pedido(entrega(), { 'x-forwarded-for': '198.51.100.7' }))).status);
    }
    expect(estados.slice(0, 120).every((s) => s === 200)).toBe(true);
    expect(estados.at(-1)).toBe(429);
  });
});
