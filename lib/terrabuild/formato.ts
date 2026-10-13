/**
 * Formatação da demo. Os valores são estimativas fictícias: sem cêntimos,
 * para não sugerir uma precisão que não existe.
 */

const MZN = new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'MZN', maximumFractionDigits: 0 });
const FORMATADORES = new Map<number, Intl.NumberFormat>();
/** Um formatador por número de casas: criar um `Intl.NumberFormat` por chamada custa dezenas de µs. */
function NUM(casas: number): Intl.NumberFormat {
  let f = FORMATADORES.get(casas);
  if (!f) {
    f = new Intl.NumberFormat('pt-PT', { maximumFractionDigits: casas, minimumFractionDigits: 0 });
    FORMATADORES.set(casas, f);
  }
  return f;
}

export const mzn = (v: number): string => MZN.format(Math.round(v));

/** Milhões com uma casa: «38,4 M MZN». Para cabeçalhos e cartões. */
export const milhoes = (v: number): string => `${NUM(1).format(v / 1_000_000)} M MZN`;

export const num = (v: number, casas = 0): string => NUM(casas).format(v);

/** «+17 %» / «−4 %»: sinal explícito, porque é uma variação. */
export function variacao(p: number): string {
  const r = Math.round(p);
  if (r === 0) return '0 %';
  return `${r > 0 ? '+' : '−'}${Math.abs(r)} %`;
}

export const percentagem = (p: number): string => `${Math.round(p)} %`;
