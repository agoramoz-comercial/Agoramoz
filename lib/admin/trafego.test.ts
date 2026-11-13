import { describe, expect, it } from 'vitest';
import { duracao, lerPeriodoTrafego, resumir, type LinhaEvento } from './trafego';

const T0 = Date.parse('2026-11-13T10:00:00Z');
const em = (min: number) => new Date(T0 + min * 60_000).toISOString();

const vista = (
  visita: string,
  min: number,
  path: string,
  extra: Partial<LinhaEvento> & { props?: Record<string, unknown> } = {},
): LinhaEvento => ({
  name: 'page_view',
  occurred_at: em(min),
  channel: extra.channel ?? 'organico',
  campaign: extra.campaign ?? null,
  path,
  props: { visita, ecra: 'telemovel', pais: 'MZ', ref: null, ...(extra.props ?? {}) },
});
const leitura = (visita: string, min: number, path: string, ms: number, scroll: number): LinhaEvento => ({
  name: 'page_engagement',
  occurred_at: em(min),
  channel: 'organico',
  campaign: null,
  path,
  props: { visita, ms, scroll },
});
const conversao = (visita: string, min: number, name: string): LinhaEvento => ({
  name,
  occurred_at: em(min),
  channel: 'organico',
  campaign: null,
  path: '/diagnostico',
  props: { visita },
});

/**
 * Três visitantes (TUDO SINTÉTICO):
 * - a: entra em /civico pelo Google, vai a /diagnostico, submete; 2 min de leitura.
 * - b: entra em / e sai logo (rejeição); volta 2 h depois (segunda visita) a /civico.
 * - c: chega por campanha a /solucoes, lê 40 s, sai.
 */
const LINHAS: LinhaEvento[] = [
  vista('a', 0, '/civico', { props: { ref: 'www.google.com' } }),
  leitura('a', 2, '/civico', 90_000, 70),
  vista('a', 2, '/diagnostico'),
  leitura('a', 4, '/diagnostico', 30_000, 100),
  conversao('a', 4, 'diagnostic_submitted'),
  vista('b', 1, '/', { channel: 'directo' }),
  leitura('b', 1, '/', 3_000, 10),
  vista('b', 125, '/civico', { channel: 'directo' }),
  vista('c', 5, '/solucoes', { channel: 'campanha', campaign: 'lancamento', props: { pais: 'PT', ecra: 'computador' } }),
  leitura('c', 6, '/solucoes', 40_000, 55),
  { name: 'page_view', occurred_at: em(3), channel: 'directo', campaign: null, path: '(privado)', props: { visita: 'z' } },
];

const PAGINAS_DO_SITE = ['/', '/civico', '/diagnostico', '/solucoes', '/sobre'];

describe('resumir', () => {
  const r = resumir(LINHAS, PAGINAS_DO_SITE, new Date(T0 + 127 * 60_000));

  it('vistas, visitantes e visitas (pausa de 30 min parte a visita)', () => {
    expect(r.vistas).toBe(5);
    expect(r.visitantes).toBe(3);
    expect(r.visitas).toBe(4);
    expect(r.paginasPorVisita).toBeCloseTo(5 / 4);
  });

  it('todas as páginas do site aparecem, mesmo sem vistas; caminhos privados não', () => {
    expect(r.paginas.map((p) => p.path)).toEqual(['/civico', '/', '/diagnostico', '/solucoes', '/sobre']);
    expect(r.paginas.find((p) => p.path === '/sobre')).toMatchObject({ vistas: 0, taxaSaida: null });
    expect(r.paginas.some((p) => p.path === '(privado)')).toBe(false);
  });

  it('onde param: entradas, saídas e taxa de saída por página', () => {
    const civico = r.paginas.find((p) => p.path === '/civico')!;
    expect(civico).toMatchObject({ vistas: 2, visitantes: 2, entradas: 2, saidas: 1, taxaSaida: 0.5 });
    expect(r.paginas.find((p) => p.path === '/diagnostico')).toMatchObject({ entradas: 0, saidas: 1, taxaSaida: 1 });
  });

  it('tempo de leitura e scroll médios por página', () => {
    expect(r.paginas.find((p) => p.path === '/civico')).toMatchObject({ tempoMedioMs: 90_000, scrollMedio: 70 });
    expect(r.paginas.find((p) => p.path === '/solucoes')).toMatchObject({ tempoMedioMs: 40_000, scrollMedio: 55 });
  });

  it('a conversão é creditada à página de entrada e ao canal da visita', () => {
    expect(r.conversoes).toBe(1);
    expect(r.porConversao).toEqual([{ nome: 'diagnostic_submitted', total: 1, porEntrada: [{ path: '/civico', n: 1 }] }]);
    expect(r.paginas.find((p) => p.path === '/civico')!.conversoes).toBe(1);
    expect(r.canais.find((c) => c.chave === 'organico')).toEqual({ chave: 'organico', visitas: 1, conversoes: 1 });
  });

  it('rejeição: uma página e menos de 10 s', () => {
    // b-1 rejeitou; b-2 (sem leitura) também; a e c não.
    expect(r.rejeicao).toBeCloseTo(2 / 4);
  });

  it('fontes, campanhas, países, ecrãs e percursos', () => {
    expect(r.referencias).toEqual([{ chave: 'www.google.com', visitas: 1, conversoes: 1 }]);
    expect(r.campanhas).toEqual([{ chave: 'lancamento', visitas: 1, conversoes: 0 }]);
    expect(r.paises.map((p) => p.chave)).toEqual(['MZ', 'PT']);
    expect(r.ecras.find((e) => e.chave === 'computador')?.visitas).toBe(1);
    expect(r.percursos).toEqual([{ de: '/civico', para: '/diagnostico', n: 1 }]);
  });

  it('agora: só quem viu uma página nos últimos 5 minutos, na página em que está', () => {
    expect(r.agora).toEqual({ visitas: 1, paginas: [{ path: '/civico', n: 1 }] });
  });

  it('série diária', () => {
    expect(r.serie).toEqual([{ dia: '2026-11-13', vistas: 5, visitantes: 3 }]);
  });
});

describe('sem dados', () => {
  it('as páginas do site aparecem a zero e nada é inventado', () => {
    const r = resumir([], ['/'], new Date(T0));
    expect(r).toMatchObject({ vistas: 0, visitas: 0, paginasPorVisita: null, tempoMedioMs: null, rejeicao: null });
    expect(r.paginas).toEqual([
      {
        path: '/',
        vistas: 0,
        visitantes: 0,
        entradas: 0,
        saidas: 0,
        taxaSaida: null,
        tempoMedioMs: null,
        scrollMedio: null,
        conversoes: 0,
      },
    ]);
  });

  it('sem resumo de visita, cada vista é uma visita', () => {
    const r = resumir(
      [
        { name: 'page_view', occurred_at: em(0), channel: 'directo', campaign: null, path: '/', props: {} },
        { name: 'page_view', occurred_at: em(1), channel: 'directo', campaign: null, path: '/', props: {} },
      ],
      [],
      new Date(T0),
    );
    expect(r.visitas).toBe(2);
  });
});

describe('formatos', () => {
  it('período e duração', () => {
    expect(lerPeriodoTrafego('30')).toBe(30);
    expect(lerPeriodoTrafego('x')).toBe(7);
    expect(duracao(42_000)).toBe('42 s');
    expect(duracao(65_000)).toBe('1 min 05 s');
    expect(duracao(null)).toBe('—');
  });
});
