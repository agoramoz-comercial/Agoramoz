import { describe, expect, it } from 'vitest';
import { specInquerito, type Pergunta } from './spec';
import { acaoDaTecla, letraDe, LETRAS } from './teclas';

const SPEC = specInquerito.parse({
  schemaVersion: 'survey.v1',
  idioma: 'pt',
  boasVindas: { titulo: 'Olá' },
  agradecimento: { titulo: 'Obrigado' },
  perguntas: [
    {
      tipo: 'escolha_unica',
      chave: 'unica',
      titulo: 'Uma',
      opcoes: [
        { chave: 'a', rotulo: 'Alfa' },
        { chave: 'b', rotulo: 'Beta' },
        { chave: 'c', rotulo: 'Gama' },
      ],
    },
    {
      tipo: 'escolha_multipla',
      chave: 'varias',
      titulo: 'Várias',
      opcoes: [
        { chave: 'x', rotulo: 'X' },
        { chave: 'y', rotulo: 'Y' },
      ],
    },
    { tipo: 'avaliacao', chave: 'nota', titulo: 'Nota' },
    { tipo: 'nps', chave: 'nps', titulo: 'NPS' },
    { tipo: 'texto_curto', chave: 'nome', titulo: 'Nome' },
  ],
});
const p = (chave: string) => SPEC.perguntas.find((q) => q.chave === chave) as Pergunta;

describe('letras das opções', () => {
  it('há uma letra por opção possível (20)', () => {
    expect(LETRAS).toHaveLength(20);
    expect(letraDe(0)).toBe('A');
    expect(letraDe(19)).toBe('T');
    expect(letraDe(20)).toBe('');
    expect(letraDe(-1)).toBe('');
  });
});

describe('acaoDaTecla', () => {
  it('letras escolhem opções, sem distinguir maiúsculas', () => {
    expect(acaoDaTecla(p('unica'), { key: 'a' })).toEqual({ tipo: 'opcao', indice: 0 });
    expect(acaoDaTecla(p('unica'), { key: 'C' })).toEqual({ tipo: 'opcao', indice: 2 });
    expect(acaoDaTecla(p('varias'), { key: 'b' })).toEqual({ tipo: 'opcao', indice: 1 });
  });

  it('uma letra além das opções não faz nada', () => {
    expect(acaoDaTecla(p('unica'), { key: 'd' })).toBeNull();
    expect(acaoDaTecla(p('varias'), { key: 'c' })).toBeNull();
  });

  it('avaliação aceita 1–5 e recusa 0 e 6', () => {
    expect(acaoDaTecla(p('nota'), { key: '1' })).toEqual({ tipo: 'valor', valor: 1 });
    expect(acaoDaTecla(p('nota'), { key: '5' })).toEqual({ tipo: 'valor', valor: 5 });
    expect(acaoDaTecla(p('nota'), { key: '0' })).toBeNull();
    expect(acaoDaTecla(p('nota'), { key: '6' })).toBeNull();
  });

  it('NPS aceita 0–9 por tecla', () => {
    expect(acaoDaTecla(p('nps'), { key: '0' })).toEqual({ tipo: 'valor', valor: 0 });
    expect(acaoDaTecla(p('nps'), { key: '9' })).toEqual({ tipo: 'valor', valor: 9 });
    expect(acaoDaTecla(p('nps'), { key: 'a' })).toBeNull();
  });

  it('modificadores e teclas com nome nunca são atalho', () => {
    expect(acaoDaTecla(p('unica'), { key: 'a', ctrlKey: true })).toBeNull();
    expect(acaoDaTecla(p('unica'), { key: 'a', metaKey: true })).toBeNull();
    expect(acaoDaTecla(p('nota'), { key: '3', altKey: true })).toBeNull();
    expect(acaoDaTecla(p('unica'), { key: 'Enter' })).toBeNull();
    expect(acaoDaTecla(p('unica'), { key: 'ArrowDown' })).toBeNull();
  });

  it('perguntas de texto não têm atalhos', () => {
    expect(acaoDaTecla(p('nome'), { key: 'a' })).toBeNull();
    expect(acaoDaTecla(p('nome'), { key: '1' })).toBeNull();
  });
});
