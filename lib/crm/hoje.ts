import type { Fila } from './modelo';

/**
 * O ecrã «Hoje»: o trabalho de quem entrou, por urgência. As contas da fila
 * vivem em `filaDeHoje` (modelo.ts); aqui ficam a triagem dos leads sem dono
 * e o resumo que alimenta a faixa de indicadores.
 */

const ORDEM_CLASSIFICACAO: Readonly<Record<string, number>> = { A: 0, B: 1, C: 2, D: 3 };

/**
 * Os leads sem dono pela ordem em que vale a pena pegar neles: primeiro a
 * classificação do diagnóstico (A antes de D; sem classificação no fim), e,
 * dentro da mesma, o mais recente — um lead fresco responde mais.
 */
export function triagem<T extends { readonly tier: string | null; readonly created_at: string }>(itens: readonly T[]): T[] {
  const rank = (t: string | null) => (t !== null && t in ORDEM_CLASSIFICACAO ? ORDEM_CLASSIFICACAO[t]! : 99);
  return [...itens].sort((a, b) => rank(a.tier) - rank(b.tier) || Date.parse(b.created_at) - Date.parse(a.created_at));
}

export interface ResumoHoje {
  readonly atrasadas: number;
  readonly hoje: number;
  readonly semana: number;
  readonly semDono: number;
  readonly paradas: number;
  readonly porRever: number;
  readonly reunioes: number;
}

export function resumoHoje(fila: Fila<unknown>, porRever: number, reunioes: number): ResumoHoje {
  return {
    atrasadas: fila.atrasadas.length,
    hoje: fila.hoje.length,
    semana: fila.semana.length,
    semDono: fila.semDono.length,
    paradas: fila.paradas.length,
    porRever,
    reunioes,
  };
}

/** «segunda-feira, 12 de outubro de 2026», no dia de Maputo. */
export function dataPorExtenso(d: Date): string {
  return d.toLocaleDateString('pt-PT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Africa/Maputo',
  });
}
