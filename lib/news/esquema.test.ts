import { describe, expect, it } from 'vitest';
import { EXEMPLO_LOVABLE } from './exemplo';
import { normalizar } from './esquema';

const base = () => structuredClone(EXEMPLO_LOVABLE.analysis) as unknown as Record<string, unknown>;

describe('normalizar — o payload do motor Lovable', () => {
  it('um payload completo passa inteiro, sem secções em falta', () => {
    const a = normalizar(base())!;
    expect(a.seccoesEmFalta).toEqual([]);
    expect(a.titulo.titulo).toBe('Exemplo sintético: nova tarifa portuária no corredor de Maputo');
    expect(a.titulo.regiao).toBe('Moçambique');
    expect(a.prioridade).toBe('high');
    expect(a.sectores).toEqual(['Logística', 'Retalho', 'Energia']);
    expect(a.resumo).toHaveLength(3);
    expect(a.matriz.map((m) => m.dimensao)).toEqual(['economic', 'financial', 'governmental', 'business', 'social']);
    expect(a.matriz[2]).toEqual({ dimensao: 'governmental', direcao: 'up', explicacao: 'Mais receita fiscal portuária.' });
    expect(a.riscos).toHaveLength(3);
    expect(a.oportunidades[0]).toEqual({ titulo: 'Optimização de rotas', descricao: 'Consolidar cargas.', accionabilidade: 'Imediata' });
    expect(a.recomendacoes.agir).toHaveLength(1);
    expect(a.cadeias.map((c) => c.tipo)).toEqual(['risk', 'growth']);
    expect(a.perguntas[0].industria).toBe('Logística');
    expect(a.pontuacoes).toEqual([
      { dimensao: 'Económico', score: -45 },
      { dimensao: 'Financeiro', score: -30 },
      { dimensao: 'Governamental', score: 25 },
      { dimensao: 'Empresarial', score: 0 },
      { dimensao: 'Social', score: -35 },
    ]);
  });

  it('o que não é objecto, ou não tem título nem resumo, não é análise', () => {
    for (const v of [null, undefined, 'texto', 42, [], {}]) expect(normalizar(v), String(v)).toBeNull();
    expect(normalizar({ sector_tags: ['x'] })).toBeNull();
  });

  describe('pontuações: o número que o motor dá é o número que mostramos, dentro do intervalo', () => {
    const com = (scores: unknown[]) => {
      const b = base();
      b.chart_data = { impact_scores: scores };
      return normalizar(b)!.pontuacoes;
    };

    it('texto numérico converte; fora de −100..100 é limitado; decimais arredondam', () => {
      expect(
        com([
          { dimension: 'A', score: '-45' },
          { dimension: 'B', score: 250 },
          { dimension: 'C', score: -500 },
          { dimension: 'D', score: 12.6 },
        ]),
      ).toEqual([
        { dimensao: 'A', score: -45 },
        { dimensao: 'B', score: 100 },
        { dimensao: 'C', score: -100 },
        { dimensao: 'D', score: 13 },
      ]);
    });

    it('um score que não é número sai — não vira zero, que seria um valor inventado', () => {
      expect(
        com([
          { dimension: 'A', score: 'alto' },
          { dimension: 'B', score: null },
          { dimension: 'C', score: Number.NaN },
          { dimension: '', score: 10 },
          { dimension: 'E', score: 10 },
        ]),
      ).toEqual([{ dimensao: 'E', score: 10 }]);
    });
  });

  it('enums com maiúsculas normalizam; valores desconhecidos tiram só o item', () => {
    const b = base();
    b.risks = [
      { title: 'A', description: 'a', severity: 'Critical' },
      { title: 'B', description: 'b', severity: 'extreme' },
      { title: 'C', description: 'c', severity: ' MEDIUM ' },
    ];
    b.signal_chains = [
      { chain: 'x → y', impact: 'GROWTH' },
      { chain: 'y → z', impact: 'boom' },
    ];
    const a = normalizar(b)!;
    expect(a.riscos.map((r) => [r.titulo, r.severidade])).toEqual([
      ['A', 'critical'],
      ['C', 'medium'],
    ]);
    expect(a.cadeias).toEqual([{ cadeia: 'x → y', tipo: 'growth' }]);
  });

  it('uma prioridade desconhecida fica nula e marcada — não se escolhe uma por nós', () => {
    const b = base();
    b.priority_level = 'urgentissimo';
    const a = normalizar(b)!;
    expect(a.prioridade).toBeNull();
    expect(a.seccoesEmFalta).toContain('prioridade');
  });

  it('uma secção malformada cai sozinha; o resto do relatório mantém-se', () => {
    const b = base();
    b.forward_outlook = 'não é objecto';
    delete b.macro_analysis;
    b.recommendations = { immediate_actions: 'devia ser lista' };
    const a = normalizar(b)!;
    expect(a.horizonte).toBeNull();
    expect(a.economia).toBeNull();
    expect(a.recomendacoes).toEqual({ agir: [], monitorizar: [], ajustar: [] });
    expect(a.seccoesEmFalta).toEqual(expect.arrayContaining(['horizonte', 'economia']));
    expect(a.resumo).toHaveLength(3);
    expect(a.riscos).toHaveLength(3);
  });

  it('texto: sem caracteres de controlo, espaços colapsados, tamanho limitado', () => {
    const b = base();
    b.headline = { title: `  Título\u0000 com\t\tespaços\n\n ${'x'.repeat(1000)}` };
    const t = normalizar(b)!.titulo.titulo;
    expect(t.startsWith('Título com espaços x')).toBe(true);
    expect(t).not.toMatch(/[\u0000-\u001f]/);
    expect(t.length).toBeLessThanOrEqual(300);
  });

  it('marcação no texto fica texto — quem desenha é o React, que escapa', () => {
    const b = base();
    b.executive_summary = ['<img src=x onerror=alert(1)>'];
    expect(normalizar(b)!.resumo).toEqual(['<img src=x onerror=alert(1)>']);
  });

  it('listas têm tecto de 12; a matriz tem tecto de 8 dimensões', () => {
    const b = base();
    b.executive_summary = Array.from({ length: 40 }, (_, i) => `ponto ${i}`);
    b.impact_matrix = Object.fromEntries(
      Array.from({ length: 20 }, (_, i) => [`d${i}`, { direction: 'up', explanation: 'e' }]),
    );
    const a = normalizar(b)!;
    expect(a.resumo).toHaveLength(12);
    expect(a.matriz).toHaveLength(8);
  });

  it('entradas da matriz que não são objecto, ou com direcção desconhecida, são ignoradas', () => {
    const b = base();
    b.impact_matrix = { economic: 'sobe', social: { direction: 'sideways', explanation: 'x' }, financial: { direction: 'up' } };
    expect(normalizar(b)!.matriz).toEqual([{ dimensao: 'financial', direcao: 'up', explicacao: '' }]);
  });
});
