import { describe, expect, it } from 'vitest';
import { limparTermo, normalizarResultado, padraoLike, totalDe, VAZIO } from './pesquisa-modelo';

const ID = '00000000-0000-4000-8000-000000000001';

describe('termo da pesquisa', () => {
  it('limpa espaços, corta a 80 e recusa menos de 2 caracteres', () => {
    expect(limparTermo('  Banco   Comercial ')).toBe('Banco Comercial');
    expect(limparTermo('a')).toBeNull();
    expect(limparTermo(' ')).toBeNull();
    expect(limparTermo(42)).toBeNull();
    expect(limparTermo('x'.repeat(200))).toHaveLength(80);
  });

  it('escapa os metacaracteres do LIKE', () => {
    expect(padraoLike('50%_off\\')).toBe('%50\\%\\_off\\\\%');
    expect(padraoLike('maria')).toBe('%maria%');
  });
});

describe('resultado normalizado', () => {
  it('mantém só os campos esperados e deixa cair as entradas mal formadas', () => {
    const r = normalizarResultado({
      contactos: [{ id: ID, nome: 'Ana', email: 'ana@x.test', telefone: '+258' }, { id: 'nao-uuid', nome: 'X' }],
      organizacoes: [{ id: ID, nome: 'Banco', dominio: null }],
      oportunidades: [{ id: ID, fase: 'proposta', contacto: 'Ana', organizacao: null }],
      extra: 'ignorado',
    });
    expect(r.contactos).toEqual([{ id: ID, nome: 'Ana', email: 'ana@x.test' }]);
    expect(r.organizacoes).toHaveLength(1);
    expect(r.oportunidades[0]).toEqual({ id: ID, fase: 'proposta', contacto: 'Ana', organizacao: null });
    expect(totalDe(r)).toBe(3);
  });

  it('qualquer coisa que não seja o objecto esperado dá vazio', () => {
    expect(normalizarResultado(null)).toEqual(VAZIO);
    expect(normalizarResultado('texto')).toEqual(VAZIO);
    expect(normalizarResultado({ contactos: 'x' })).toEqual(VAZIO);
  });

  it('nunca passa de 8 por tipo', () => {
    const muitos = Array.from({ length: 12 }, (_, i) => ({ id: `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`, nome: `C${i}`, email: null }));
    expect(normalizarResultado({ contactos: muitos }).contactos).toHaveLength(8);
  });
});
