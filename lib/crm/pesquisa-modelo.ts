import { z } from 'zod';

/**
 * A forma de um resultado da pesquisa global, validada à chegada: o que a
 * base devolve (`pesquisar_global`, 0019) passa por aqui antes de chegar ao
 * browser, e só saem os campos que o ecrã mostra.
 */

export const MIN_TERMO = 2;
export const MAX_TERMO = 80;

/** O termo como a base o vai ver: sem espaços a mais, até 80 caracteres; `null` se for curto demais. */
export function limparTermo(q: unknown): string | null {
  if (typeof q !== 'string') return null;
  const t = q.replace(/\s+/g, ' ').trim().slice(0, MAX_TERMO);
  return t.length >= MIN_TERMO ? t : null;
}

/** Escapa os metacaracteres do LIKE (`\`, `%`, `_`): o termo procura-se tal como foi escrito. */
export function padraoLike(termo: string): string {
  return `%${termo.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}

const UUID = z.string().uuid();
const texto = z.string().max(300);

const Contacto = z.object({ id: UUID, nome: texto, email: texto.nullable().catch(null) });
const Organizacao = z.object({ id: UUID, nome: texto, dominio: texto.nullable().catch(null) });
const Oportunidade = z.object({ id: UUID, fase: texto, contacto: texto, organizacao: texto.nullable().catch(null) });

const lista = <T extends z.ZodTypeAny>(item: T) =>
  z
    .array(z.unknown())
    .catch([])
    .transform((xs) => xs.flatMap((x) => {
      const r = item.safeParse(x);
      return r.success ? [r.data as z.infer<T>] : [];
    }).slice(0, 8));

export const resultadoPesquisa = z.object({
  contactos: lista(Contacto),
  organizacoes: lista(Organizacao),
  oportunidades: lista(Oportunidade),
});

export type ResultadoPesquisa = z.infer<typeof resultadoPesquisa>;

export const VAZIO: ResultadoPesquisa = { contactos: [], organizacoes: [], oportunidades: [] };

/** O que a base devolveu, já limpo; uma entrada mal formada cai sozinha, não leva as outras. */
export function normalizarResultado(bruto: unknown): ResultadoPesquisa {
  const r = resultadoPesquisa.safeParse(bruto && typeof bruto === 'object' ? bruto : {});
  return r.success ? r.data : VAZIO;
}

export function totalDe(r: ResultadoPesquisa): number {
  return r.contactos.length + r.organizacoes.length + r.oportunidades.length;
}
