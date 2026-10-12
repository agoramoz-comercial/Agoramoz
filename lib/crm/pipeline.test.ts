import { describe, expect, it } from 'vitest';
import {
  agruparPorFase,
  aplicarVista,
  filtrarDono,
  lerFiltros,
  ordenar,
  paginar,
  totaisPorMoeda,
  urlCom,
  destinoSeguroCrm,
  type OportunidadePipeline,
} from './pipeline';

const AGORA = new Date('2026-10-12T08:00:00Z');
const EU = 'u-eu';

const op = (o: Partial<OportunidadePipeline>): OportunidadePipeline => ({
  id: o.id ?? 'x',
  stage: 'qualificacao',
  tier: null,
  score: null,
  owner_id: EU,
  next_action_at: null,
  proxima_accao: null,
  fase_desde: '2026-10-01T08:00:00Z',
  valor: null,
  moeda: null,
  created_at: '2026-09-01T08:00:00Z',
  canal: 'organico',
  campanha: null,
  contacto: { id: 'c', nome: 'Pessoa' },
  organizacao: null,
  ultima_actividade: '2026-10-11T08:00:00Z',
  ...o,
});

describe('filtros do URL', () => {
  it('só aceita valores conhecidos; o resto cai no padrão', () => {
    const f = lerFiltros({ vista: 'hack', modo: 'x', ordem: 'drop', sentido: 'up', fase: 'zzz', pagina: '-3' });
    expect(f).toMatchObject({ vista: 'abertas', modo: 'lista', ordem: 'proxima', sentido: 'asc', fase: undefined, pagina: 1 });
  });
  it('lê uma vista válida', () => {
    expect(lerFiltros({ vista: 'minhas', modo: 'quadro', ordem: 'valor', sentido: 'desc', fase: 'proposta', pagina: '2' }))
      .toMatchObject({ vista: 'minhas', modo: 'quadro', ordem: 'valor', sentido: 'desc', fase: 'proposta', pagina: 2 });
  });
  it('urlCom mantém os filtros e troca só o pedido', () => {
    const f = lerFiltros({ vista: 'minhas', fase: 'proposta' });
    expect(urlCom(f, { modo: 'quadro' })).toBe('/admin/oportunidades?vista=minhas&modo=quadro&fase=proposta');
    expect(urlCom(f, { pagina: 1 })).toBe('/admin/oportunidades?vista=minhas&fase=proposta');
  });
});

describe('vistas predefinidas', () => {
  const itens = [
    op({ id: 'aberta-minha' }),
    op({ id: 'aberta-outra', owner_id: 'outra' }),
    op({ id: 'sem-dono', owner_id: null }),
    op({ id: 'atrasada', next_action_at: '2026-10-10T08:00:00Z' }),
    op({ id: 'parada', ultima_actividade: '2026-09-01T08:00:00Z' }),
    op({ id: 'ganha', stage: 'ganho' }),
  ];
  const ids = (v: Parameters<typeof aplicarVista>[1]) => aplicarVista(itens, v, EU, AGORA).map((o) => o.id);

  it('abertas exclui ganhas e perdidas', () => expect(ids('abertas')).not.toContain('ganha'));
  it('minhas: abertas do próprio', () => expect(ids('minhas')).toEqual(['aberta-minha', 'atrasada', 'parada']));
  it('atrasadas: de qualquer pessoa', () => expect(ids('atrasadas')).toEqual(['atrasada']));
  it('sem dono', () => expect(ids('sem-dono')).toEqual(['sem-dono']));
  it('paradas', () => expect(ids('paradas')).toEqual(['parada']));
  it('todas', () => expect(ids('todas')).toHaveLength(6));
});

