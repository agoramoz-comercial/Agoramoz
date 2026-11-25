import { describe, expect, it, vi } from 'vitest';
import { comRecuo429, esperaAntes, motivo429 } from './kimi-429';

const r429 = (corpo: unknown, h: Record<string, string> = {}) => new Response(JSON.stringify(corpo), { status: 429, headers: h });

describe('IA-429-01 o 429 do Kimi', () => {
  it('distingue saldo de limite só pelo tipo do erro', async () => {
    expect(await motivo429(r429({ error: { type: 'exceeded_current_quota_error', message: 'x' } }))).toBe('saldo');
    expect(await motivo429(r429({ error: { type: 'rate_limit_reached_error' } }))).toBe('limite');
    expect(await motivo429(r429({ error: { message: 'Your account balance is insufficient' } }))).toBe('saldo');
    expect(await motivo429(new Response('não é json', { status: 429 }))).toBe('limite');
  });

  it('espera o Retry-After, senão 1 s, 2 s, 4 s, com tecto de 8 s', () => {
    expect(esperaAntes(r429({}, { 'retry-after': '3' }), 0)).toBe(3000);
    expect(esperaAntes(r429({}, { 'retry-after': '60' }), 0)).toBe(8000);
    expect(esperaAntes(null, 0)).toBe(1000);
    expect(esperaAntes(null, 2)).toBe(4000);
  });

  it('limite: espera e repete até 3 vezes; passa quando o Kimi aceita', async () => {
    const dormir = vi.fn(async () => undefined);
    let n = 0;
    const r = await comRecuo429(async () => (++n < 3 ? r429({ error: { type: 'rate_limit_reached_error' } }) : new Response('{}')), { dormir });
    expect('res' in r && r.res.status).toBe(200);
    expect(dormir).toHaveBeenCalledTimes(2);
  });

  it('saldo: pára logo, sem esperar', async () => {
    const dormir = vi.fn(async () => undefined);
    const fazer = vi.fn(async () => r429({ error: { type: 'exceeded_current_quota_error' } }));
    expect(await comRecuo429(fazer, { dormir })).toEqual({ sem: 'saldo' });
    expect(fazer).toHaveBeenCalledOnce();
    expect(dormir).not.toHaveBeenCalled();
  });

  it('limite que não passa: devolve «limite» ao fim de 3 tentativas', async () => {
    const fazer = vi.fn(async () => r429({ error: { type: 'rate_limit_reached_error' } }));
    expect(await comRecuo429(fazer, { dormir: async () => undefined })).toEqual({ sem: 'limite' });
    expect(fazer).toHaveBeenCalledTimes(3);
  });
});
