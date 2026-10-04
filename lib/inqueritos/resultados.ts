import { z } from 'zod';
import type { Pergunta } from './spec';

/**
 * Leitura dos resultados que `resultados_inquerito` (0013) agrega na base.
 * Nada aqui inventa números: o que não veio da base é zero contado, nunca
 * uma estimativa — e a média só existe se a base a calculou.
 */

const porPergunta = z.object({
  respondidas: z.number().int().nonnegative(),
  valores: z.record(z.string(), z.number().int().nonnegative()),
  media: z.number().nullable().optional(),
});

export const resultadosDaBase = z.object({
  total: z.number().int().nonnegative(),
  porPergunta: z.record(z.string(), porPergunta),
});

export type Resultados = z.infer<typeof resultadosDaBase>;
export type ResultadoPergunta = z.infer<typeof porPergunta>;

export interface Barra {
  readonly chave: string;
  readonly rotulo: string;
  readonly valor: number;
  /** Percentagem de quem respondeu a esta pergunta, arredondada. */
  readonly percentagem: number;
}

const pct = (n: number, de: number) => (de > 0 ? Math.round((n / de) * 100) : 0);

/**
 * As barras de uma pergunta: todas as opções (as não escolhidas a zero), na
 * ordem do inquérito; nas escalas, todos os valores. Opções que só existem em
 * versões anteriores aparecem no fim com a chave, para não se perderem.
 */
export function barrasDe(p: Pergunta, r: ResultadoPergunta | undefined): Barra[] {
  const valores = r?.valores ?? {};
  const base = r?.respondidas ?? 0;
  let ordem: { chave: string; rotulo: string }[];
  if ('opcoes' in p) ordem = p.opcoes.map((o) => ({ chave: o.chave, rotulo: o.rotulo }));
  else if (p.tipo === 'avaliacao')
    ordem = [1, 2, 3, 4, 5].map((n) => ({ chave: String(n), rotulo: String(n) }));
  else if (p.tipo === 'nps')
    ordem = Array.from({ length: 11 }, (_, n) => ({ chave: String(n), rotulo: String(n) }));
  else return [];
  const conhecidas = new Set(ordem.map((o) => o.chave));
  const extra = Object.keys(valores)
    .filter((k) => !conhecidas.has(k))
    .sort()
    .map((k) => ({ chave: k, rotulo: `${k} (versão anterior)` }));
  return [...ordem, ...extra].map((o) => {
    const valor = valores[o.chave] ?? 0;
    return { ...o, valor, percentagem: pct(valor, base) };
  });
}

export interface Nps {
  readonly nps: number;
  readonly promotores: number;
  readonly neutros: number;
  readonly detratores: number;
  readonly total: number;
}

/** NPS = % promotores (9–10) − % detratores (0–6). Sem respostas, não há NPS. */
export function npsDe(valores: Readonly<Record<string, number>>): Nps | null {
  let promotores = 0;
  let neutros = 0;
  let detratores = 0;
  for (const [k, n] of Object.entries(valores)) {
    const v = Number(k);
    if (!Number.isInteger(v) || v < 0 || v > 10) continue;
    if (v >= 9) promotores += n;
    else if (v >= 7) neutros += n;
    else detratores += n;
  }
  const total = promotores + neutros + detratores;
  if (total === 0) return null;
  return {
    nps: Math.round(((promotores - detratores) / total) * 100),
    promotores,
    neutros,
    detratores,
    total,
  };
}