describe('ordenação', () => {
  const itens = [
    op({ id: 'a', next_action_at: '2026-10-20T08:00:00Z', valor: 10, moeda: 'EUR' }),
    op({ id: 'b', next_action_at: null, valor: null, moeda: null }),
    op({ id: 'c', next_action_at: '2026-10-13T08:00:00Z', valor: 500, moeda: 'EUR' }),
  ];
  it('próxima acção: as mais cedo primeiro, sem data no fim', () => {
    expect(ordenar(itens, 'proxima', 'asc').map((o) => o.id)).toEqual(['c', 'a', 'b']);
  });
  it('valor descendente; sem valor no fim', () => {
    expect(ordenar(itens, 'valor', 'desc').map((o) => o.id)).toEqual(['c', 'a', 'b']);
  });
  it('valor sem câmbio: agrupa por moeda e só compara montantes da mesma moeda', () => {
    const mistas = [
      op({ id: 'mzn-alto', valor: 1_200_000, moeda: 'MZN' }),
      op({ id: 'usd', valor: 42_000, moeda: 'USD' }),
      op({ id: 'eur', valor: 18_000, moeda: 'EUR' }),
      op({ id: 'mzn-baixo', valor: 350_000, moeda: 'MZN' }),
    ];
    expect(ordenar(mistas, 'valor', 'desc').map((o) => o.id)).toEqual(['eur', 'mzn-alto', 'mzn-baixo', 'usd']);
    expect(ordenar(mistas, 'valor', 'asc').map((o) => o.id)).toEqual(['eur', 'mzn-baixo', 'mzn-alto', 'usd']);
  });
  it('não altera a lista original', () => {
    const copia = [...itens];
    ordenar(itens, 'valor', 'desc');
    expect(itens).toEqual(copia);
  });
});

describe('filtro de responsável', () => {
  const U = '00000000-0000-4000-8000-0000000000a1';
  it('lê só UUID ou «sem», e entra no URL', () => {
    expect(lerFiltros({ dono: U }).dono).toBe(U);
    expect(lerFiltros({ dono: 'sem' }).dono).toBe('sem');
    expect(lerFiltros({ dono: 'x' }).dono).toBeUndefined();
    expect(urlCom(lerFiltros({}), { dono: U })).toBe(`/admin/oportunidades?dono=${U}`);
  });
  it('filtra pelo dono ou pelas sem dono', () => {
    const itens = [op({ id: 'a', owner_id: U }), op({ id: 'b', owner_id: null }), op({ id: 'c', owner_id: 'outro' })];
    expect(filtrarDono(itens, U).map((o) => o.id)).toEqual(['a']);
    expect(filtrarDono(itens, 'sem').map((o) => o.id)).toEqual(['b']);
    expect(filtrarDono(itens, undefined)).toHaveLength(3);
  });
});

describe('quadro, totais e páginas', () => {
  it('agrupa pelas fases, pela ordem do funil', () => {
    const g = agruparPorFase([op({ id: '1', stage: 'proposta' }), op({ id: '2', stage: 'novo' })]);
    expect(g.map((c) => c.fase)).toEqual(['novo', 'qualificacao', 'proposta', 'negociacao', 'ganho', 'perdido']);
    expect(g[0].itens.map((o) => o.id)).toEqual(['2']);
  });
  it('soma por moeda, sem câmbio', () => {
    expect(totaisPorMoeda([op({ valor: 100, moeda: 'EUR' }), op({ valor: 50, moeda: 'EUR' }), op({ valor: 7, moeda: 'MZN' })]))
      .toEqual([{ moeda: 'EUR', total: 150 }, { moeda: 'MZN', total: 7 }]);
  });
  it('pagina em memória', () => {
    const lista = Array.from({ length: 55 }, (_, i) => op({ id: String(i) }));
    const p2 = paginar(lista, 2, 50);
    expect(p2.itens).toHaveLength(5);
    expect(p2.haMais).toBe(false);
    expect(paginar(lista, 1, 50).haMais).toBe(true);
  });
});

describe('destino seguro das acções do CRM', () => {
  it('aceita a lista com filtros, uma ficha e o Hoje', () => {
    expect(destinoSeguroCrm('/admin/oportunidades?vista=minhas&modo=quadro', 'x')).toBe('/admin/oportunidades?vista=minhas&modo=quadro');
    expect(destinoSeguroCrm('/admin/oportunidades/00000000-0000-0000-0000-0000000000d1', 'x')).toBe('/admin/oportunidades/00000000-0000-0000-0000-0000000000d1');
    // O Hoje vive em /admin; /admin/hoje não existe e daria 404.
    expect(destinoSeguroCrm('/admin', 'x')).toBe('/admin');
    expect(destinoSeguroCrm('/admin/hoje', 'x')).toBe('x');
  });
  it('recusa tudo o resto', () => {
    for (const mau of ['https://mal.example', '//mal.example', '/admin/equipa', '/admin/oportunidades/../equipa', '/admin/oportunidades?x="><', null]) {
      expect(destinoSeguroCrm(mau, '/admin/oportunidades')).toBe('/admin/oportunidades');
    }
  });
});
