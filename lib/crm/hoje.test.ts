import { describe, expect, it } from 'vitest';
import { filaDeHoje } from './modelo';
import { dataPorExtenso, resumoHoje, triagem } from './hoje';

const lead = (id: string, tier: string | null, created_at: string) => ({ id, tier, created_at });

describe('triagem dos leads sem dono', () => {
  it('classificação primeiro (A antes de D), sem classificação no fim', () => {
    const r = triagem([
      lead('d', 'D', '2026-10-11T08:00:00Z'),
      lead('x', null, '2026-10-12T08:00:00Z'),
      lead('a', 'A', '2026-10-01T08:00:00Z'),
      lead('b', 'B', '2026-10-05T08:00:00Z'),
    ]);
    expect(r.map((l) => l.id)).toEqual(['a', 'b', 'd', 'x']);
  });

  it('na mesma classificação, o mais recente primeiro', () => {
    const r = triagem([lead('velho', 'B', '2026-10-01T08:00:00Z'), lead('novo', 'B', '2026-10-10T08:00:00Z')]);
    expect(r.map((l) => l.id)).toEqual(['novo', 'velho']);
  });

  it('uma classificação desconhecida conta como nenhuma; não altera a lista original', () => {
    const lista = [lead('z', 'Z', '2026-10-10T08:00:00Z'), lead('c', 'C', '2026-10-01T08:00:00Z')];
    const copia = [...lista];
    expect(triagem(lista).map((l) => l.id)).toEqual(['c', 'z']);
    expect(lista).toEqual(copia);
  });

  it('lista vazia dá lista vazia', () => {
    expect(triagem([])).toEqual([]);
  });
});

describe('resumo do Hoje', () => {
  it('conta cada balde da fila, mais por rever e reuniões', () => {
    const agora = new Date('2026-10-12T08:00:00Z');
    const fila = filaDeHoje(
      [
        { id: '1', stage: 'novo', owner_id: null, next_action_at: null, ultima_actividade: null },
        { id: '2', stage: 'proposta', owner_id: 'eu', next_action_at: '2026-10-10T08:00:00Z', ultima_actividade: null },
        { id: '3', stage: 'proposta', owner_id: 'eu', next_action_at: '2026-10-12T14:00:00Z', ultima_actividade: null },
        { id: '4', stage: 'ganho', owner_id: null, next_action_at: null, ultima_actividade: null },
      ],
      'eu',
      agora,
    );
    expect(resumoHoje(fila, 3, 2)).toEqual({ atrasadas: 1, hoje: 1, semana: 0, semDono: 1, paradas: 0, porRever: 3, reunioes: 2 });
  });
});

describe('data por extenso', () => {
  it('usa o dia de Maputo, mesmo perto da meia-noite UTC', () => {
    expect(dataPorExtenso(new Date('2026-10-11T22:30:00Z'))).toBe('segunda-feira, 12 de outubro de 2026');
  });
});
