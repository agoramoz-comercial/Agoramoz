import { describe, expect, it } from 'vitest';
import { colunaEmFalta, crmOperacional } from './activacao';

function cliente(error: { code?: string } | null) {
  return { from: () => ({ select: () => ({ limit: async () => ({ data: [], error }) }) }) } as never;
}

describe('a 0019 está aplicada?', () => {
  it('reconhece coluna em falta pelos dois códigos', () => {
    expect(colunaEmFalta('42703')).toBe(true);
    expect(colunaEmFalta('PGRST204')).toBe(true);
    expect(colunaEmFalta('42501')).toBe(false);
    expect(colunaEmFalta(undefined)).toBe(false);
  });
  it('sim, não, ou não se sabe (outra falha) — nunca confunde os três', async () => {
    expect(await crmOperacional(cliente(null))).toBe(true);
    expect(await crmOperacional(cliente({ code: '42703' }))).toBe(false);
    expect(await crmOperacional(cliente({ code: '57014' }))).toBeNull();
  });
});
