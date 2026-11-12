import { describe, expect, it } from 'vitest';
import {
  MILHAR,
  agrupar,
  compacto,
  dataPorExtenso,
  lerProposta,
  paragrafos,
  podeSair,
  propostaVazia,
  totais,
  validaAte,
  valor,
  verificar,
  type Proposta,
} from './modelo';

const fase = (valor: number, custo: number | null, min = 2, max = 3) => ({
  nome: 'Fase',
  entregaveis: '',
  semanasMin: min,
  semanasMax: max,
  valor,
  custo,
});

function com(p: Partial<Proposta>): Proposta {
  return {
    ...propostaVazia('2026-11-12'),
    projeto: 'Projecto',
    cliente: 'Cliente',
    ...p,
  };
}

describe('números no estilo editorial', () => {
  it('agrupa os milhares com espaço fino, também com quatro algarismos', () => {
    expect(agrupar(1_735_000)).toBe(`1${MILHAR}735${MILHAR}000`);
    expect(agrupar(4_500)).toBe(`4${MILHAR}500`);
    expect(agrupar(950)).toBe('950');
    expect(agrupar(1234.5)).toBe(`1${MILHAR}234,50`);
  });

  it('o valor leva a moeda depois de um espaço que não parte', () => {
    expect(valor(1_735_000, 'MZN')).toBe(`1${MILHAR}735${MILHAR}000\u00A0MZN`);
  });

  it('o compacto dos gráficos arredonda a milhares', () => {
    expect(compacto(285_000)).toBe('285k');
    expect(compacto(1_185_000)).toBe(`1${MILHAR}185k`);
  });
});

describe('totais: a aritmética é feita, não escrita', () => {
  it('soma valores e semanas das fases', () => {
    const t = totais({
      fases: [fase(285_000, 200_000, 2, 3), fase(1_450_000, 1_000_000, 6, 8)],
    });
    expect(t.total).toBe(1_735_000);
    expect([t.semanasMin, t.semanasMax]).toEqual([8, 11]);
    expect(t.custo).toBe(1_200_000);
    expect(t.margem).toBeCloseTo(535_000 / 1_735_000);
  });

  it('sem o custo de todas as fases, não há margem — nunca uma margem a meio', () => {
    expect(totais({ fases: [fase(100, 50), fase(100, null)] }).margem).toBeNull();
  });
});

describe('datas', () => {
  it('por extenso e validade', () => {
    expect(dataPorExtenso('2026-11-12')).toBe('12 de Novembro de 2026');
    expect(validaAte('2026-11-12', 30)).toBe('2026-12-12');
    expect(validaAte('2026-02-30', 30)).toBeNull();
  });
});

describe('verificar', () => {
  it('sem cliente nem projecto, a proposta não sai', () => {
    const a = verificar(propostaVazia('2026-11-12'));
    expect(podeSair(a)).toBe(false);
    expect(a.map((x) => x.texto)).toEqual(expect.arrayContaining(['Falta o cliente (preparada para).', 'Falta o nome do projecto.']));
  });

  it('a margem por projectar é um aviso do AEOS', () => {
    const a = verificar(com({ fases: [fase(100, null)] }));
    expect(podeSair(a)).toBe(true);
    expect(a.some((x) => /margem projetada/.test(x.texto))).toBe(true);
  });

  it('duas opções recomendadas e semanas trocadas bloqueiam', () => {
    const o = { nome: 'A', descricao: '', valor: 1, recomendada: true };
    const a = verificar(com({ opcoes: [o, { ...o, nome: 'B' }], fases: [fase(1, 0, 5, 2)] }));
    expect(a.filter((x) => x.nivel === 'bloqueia').map((x) => x.texto)).toEqual([
      'Na fase 1, o mínimo de semanas é maior do que o máximo.',
      'Há mais do que uma opção recomendada.',
    ]);
  });

  it('margem negativa avisa', () => {
    expect(verificar(com({ fases: [fase(100, 150)] })).some((x) => /negativa/.test(x.texto))).toBe(true);
  });
});

describe('rascunhos importados', () => {
  it('aceita uma proposta válida e recusa o resto', () => {
    const p = com({ fases: [fase(10, 5)] });
    expect(lerProposta(JSON.parse(JSON.stringify(p)))).toEqual(p);
    expect(lerProposta({ ...p, versao: 2 })).toBeNull();
    expect(lerProposta({ ...p, extra: '<script>' })).toBeNull();
    expect(lerProposta({ ...p, fases: [{ ...fase(10, 5), valor: Number.NaN }] })).toBeNull();
    expect(lerProposta('texto')).toBeNull();
  });
});

describe('carta', () => {
  it('parágrafos separados por linha em branco; quebras simples juntam-se', () => {
    expect(paragrafos('Primeiro\ncontinua.\n\n\nSegundo.')).toEqual(['Primeiro continua.', 'Segundo.']);
  });
});
