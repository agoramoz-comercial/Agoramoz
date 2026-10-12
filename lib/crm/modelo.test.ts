import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  MOEDAS,
  MOTIVOS_PERDA,
  PARADA_DIAS,
  TIPOS_ACTIVIDADE,
  diaDeMaputo,
  diasNaFase,
  estadoProximaAccao,
  estaParada,
  filaDeHoje,
  formatarValor,
  type OportunidadeFila,
} from './modelo';

const SQL = readFileSync('supabase/migrations/0019_crm_operacional.sql', 'utf-8');

describe('vocabulários iguais aos da 0019', () => {
  it('motivos de perda', () => {
    for (const m of MOTIVOS_PERDA) expect(SQL).toContain(`'${m}'`);
    const lista = SQL.match(/motivo_perda in \(([\s\S]*?)\)\)/)?.[1] ?? '';
    expect(lista.match(/'[a-z_]+'/g)?.map((x) => x.slice(1, -1))).toEqual([...MOTIVOS_PERDA]);
  });
  it('moedas', () => {
    expect(SQL).toContain(`moeda in (${MOEDAS.map((m) => `'${m}'`).join(', ')})`);
  });
  it('tipos de actividade manuais', () => {
    expect(SQL).toContain(`v_tipo not in (${TIPOS_ACTIVIDADE.map((t) => `'${t}'`).join(', ')})`);
  });
});

// 12/10/2026 às 10:00 em Maputo (UTC+2) = 08:00 UTC.
const AGORA = new Date('2026-10-12T08:00:00Z');

describe('tempo, no fuso de Maputo', () => {
  it('o dia de Maputo vira à meia-noite local, não UTC', () => {
    expect(diaDeMaputo(new Date('2026-10-11T22:30:00Z'))).toBe('2026-10-12');
    expect(diaDeMaputo(new Date('2026-10-11T21:59:00Z'))).toBe('2026-10-11');
  });

  it('dias na fase', () => {
    expect(diasNaFase('2026-10-12T07:00:00Z', AGORA)).toBe(0);
    expect(diasNaFase('2026-10-01T08:00:00Z', AGORA)).toBe(11);
    expect(diasNaFase(null, AGORA)).toBeNull();
  });

  it.each([
    [null, 'sem'],
    ['2026-10-11T20:00:00Z', 'atrasada'], // 22:00 de ontem em Maputo
    ['2026-10-12T06:00:00Z', 'hoje'], // 08:00 de hoje, já passou — continua «hoje»
    ['2026-10-12T20:00:00Z', 'hoje'], // 22:00 de hoje
    ['2026-10-15T08:00:00Z', 'semana'],
    ['2026-10-19T08:00:00Z', 'semana'], // dia 7 a contar de hoje
    ['2026-10-20T08:00:00Z', 'futura'],
  ] as const)('próxima acção %s → %s', (quando, esperado) => {
    expect(estadoProximaAccao(quando, AGORA)).toBe(esperado);
  });

  it('parada: sem actividade há mais de PARADA_DIAS dias', () => {
    expect(PARADA_DIAS).toBe(14);
    expect(estaParada('2026-09-27T08:00:00Z', AGORA)).toBe(true); // 15 dias
    expect(estaParada('2026-09-29T08:00:00Z', AGORA)).toBe(false); // 13 dias
    expect(estaParada(null, AGORA)).toBe(false);
  });
});

describe('fila de hoje', () => {
  const EU = 'u-eu';
  const base = (o: Partial<OportunidadeFila>): OportunidadeFila => ({
    id: Math.random().toString(36).slice(2),
    stage: 'qualificacao',
    owner_id: EU,
    next_action_at: null,
    ultima_actividade: '2026-10-11T08:00:00Z',
    ...o,
  });

  it('separa por urgência só o que é meu, e mostra a todos o que não tem dono', () => {
    const fila = filaDeHoje(
      [
        base({ id: 'a', next_action_at: '2026-10-10T08:00:00Z' }),
        base({ id: 'b', next_action_at: '2026-10-12T15:00:00Z' }),
        base({ id: 'c', next_action_at: '2026-10-16T08:00:00Z' }),
        base({ id: 'd', next_action_at: '2026-10-10T08:00:00Z', owner_id: 'outra' }),
        base({ id: 'e', owner_id: null }),
        base({ id: 'f', ultima_actividade: '2026-09-01T08:00:00Z' }),
        base({ id: 'g', stage: 'ganho', next_action_at: '2026-10-10T08:00:00Z' }),
      ],
      EU,
      AGORA,
    );
    expect(fila.atrasadas.map((o) => o.id)).toEqual(['a']);
    expect(fila.hoje.map((o) => o.id)).toEqual(['b']);
    expect(fila.semana.map((o) => o.id)).toEqual(['c']);
    expect(fila.semDono.map((o) => o.id)).toEqual(['e']);
    expect(fila.paradas.map((o) => o.id)).toEqual(['f']);
  });

  it('ordena as atrasadas da mais antiga para a mais recente', () => {
    const fila = filaDeHoje(
      [
        base({ id: 'recente', next_action_at: '2026-10-11T08:00:00Z' }),
        base({ id: 'antiga', next_action_at: '2026-10-01T08:00:00Z' }),
      ],
      EU,
      AGORA,
    );
    expect(fila.atrasadas.map((o) => o.id)).toEqual(['antiga', 'recente']);
  });
});

describe('valor', () => {
  it('formata na moeda própria, sem conversão', () => {
    expect(formatarValor(250000, 'MZN')).toMatch(/250\s?000,00\s?MZN/);
    expect(formatarValor(1500.5, 'EUR')).toMatch(/1\s?500,50\s?€/);
    expect(formatarValor(null, null)).toBe('—');
  });
});
