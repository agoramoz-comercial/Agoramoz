import { describe, expect, it } from 'vitest';
import type { Cartao } from './cartoes';
import { minutosRestantes } from './ritmo';
import type { Pergunta } from './spec';

const q = (tipo: Pergunta['tipo']): Cartao =>
  ({ tipo: 'pergunta', pergunta: { tipo, chave: tipo, titulo: tipo } }) as unknown as Cartao;

describe('minutosRestantes', () => {
  it('nunca diz 0 minutos', () => {
    expect(minutosRestantes([])).toBe(1);
    expect(minutosRestantes([q('nps')])).toBe(1);
  });

  it('soma por tipo e arredonda para cima', () => {
    // 45 + 45 = 90 s → 2 min
    expect(minutosRestantes([q('texto_longo'), q('texto_longo')])).toBe(2);
    // 10 escolhas únicas = 60 s → 1 min; mais o contacto (30 s) → 2 min
    const dez = Array.from({ length: 10 }, () => q('escolha_unica'));
    expect(minutosRestantes(dez)).toBe(1);
    expect(minutosRestantes([...dez, { tipo: 'contacto' }])).toBe(2);
  });

  it('conta só a partir do cartão actual', () => {
    const c = [q('texto_longo'), q('texto_longo'), q('texto_longo')];
    expect(minutosRestantes(c, 0)).toBe(3);
    expect(minutosRestantes(c, 2)).toBe(1);
    expect(minutosRestantes(c, -5)).toBe(3);
  });
});
