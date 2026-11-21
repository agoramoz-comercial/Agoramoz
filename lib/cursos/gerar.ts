import { z } from 'zod';
import { fonteSchema, LIMITES, NIVEIS, passagemSchema, type Fonte } from './modelo';
import { escreverAula, planear, planoSchema, sugerirTema, type Motor, type Peca, type Plano } from './ciclo';
import type { Aula } from './modelo';
import { ErroMotor } from './motor';

/**
 * A ponte entre o criador (browser) e o ciclo (servidor), D-49.
 *
 * O browser lê os ficheiros, parte-os em passagens e pede uma peça de cada
 * vez — o plano, depois cada aula — para que nenhum pedido ao servidor passe
 * do tempo máximo nem do tamanho máximo. Cada aula leva só as passagens que
 * o plano lhe deu. Tudo o que chega é validado outra vez aqui.
 */

export const pedidoSchema = z.strictObject({
  titulo: z.string().trim().min(3).max(LIMITES.curto),
  tema: z.string().trim().min(3).max(LIMITES.tema),
  publico: z.string().trim().min(3).max(300),
  nivel: z.enum(NIVEIS),
  minutos: z.number().int().min(15).max(1_200),
});

/** Para o tema: tudo menos o tema; o público pode ainda estar por escrever. */
export const pedidoTemaSchema = pedidoSchema.omit({ tema: true }).extend({ publico: z.string().trim().max(300) });

const fontesSchema = z
  .array(fonteSchema)
  .min(1)
  .max(LIMITES.fontes)
  .refine(
    (fs) => fs.reduce((s, f) => s + f.passagens.reduce((a, p) => a + p.texto.length, 0), 0) <= LIMITES.caracteresTotal,
    'As fontes são grandes de mais.',
  );

export const entradaTemaSchema = z.strictObject({ pedido: pedidoTemaSchema, fontes: fontesSchema });
export const entradaPlanoSchema = z.strictObject({ pedido: pedidoSchema, fontes: fontesSchema });

export const entradaAulaSchema = z.strictObject({
  pedido: pedidoSchema,
  plano: planoSchema,
  modulo: z
    .number()
    .int()
    .min(0)
    .max(LIMITES.modulos - 1),
  aula: z
    .number()
    .int()
    .min(0)
    .max(LIMITES.aulasPorModulo - 1),
  passagens: z.array(passagemSchema).min(1).max(40),
});

export type EntradaTema = z.input<typeof entradaTemaSchema>;
export type EntradaPlano = z.input<typeof entradaPlanoSchema>;
export type EntradaAula = z.input<typeof entradaAulaSchema>;

export type Resposta<T> = { readonly ok: true; readonly peca: Peca<T> } | { readonly ok: false; readonly erro: string };

const erroDe = (e: unknown) => (e instanceof ErroMotor ? e.message : 'Não foi possível gerar agora. Tente de novo.');

export async function gerarTema(motor: Motor, entrada: unknown): Promise<Resposta<string>> {
  const e = entradaTemaSchema.safeParse(entrada);
  if (!e.success) return { ok: false, erro: e.error.issues[0]?.message ?? 'Pedido inválido.' };
  try {
    return { ok: true, peca: await sugerirTema(motor, e.data.pedido, e.data.fontes) };
  } catch (x) {
    return { ok: false, erro: erroDe(x) };
  }
}

export async function gerarPlano(motor: Motor, entrada: unknown): Promise<Resposta<Plano>> {
  const e = entradaPlanoSchema.safeParse(entrada);
  if (!e.success) return { ok: false, erro: e.error.issues[0]?.message ?? 'Pedido inválido.' };
  try {
    return { ok: true, peca: await planear(motor, e.data.pedido, e.data.fontes) };
  } catch (x) {
    return { ok: false, erro: erroDe(x) };
  }
}

/** As passagens soltas voltam a ser fontes (só com o que esta aula precisa). */
export function fontesDasPassagens(passagens: readonly { id: string; texto: string }[]): Fonte[] {
  const por = new Map<string, Fonte>();
  for (const p of passagens) {
    const id = p.id.split('.')[0]!;
    const f = por.get(id) ?? { id, titulo: id, tipo: 'texto' as const, passagens: [] };
    f.passagens.push(p);
    por.set(id, f);
  }
  return [...por.values()];
}

export async function gerarAula(motor: Motor, entrada: unknown): Promise<Resposta<Aula>> {
  const e = entradaAulaSchema.safeParse(entrada);
  if (!e.success) return { ok: false, erro: 'Pedido inválido.' };
  const { pedido, plano, modulo, aula, passagens } = e.data;
  if (!plano.modulos[modulo]?.aulas[aula]) return { ok: false, erro: 'Essa aula não existe no plano.' };
  try {
    return { ok: true, peca: await escreverAula(motor, { pedido, plano, modulo, aula }, fontesDasPassagens(passagens)) };
  } catch (x) {
    return { ok: false, erro: erroDe(x) };
  }
}
