import { describe, expect, it } from 'vitest';
import { ARCO, escalaCoberta, passosAcesos, valorNaContagem } from './v2';

describe('efeito 03 · passos acesos', () => {
  it('nenhum antes de começar, todos no fim', () => {
    expect(passosAcesos(0, 7)).toBe(0);
    expect(passosAcesos(1, 7)).toBe(7);
  });
  it('o primeiro acende logo, o último só no fim', () => {
    expect(passosAcesos(0.01, 7)).toBe(1);
    expect(passosAcesos(0.99, 7)).toBe(6);
  });
  it('cresce sem saltar para trás', () => {
    let antes = 0;
    for (let i = 0; i <= 100; i++) {
      const n = passosAcesos(i / 100, 7);
      expect(n).toBeGreaterThanOrEqual(antes);
      antes = n;
    }
  });
  it('aguenta entradas estranhas', () => {
    expect(passosAcesos(Number.NaN, 7)).toBe(0);
    expect(passosAcesos(2, 7)).toBe(7);
    expect(passosAcesos(-1, 7)).toBe(0);
    expect(passosAcesos(0.5, 0)).toBe(0);
  });
});

describe('efeito 02 · contagem', () => {
  it('termina exactamente no alvo', () => {
    expect(valorNaContagem(1, 10)).toBe(10);
    expect(valorNaContagem(5, 10)).toBe(10);
  });
  it('é inteiro e nunca passa o alvo', () => {
    for (let i = 0; i < 100; i++) {
      const v = valorNaContagem(i / 100, 7);
      expect(Number.isInteger(v)).toBe(true);
      expect(v).toBeLessThanOrEqual(7);
    }
  });
  it('começa em zero', () => {
    expect(valorNaContagem(0, 6)).toBe(0);
    expect(valorNaContagem(Number.NaN, 6)).toBe(0);
  });
});

describe('efeito 05 · escala dos cartões cobertos', () => {
  it('o último cartão não encolhe', () => {
    expect(escalaCoberta(3, 4)).toBe(1);
  });
  it('os de baixo encolhem mais', () => {
    expect(escalaCoberta(0, 4)).toBeLessThan(escalaCoberta(1, 4));
    expect(escalaCoberta(1, 4)).toBeLessThan(escalaCoberta(2, 4));
  });
  it('nunca abaixo de 0,86', () => {
    expect(escalaCoberta(0, 40)).toBe(0.86);
  });
});

describe('efeito 06 · arco', () => {
  it('os dois estados têm a mesma forma, para interpolar', () => {
    const forma = (s: string) => s.replace(/[\d.]+/g, '#');
    expect(forma(ARCO.fechado)).toBe(forma(ARCO.aberto));
  });
});
