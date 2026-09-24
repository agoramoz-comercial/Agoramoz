/**
 * Paginação por intervalo, sem contagem total.
 *
 * Pede-se um registo a mais do que cabe no ecrã: se ele vier, há página
 * seguinte. Evita o `count: 'exact'`, que numa tabela grande custa uma
 * varredura completa por cada página vista — e ninguém precisa de saber que há
 * 4 812 contactos para ver os próximos vinte.
 */

export const POR_PAGINA = 25;

export interface Intervalo {
  readonly pagina: number;
  readonly de: number;
  readonly ate: number;
}

export function intervalo(paginaBruta: string | undefined, porPagina = POR_PAGINA): Intervalo {
  const n = Number(paginaBruta ?? '1');
  const pagina = Number.isFinite(n) && n >= 1 ? Math.min(Math.floor(n), 10_000) : 1;
  const de = (pagina - 1) * porPagina;
  // Um a mais, de propósito: é o que revela a existência da página seguinte.
  return { pagina, de, ate: de + porPagina };
}

/** Corta o registo extra e diz se ele existia. */
export function fatiar<T>(linhas: readonly T[] | null, porPagina = POR_PAGINA) {
  const todas = linhas ?? [];
  return { linhas: todas.slice(0, porPagina), haMais: todas.length > porPagina };
}
