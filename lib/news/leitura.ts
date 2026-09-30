import type { Analise, Pontuacao, Risco, Severidade } from './esquema';

/**
 * Leitura rápida de uma análise.
 *
 * Nada aqui é um número novo: são contas simples, sempre as mesmas, feitas
 * sobre as pontuações e as listas que o motor devolveu. A página mostra a
 * fórmula ao lado de cada valor («como calculamos»), para que ninguém leia um
 * índice nosso como se fosse uma medição.
 */

export const PESO_SEVERIDADE: Record<Severidade, number> = { critical: 3, high: 2, medium: 1 };

export interface Leitura {
  /** Média das pontuações por dimensão, arredondada. `null` sem pontuações. */
  readonly impactoLiquido: number | null;
  /** Soma dos pesos de severidade dos riscos (crítico 3, alto 2, médio 1). */
  readonly cargaRisco: number;
  /** Número de oportunidades menos número de riscos. */
  readonly balanco: number;
  /** A dimensão com maior valor absoluto; a primeira em caso de empate. */
  readonly dimensaoCritica: Pontuacao | null;
  readonly riscosOrdenados: readonly Risco[];
}

export function ler(a: Analise): Leitura {
  const n = a.pontuacoes.length;
  const soma = a.pontuacoes.reduce((s, p) => s + p.score, 0);

  let critica: Pontuacao | null = null;
  for (const p of a.pontuacoes) {
    if (!critica || Math.abs(p.score) > Math.abs(critica.score)) critica = p;
  }

  return {
    // `+ 0` normaliza o `-0` que `Math.round(-0.4)` dá.
    impactoLiquido: n === 0 ? null : Math.round(soma / n) + 0,
    cargaRisco: a.riscos.reduce((s, r) => s + PESO_SEVERIDADE[r.severidade], 0),
    balanco: a.oportunidades.length - a.riscos.length,
    dimensaoCritica: critica,
    // `sort` é estável desde o ES2019: riscos da mesma severidade mantêm a ordem do motor.
    riscosOrdenados: [...a.riscos].sort((x, y) => PESO_SEVERIDADE[y.severidade] - PESO_SEVERIDADE[x.severidade]),
  };
}
