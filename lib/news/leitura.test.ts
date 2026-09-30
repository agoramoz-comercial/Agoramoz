import { describe, expect, it } from 'vitest';
import { EXEMPLO_LOVABLE } from './exemplo';
import { normalizar, type Analise } from './esquema';
import { ler } from './leitura';

const exemplo = () => normalizar(structuredClone(EXEMPLO_LOVABLE.analysis))!;

describe('ler — indicadores derivados das pontuações do motor', () => {
  it('no exemplo: média −17, carga 6, balanço −1, Económico o mais afectado', () => {
    const l = ler(exemplo());
    // (−45 −30 +25 +0 −35) / 5 = −17
    expect(l.impactoLiquido).toBe(-17);
    // crítico 3 + alto 2 + médio 1
    expect(l.cargaRisco).toBe(6);
    // 2 oportunidades − 3 riscos
    expect(l.balanco).toBe(-1);
    expect(l.dimensaoCritica).toEqual({ dimensao: 'Económico', score: -45 });
  });

  it('riscos ordenados por severidade, estáveis dentro da mesma severidade', () => {
    const a: Analise = {
      ...exemplo(),
      riscos: [
        { titulo: 'm1', descricao: '', severidade: 'medium' },
        { titulo: 'h1', descricao: '', severidade: 'high' },
        { titulo: 'c1', descricao: '', severidade: 'critical' },
        { titulo: 'h2', descricao: '', severidade: 'high' },
      ],
    };
    expect(ler(a).riscosOrdenados.map((r) => r.titulo)).toEqual(['c1', 'h1', 'h2', 'm1']);
  });

  it('sem pontuações não há impacto líquido nem dimensão crítica — não se inventa um zero', () => {
    const l = ler({ ...exemplo(), pontuacoes: [] });
    expect(l.impactoLiquido).toBeNull();
    expect(l.dimensaoCritica).toBeNull();
  });

  it('empate no valor absoluto fica com a primeira dimensão dada pelo motor', () => {
    const l = ler({
      ...exemplo(),
      pontuacoes: [
        { dimensao: 'A', score: 40 },
        { dimensao: 'B', score: -40 },
      ],
    });
    expect(l.dimensaoCritica?.dimensao).toBe('A');
    expect(l.impactoLiquido).toBe(0);
  });

  it('com os riscos em falta, carga e balanço ficam sem dados — nunca 0 e +N', () => {
    const l = ler({ ...exemplo(), riscos: [], seccoesEmFalta: ['riscos'] });
    expect(l.cargaRisco).toBeNull();
    expect(l.balanco).toBeNull();
  });

  it('com as oportunidades em falta, o balanço fica sem dados e a carga mantém-se', () => {
    const l = ler({ ...exemplo(), oportunidades: [], seccoesEmFalta: ['oportunidades'] });
    expect(l.balanco).toBeNull();
    expect(l.cargaRisco).toBe(6);
  });

  it('a média arredonda ao inteiro', () => {
    const l = ler({
      ...exemplo(),
      pontuacoes: [
        { dimensao: 'A', score: 10 },
        { dimensao: 'B', score: 11 },
      ],
    });
    expect(l.impactoLiquido).toBe(11);
  });
});
