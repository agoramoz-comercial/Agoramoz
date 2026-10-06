import { describe, expect, it } from 'vitest';
import { MAXIMO, MINIMO, trocaObrigatoria, validarTroca } from './palavra-passe';

describe('troca de palavra-passe', () => {
  const boa = 'quatro palavras longas aqui';

  it('aceita uma nova longa, confirmada e diferente', () => {
    expect(validarTroca('Provisoria1', boa, boa)).toBeNull();
  });

  it('recusa campos vazios, curta, longa, confirmação diferente e repetir a actual', () => {
    expect(validarTroca('', boa, boa)).toBe('vazia');
    expect(validarTroca('a', 'x'.repeat(MINIMO - 1), 'x'.repeat(MINIMO - 1))).toBe('curta');
    expect(validarTroca('a', 'x'.repeat(MAXIMO + 1), 'x'.repeat(MAXIMO + 1))).toBe('longa');
    expect(validarTroca('a', boa, `${boa}!`)).toBe('diferentes');
    expect(validarTroca(boa, boa, boa)).toBe('igual');
  });

  it('uma palavra-passe provisória de 7 caracteres não serve como definitiva', () => {
    expect(validarTroca('Provisoria1', 'Agora69', 'Agora69')).toBe('curta');
  });

  it('a troca só é obrigatória com a marca explícita a true', () => {
    expect(trocaObrigatoria({ trocar_palavra_passe: true })).toBe(true);
    expect(trocaObrigatoria({ trocar_palavra_passe: false })).toBe(false);
    expect(trocaObrigatoria({ trocar_palavra_passe: 'true' })).toBe(false);
    expect(trocaObrigatoria({})).toBe(false);
    expect(trocaObrigatoria(null)).toBe(false);
    expect(trocaObrigatoria(undefined)).toBe(false);
  });
});
