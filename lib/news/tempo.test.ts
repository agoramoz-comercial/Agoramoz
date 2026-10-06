import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { comLimite, LIMITE_LEITURA_MS, LIMITE_ROTA_MS } from './tempo';

describe('comLimite — uma base lenta nunca pendura a página', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('devolve o resultado da base quando chega a tempo', async () => {
    const r = comLimite(Promise.resolve({ data: [1], error: null }), 1000);
    await expect(r).resolves.toEqual({ data: [1], error: null });
  });

  it('esgotado o prazo, devolve um erro «timeout» em vez de esperar', async () => {
    const nunca = new Promise<{ data: unknown; error: null }>(() => {});
    const r = comLimite(nunca, 1000);
    vi.advanceTimersByTime(1000);
    await expect(r).resolves.toEqual({ data: null, error: { code: 'timeout' } });
  });

  it('um erro da base passa tal como veio (não é confundido com timeout)', async () => {
    const r = comLimite(Promise.resolve({ data: null, error: { code: 'PGRST003' } }), 1000);
    await expect(r).resolves.toEqual({ data: null, error: { code: 'PGRST003' } });
  });

  it('uma excepção na chamada vira erro, nunca rejeição', async () => {
    const r = comLimite(Promise.reject(new Error('rede')), 1000);
    await expect(r).resolves.toEqual({ data: null, error: { code: 'excepcao' } });
  });

  it('os prazos ficam muito abaixo dos 60 s do pool esgotado', () => {
    expect(LIMITE_LEITURA_MS).toBeLessThanOrEqual(5000);
    expect(LIMITE_ROTA_MS).toBeLessThanOrEqual(LIMITE_LEITURA_MS);
  });
});
