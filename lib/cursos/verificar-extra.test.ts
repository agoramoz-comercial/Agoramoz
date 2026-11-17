import { describe, expect, it } from 'vitest';
import { numerosForaDoOriginal, numerosIngles } from './fontes';
import { avaliar, contaCerta, numeros, verificarBloco, verificarExercicio } from './verificar';
import type { Exercicio } from './modelo';

const passagens = new Map([
  ['F1.1', 'Em 2025, o Porto de Maputo movimentou 32,0 milhões de toneladas, contra 30,9 milhões em 2024.'],
  ['F1.2', 'O volume ferroviário subiu de 9,7 milhões de toneladas em 2024 para 11,7 milhões em 2025.'],
]);
const ctx = { passagens };

describe('contas', () => {
  it('lê números à portuguesa e operadores', () => {
    expect(avaliar('32,0 − 30,9')).toBeCloseTo(1.1);
    expect(avaliar('(11,7 - 9,7) / 9,7 × 100')).toBeCloseTo(20.618, 2);
    expect(avaliar('1 735 000 / 2')).toBe(867500);
    expect(avaliar('2 +')).toBeNull();
    expect(avaliar('abc')).toBeNull();
  });
  it('confere o resultado ao arredondamento escrito', () => {
    expect(contaCerta('32,0 - 30,9 = 1,1').certa).toBe(true);
    expect(contaCerta('(11,7 - 9,7) / 9,7 × 100 = 20,6').certa).toBe(true);
    expect(contaCerta('(11,7 - 9,7) / 9,7 × 100 = 17').certa).toBe(false);
    expect(contaCerta('sem igual').certa).toBe(false);
  });
});

describe('gráfico', () => {
  const base = {
    tipo: 'grafico' as const,
    texto: 'O Porto de Maputo movimentou 32,0 milhões de toneladas em 2025, contra 30,9 milhões em 2024.',
    fontes: ['F1.1'],
  };
  it('aceita valores das passagens', () => {
    const g = {
      titulo: 'Carga no Porto de Maputo',
      unidade: 'milhões de toneladas',
      series: [
        { rotulo: '2024', valor: 30.9 },
        { rotulo: '2025', valor: 32 },
      ],
    };
    expect(verificarBloco({ ...base, grafico: g }, ctx)).toEqual([]);
  });
  it('recusa um valor inventado e um rótulo com ano que não está lá', () => {
    const g = {
      titulo: 'Carga no Porto de Maputo',
      unidade: 'Mt',
      series: [
        { rotulo: '2023', valor: 31.2 },
        { rotulo: '2025', valor: 32 },
      ],
    };
    const m = verificarBloco({ ...base, grafico: g }, ctx).map((f) => f.motivo);
    expect(m).toContain('grafico_sem_fonte');
    expect(m).toContain('numero_sem_fonte');
  });
});

describe('exercício', () => {
  const e: Exercicio = {
    titulo: 'Previsão ingénua e com tendência',
    contexto: 'Use os volumes do Porto de Maputo para prever 2026.',
    dados: {
      origem: 'fontes',
      nota: 'Dados do MPDC.',
      colunas: ['Ano', 'Milhões de t'],
      linhas: [
        ['2024', '30,9'],
        ['2025', '32,0'],
      ],
    },
    passos: ['Calcule a variação anual.', 'Some a variação ao último valor.'],
    contas: ['32,0 - 30,9 = 1,1', '32,0 + 1,1 = 33,1'],
    entregavel: 'Uma folha com as duas previsões.',
    solucao: 'Ingénua: 32,0. Com tendência: 33,1 milhões de toneladas.',
    fontes: ['F1.1'],
  };
  it('aceita contas certas com números das fontes e resultados encadeados', () => {
    expect(verificarExercicio(e, ctx)).toEqual([]);
  });
  it('recusa conta errada, dado que não está na fonte e número inventado na solução', () => {
    const mau: Exercicio = {
      ...e,
      dados: {
        ...e.dados!,
        linhas: [
          ['2023', '31,2'],
          ['2025', '32,0'],
        ],
      },
      contas: ['32,0 - 30,9 = 1,4'],
      solucao: 'Com tendência: 35,7 milhões.',
    };
    const m = verificarExercicio(mau, ctx).map((f) => f.motivo);
    expect(m).toEqual(expect.arrayContaining(['dados_sem_fonte', 'conta_errada', 'numero_sem_fonte']));
  });
  it('dados de treino são livres, mas as contas continuam verificadas', () => {
    const treino: Exercicio = {
      ...e,
      dados: {
        origem: 'treino',
        nota: 'Dados de treino, inventados para praticar.',
        colunas: ['Semana', 'Paletes'],
        linhas: [
          ['1', '120'],
          ['2', '135'],
        ],
      },
      contas: ['135 - 120 = 15'],
      solucao: 'A variação é de 15 paletes.',
      fontes: ['F1.1'],
    };
    expect(verificarExercicio(treino, ctx)).toEqual([]);
  });
});

describe('tradução', () => {
  it('lê números em inglês', () => {
    expect(numerosIngles('2,500 km, US$ 6.2 billion, 3.4% and 530.000 TEUs')).toEqual([2500, 6.2, 3.4, 530]);
  });
  it('acusa um número da tradução que não está no original', () => {
    expect(
      numerosForaDoOriginal(
        'A rede tem cerca de 2 500 km e 3 sistemas.',
        'The network spans approximately 2,500 km and three systems.',
        numeros,
      ),
    ).toEqual([3]);
    expect(numerosForaDoOriginal('Custo de 2,42 USD por km.', 'US$2.42/km', numeros)).toEqual([]);
  });
});
