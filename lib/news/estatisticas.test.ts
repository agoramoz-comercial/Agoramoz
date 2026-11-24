import { describe, expect, it } from 'vitest';
import type { ArtigoDaLista } from './artigo';
import { EXEMPLO_PROFUNDA } from './exemplo-profunda';
import { gatilhosPorCenario, maisGostadas, porEvidencia, porMes, porPais, porSeccao, total } from './estatisticas';

const a = (i: number, x: Partial<ArtigoDaLista>): ArtigoDaLista => ({
  id: `00000000-0000-4000-8000-00000000000${i}`,
  slug: `a-${i}`,
  idioma: 'pt',
  titulo: 't',
  entrada: null,
  seccao: 'mercados',
  prioridade: null,
  publicado_em: '2026-11-20T10:00:00+00:00',
  actualizado_em: '2026-11-20T10:00:00+00:00',
  gostos: 0,
  partilhas: 0,
  pais: null,
  imagem_caminho: null,
  imagem_alt: null,
  ...x,
});

describe('contagens dos gráficos do News', () => {
  const lista = [
    a(1, { pais: 'mz', gostos: 4 }),
    a(2, { pais: 'mz', seccao: 'energia' }),
    a(3, { pais: 'pt', publicado_em: '2026-10-31T23:30:00+00:00', gostos: 9 }),
    a(4, {}),
  ];

  it('conta só o que existe: artigos sem país não entram no mapa', () => {
    expect(porPais(lista)).toEqual([{ chave: 'mz', n: 2 }, { chave: 'pt', n: 1 }]);
    expect(total(porSeccao(lista))).toBe(4);
    expect(porSeccao([])).toEqual([]);
  });

  it('o mês é o de Maputo (31/10 às 23:30 UTC já é Novembro lá)', () => {
    expect(porMes(lista)).toEqual([{ chave: '2026-11', n: 4 }]);
  });

  it('mais gostadas: só com gostos, por ordem', () => {
    expect(maisGostadas(lista).map((x) => x.gostos)).toEqual([9, 4]);
  });

  it('a análise: evidência E1–E4 soma todas as afirmações marcadas', () => {
    const e = porEvidencia(EXEMPLO_PROFUNDA);
    const p = EXEMPLO_PROFUNDA;
    expect(total(e)).toBe(1 + p.sectores.length + p.riscos.length + p.oportunidades.length);
    expect(gatilhosPorCenario({ ...p, cenarios: { ...p.cenarios, base: null } }).map((c) => c.chave)).toEqual([
      'pessimista',
      'optimista',
    ]);
  });
});
