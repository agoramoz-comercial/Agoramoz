import { describe, expect, it } from 'vitest';
import type { OportunidadePipeline } from './pipeline';
import { porResponsavel } from './responsaveis';

const AGORA = new Date('2026-10-12T08:00:00Z');
const INICIO = new Date('2026-09-13T00:00:00Z');

const op = (o: Partial<OportunidadePipeline>): OportunidadePipeline => ({
  id: 'x',
  stage: 'proposta',
  tier: null,
  score: null,
  owner_id: null,
  next_action_at: null,
  proxima_accao: null,
  fase_desde: null,
  valor: null,
  moeda: null,
  created_at: '2026-10-01T08:00:00Z',
  canal: 'organico',
  campanha: null,
  contacto: null,
  organizacao: null,
  ultima_actividade: '2026-10-11T08:00:00Z',
  ...o,
});

const EQUIPA = [
  { id: 'ana', nome: 'Ana', activo: true },
  { id: 'rui', nome: 'Rui', activo: true },
  { id: 'eva', nome: 'Eva', activo: false },
];

describe('por responsável', () => {
  const itens = [
    op({ id: '1', owner_id: 'ana', next_action_at: '2026-10-10T08:00:00Z', valor: 100, moeda: 'MZN' }),
    op({ id: '2', owner_id: 'ana', ultima_actividade: '2026-09-01T08:00:00Z', valor: 50, moeda: 'EUR' }),
    op({ id: '3', owner_id: 'ana', stage: 'ganho', fase_desde: '2026-10-05T08:00:00Z' }),
    op({ id: '4', owner_id: 'ana', stage: 'ganho', fase_desde: '2026-08-01T08:00:00Z' }),
    op({ id: '5', owner_id: null }),
    op({ id: '6', owner_id: 'eva' }),
  ];

  it('conta abertas, atrasadas, paradas, ganhas no período e valor por moeda', () => {
    const ana = porResponsavel(itens, EQUIPA, AGORA, INICIO, true).find((l) => l.id === 'ana')!;
    expect(ana).toMatchObject({ abertas: 2, atrasadas: 1, paradas: 1, ganhas: 1 });
    expect(ana.valor).toEqual([{ moeda: 'EUR', total: 50 }, { moeda: 'MZN', total: 100 }]);
  });

  it('mostra quem está activo mesmo a zero; inactivos só com oportunidades; «Sem dono» no fim', () => {
    const r = porResponsavel(itens, EQUIPA, AGORA, INICIO, true);
    expect(r.map((l) => l.id)).toEqual(['ana', 'eva', 'rui', 'sem']);
    expect(r.find((l) => l.id === 'rui')).toMatchObject({ abertas: 0, atrasadas: 0 });
    expect(r.find((l) => l.id === 'eva')?.activo).toBe(false);
    expect(r.at(-1)).toMatchObject({ nome: 'Sem dono', abertas: 1 });
  });

  it('sem a 0019, paradas e ganhas ficam null (não zero)', () => {
    const ana = porResponsavel(itens, EQUIPA, AGORA, INICIO, false).find((l) => l.id === 'ana')!;
    expect(ana.paradas).toBeNull();
    expect(ana.ganhas).toBeNull();
  });

  it('sem oportunidades sem dono, não há linha «Sem dono»', () => {
    expect(porResponsavel([], EQUIPA, AGORA, INICIO, true).map((l) => l.id)).toEqual(['ana', 'rui']);
  });
});
