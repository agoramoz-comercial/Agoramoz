import { describe, expect, it } from 'vitest';
import {
  actualEAnterior,
  contarPor,
  janela,
  lerPeriodo,
  naJanela,
  partilha,
  porDia,
  taxasDoFunil,
  tectoDoEixo,
  variacao,
} from './painel';

const AGORA = new Date('2026-10-01T12:00:00Z');
const dias = (n: number) => new Date(AGORA.getTime() - n * 24 * 3600 * 1000).toISOString();

describe('lerPeriodo', () => {
  it('aceita 7, 30 e 90; o resto é 30', () => {
    expect(lerPeriodo('7')).toBe(7);
    expect(lerPeriodo('90')).toBe(90);
    expect(lerPeriodo(['7', '90'])).toBe(7);
    for (const v of [undefined, '', '15', 'abc', '30.5', '-7']) expect(lerPeriodo(v)).toBe(30);
  });
});

describe('janela', () => {
  it('dias de calendário de Maputo: começa à meia-noite local, hoje incluído', () => {
    // 12:00 UTC = 14:00 em Maputo a 1/10. Sete dias = 25/09 a 1/10.
    const j = janela(7, AGORA);
    expect(j.fim.toISOString()).toBe(AGORA.toISOString());
    expect(j.inicio.toISOString()).toBe('2026-09-24T22:00:00.000Z');
    expect(j.inicioAnterior.toISOString()).toBe('2026-09-17T22:00:00.000Z');
  });

  it('a meia-noite que conta é a de Maputo, não a de UTC', () => {
    // 23:30 em Maputo ainda é 1/10; 00:30 já é 2/10.
    expect(janela(7, new Date('2026-10-01T21:30:00Z')).inicio.toISOString()).toBe(
      '2026-09-24T22:00:00.000Z',
    );
    expect(janela(7, new Date('2026-10-01T22:30:00Z')).inicio.toISOString()).toBe(
      '2026-09-25T22:00:00.000Z',
    );
  });

  it('naJanela é fechada no início e aberta no fim', () => {
    const j = janela(7, AGORA);
    expect(naJanela(j.inicio.toISOString(), j.inicio, j.fim)).toBe(true);
    expect(naJanela(j.fim.toISOString(), j.inicio, j.fim)).toBe(false);
    expect(naJanela(null, j.inicio, j.fim)).toBe(false);
    expect(naJanela('lixo', j.inicio, j.fim)).toBe(false);
  });
});

describe('actualEAnterior', () => {
  it('separa as datas pelos dois períodos e ignora o resto', () => {
    const j = janela(7, AGORA);
    // dias(6.9) = 24/09 às 16:24 em Maputo: antes do início (25/09), logo anterior.
    const r = actualEAnterior([dias(1), dias(6.9), dias(8), dias(20), null, 'x'], j);
    expect(r).toEqual({ actual: 1, anterior: 2 });
  });
});

describe('variacao', () => {
  it('arredonda a percentagem', () => {
    expect(variacao(12, 10)).toBe(20);
    expect(variacao(5, 10)).toBe(-50);
    expect(variacao(10, 10)).toBe(0);
  });

  it('sem base de comparação é null — nunca +100 % nem infinito', () => {
    expect(variacao(5, 0)).toBeNull();
    expect(variacao(0, 0)).toBeNull();
  });
});

describe('partilha', () => {
  it('percentagem inteira; sem total é null', () => {
    expect(partilha(1, 3)).toBe(33);
    expect(partilha(0, 0)).toBeNull();
  });
});

describe('porDia', () => {
  it('um balde por dia a partir do início, só dentro do período', () => {
    const j = janela(7, AGORA);
    const serie = porDia([dias(6.5), dias(6.4), dias(0.1), dias(8), null], j.inicio, 7);
    expect(serie).toHaveLength(7);
    expect(serie[0]).toBe(2);
    expect(serie[6]).toBe(1);
    expect(serie.reduce((a, b) => a + b, 0)).toBe(3);
  });
});

describe('contarPor', () => {
  it('segue a ordem dada, com zero onde não há nada, e ignora chaves fora dela', () => {
    expect(contarPor(['b', 'a', 'b', 'z', null], ['a', 'b', 'c'] as const)).toEqual([
      { chave: 'a', valor: 1 },
      { chave: 'b', valor: 2 },
      { chave: 'c', valor: 0 },
    ]);
  });
});

describe('taxasDoFunil', () => {
  it('cada etapa face à anterior; a primeira e as que seguem um zero não têm taxa', () => {
    expect(taxasDoFunil([200, 50, 10, 0, 0])).toEqual([null, 25, 20, 0, null]);
  });
});

describe('tectoDoEixo', () => {
  it('1/2/5 × 10ⁿ acima do máximo, nunca abaixo de 4', () => {
    expect(tectoDoEixo(0)).toBe(4);
    expect(tectoDoEixo(3)).toBe(4);
    expect(tectoDoEixo(7)).toBe(10);
    expect(tectoDoEixo(12)).toBe(20);
    expect(tectoDoEixo(48)).toBe(50);
    expect(tectoDoEixo(100)).toBe(100);
    expect(tectoDoEixo(101)).toBe(200);
  });
});
