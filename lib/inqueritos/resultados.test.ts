import { describe, expect, it } from 'vitest';
import { barrasDe, npsDe, resultadosDaBase } from './resultados';
import type { Pergunta } from './spec';

const escolha: Pergunta = {
  tipo: 'escolha_unica',
  chave: 'p1',
  titulo: 'Usa ERP?',
  obrigatoria: false,
  opcoes: [
    { chave: 'o1', rotulo: 'Sim' },
    { chave: 'o2', rotulo: 'Não' },
  ],
};

describe('barras', () => {
  it('todas as opções pela ordem do inquérito, zeros incluídos, e as antigas no fim', () => {
    const b = barrasDe(escolha, { respondidas: 4, valores: { o2: 3, o9: 1 } });
    expect(b).toEqual([
      { chave: 'o1', rotulo: 'Sim', valor: 0, percentagem: 0 },
      { chave: 'o2', rotulo: 'Não', valor: 3, percentagem: 75 },
      { chave: 'o9', rotulo: 'o9 (versão anterior)', valor: 1, percentagem: 25 },
    ]);
  });

  it('escalas mostram todos os valores; texto não tem barras', () => {
    const nps: Pergunta = { tipo: 'nps', chave: 'n', titulo: 'NPS', obrigatoria: false };
    expect(barrasDe(nps, undefined)).toHaveLength(11);
    const texto: Pergunta = {
      tipo: 'texto_curto',
      chave: 't',
      titulo: 'T',
      obrigatoria: false,
      max: 200,
    };
    expect(barrasDe(texto, { respondidas: 2, valores: {} })).toEqual([]);
  });
});

describe('NPS', () => {
  it('promotores menos detratores, em percentagem', () => {
    // 5 promotores, 3 neutros, 2 detratores → (5 − 2) / 10 = 30
    expect(npsDe({ '10': 3, '9': 2, '8': 2, '7': 1, '6': 1, '0': 1 })).toEqual({
      nps: 30,
      promotores: 5,
      neutros: 3,
      detratores: 2,
      total: 10,
    });
  });

  it('sem respostas não há NPS — nunca um zero inventado', () => {
    expect(npsDe({})).toBeNull();
  });
});

describe('forma do que a base devolve', () => {
  it('aceita o resultado da função e recusa outra coisa', () => {
    expect(
      resultadosDaBase.safeParse({
        total: 3,
        porPergunta: { p1: { respondidas: 3, valores: { o1: 2, o2: 1 }, media: null } },
      }).success,
    ).toBe(true);
    expect(resultadosDaBase.safeParse({ total: -1, porPergunta: {} }).success).toBe(false);
  });
});
