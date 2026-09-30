/**
 * O painel de comando — o que não precisa de base, para ser testado.
 *
 * Regra de todo o painel: **nenhum número inventado**. Uma variação sem
 * período anterior com dados é `null` (mostra «—»), não «+100 %»; uma fonte
 * que ainda não existe é «por activar», não zero.
 */

export const PERIODOS = [7, 30, 90] as const;
export type Periodo = (typeof PERIODOS)[number];

const DIA_MS = 24 * 3600 * 1000;

/** O período vem do URL (`?periodo=30`). Qualquer outra coisa é 30. */
export function lerPeriodo(valor: string | string[] | undefined): Periodo {
  const n = Number(Array.isArray(valor) ? valor[0] : valor);
  return (PERIODOS as readonly number[]).includes(n) ? (n as Periodo) : 30;
}

export interface Janela {
  readonly dias: Periodo;
  /** Início do período actual (inclusive): meia-noite em Maputo, há `dias − 1` dias. */
  readonly inicio: Date;
  /** Fim do período actual (exclusive): agora. */
  readonly fim: Date;
  /** Início do período anterior: `dias` dias inteiros imediatamente antes. */
  readonly inicioAnterior: Date;
}

/** Moçambique está em UTC+2 todo o ano (CAT, sem hora de verão). */
const MAPUTO_MS = 2 * 3600 * 1000;

function meiaNoiteEmMaputo(t: number): number {
  return Math.floor((t + MAPUTO_MS) / DIA_MS) * DIA_MS - MAPUTO_MS;
}

/**
 * Dias de calendário de Maputo, com hoje incluído até agora. Cada balde do
 * gráfico é um dia com nome («30/09»), e não 24 h a cavalo entre dois dias.
 * O preço: hoje vai a meio e compara com dias inteiros — por isso o painel
 * diz «hoje incluído».
 */
export function janela(dias: Periodo, agora: Date): Janela {
  const fim = new Date(agora.getTime());
  const inicio = new Date(meiaNoiteEmMaputo(fim.getTime()) - (dias - 1) * DIA_MS);
  const inicioAnterior = new Date(inicio.getTime() - dias * DIA_MS);
  return { dias, inicio, fim, inicioAnterior };
}

function ms(data: string | Date): number {
  return typeof data === 'string' ? Date.parse(data) : data.getTime();
}

export function naJanela(data: string | null | undefined, de: Date, ate: Date): boolean {
  if (!data) return false;
  const t = ms(data);
  return Number.isFinite(t) && t >= de.getTime() && t < ate.getTime();
}

/** Quantas datas caem no período actual e quantas no anterior. */
export function actualEAnterior(datas: readonly (string | null | undefined)[], j: Janela) {
  let actual = 0;
  let anterior = 0;
  for (const d of datas) {
    if (naJanela(d, j.inicio, j.fim)) actual += 1;
    else if (naJanela(d, j.inicioAnterior, j.inicio)) anterior += 1;
  }
  return { actual, anterior };
}

/**
 * Variação percentual, arredondada. `null` quando o anterior é zero: de 0
 * para 5 não é «+∞ %» nem «+100 %», é «sem base de comparação».
 */
export function variacao(actual: number, anterior: number): number | null {
  if (anterior === 0) return null;
  return Math.round(((actual - anterior) / anterior) * 100);
}

/** Percentagem inteira de `parte` em `total`; `null` sem total. */
export function partilha(parte: number, total: number): number | null {
  if (total === 0) return null;
  return Math.round((parte / total) * 100);
}

/**
 * Contagem por dia: `dias` baldes de 24 h a contar de `inicio`. Com `inicio`
 * à meia-noite de Maputo (ver `janela`), cada balde é um dia de calendário.
 */
export function porDia(
  datas: readonly (string | null | undefined)[],
  inicio: Date,
  dias: number,
): number[] {
  const baldes = new Array<number>(dias).fill(0);
  const base = inicio.getTime();
  for (const d of datas) {
    if (!d) continue;
    const t = ms(d);
    if (!Number.isFinite(t)) continue;
    const i = Math.floor((t - base) / DIA_MS);
    if (i >= 0 && i < dias) baldes[i]! += 1;
  }
  return baldes;
}

/** Conta por chave, pela ordem de `ordem` (as chaves fora dela são ignoradas). */
export function contarPor<K extends string>(
  valores: readonly (string | null | undefined)[],
  ordem: readonly K[],
) {
  const mapa = new Map<K, number>(ordem.map((k) => [k, 0]));
  for (const v of valores) {
    if (v && mapa.has(v as K)) mapa.set(v as K, mapa.get(v as K)! + 1);
  }
  return ordem.map((chave) => ({ chave, valor: mapa.get(chave)! }));
}

/** A taxa de cada etapa face à anterior; a primeira não tem. */
export function taxasDoFunil(valores: readonly number[]): (number | null)[] {
  return valores.map((v, i) => (i === 0 ? null : partilha(v, valores[i - 1]!)));
}

/** Escala «bonita» para um eixo: o menor 1/2/5 × 10ⁿ ≥ máximo, com um mínimo de 4. */
export function tectoDoEixo(maximo: number): number {
  if (maximo <= 4) return 4;
  const potencia = 10 ** Math.floor(Math.log10(maximo));
  for (const m of [1, 2, 5, 10]) if (m * potencia >= maximo) return m * potencia;
  return 10 * potencia;
}
