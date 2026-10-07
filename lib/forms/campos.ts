import { z } from 'zod';

/**
 * Campos comuns aos formulários dos espaços privados do admin (Espaço CEnO,
 * Gabinete). O que vem do browser são dados, não confiança: cada campo é
 * validado aqui E pelos CHECK da base.
 */

/** As chaves de um vocabulário `{ valor: 'Texto' }`, na forma que `z.enum` quer. */
export const chaves = <T extends Record<string, string>>(o: T) =>
  Object.keys(o) as [keyof T & string, ...(keyof T & string)[]];

/** Texto opcional: aparado, limitado, e vazio → nulo. */
export const opcional = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `No máximo ${max} caracteres.`)
    .transform((v) => (v === '' ? null : v));

export const DATA = /^\d{4}-\d{2}-\d{2}$/;

/** `2026-02-31` passa no formato e no `Date.parse` (vira 3 de Março): aqui não. */
export const dataReal = (v: string) => DATA.test(v) && new Date(`${v}T00:00:00Z`).toISOString().slice(0, 10) === v;

export const dataOpcional = z
  .string()
  .trim()
  .refine((v) => v === '' || dataReal(v), 'Data inválida.')
  .transform((v) => (v === '' ? null : v));

export const dataObrigatoria = (mensagem: string) =>
  z
    .string()
    .trim()
    .refine((v) => dataReal(v), mensagem);

/** «1 500 000», «1500000,50» ou «1500000.50» → número; vazio → nulo. */
export const valorOpcional = z
  .string()
  .trim()
  .transform((v) => v.replace(/\s/g, '').replace(',', '.'))
  .refine((v) => v === '' || /^\d{1,14}(\.\d{1,2})?$/.test(v), 'Valor inválido: use só números.')
  .transform((v) => (v === '' ? null : Number(v)));

/** Uma caixa de verificação: marcada → true; ausente → false. */
export const marcado = z
  .union([z.literal('on'), z.literal('1'), z.literal(''), z.undefined(), z.null()])
  .transform((v) => v === 'on' || v === '1');
