/**
 * Uma relação embutida do PostgREST vem como objecto quando a chave estrangeira
 * é única (um-para-um, p. ex. `diagnostics.response_id`) e como lista quando
 * não é. Ler `?.[0]` de um objecto dá sempre `undefined` — em silêncio. Isto
 * aceita as duas formas e devolve o primeiro (ou único) elemento.
 */
export function umDe<T>(v: T | readonly T[] | null | undefined): T | null {
  if (v === null || v === undefined) return null;
  return Array.isArray(v) ? ((v as readonly T[])[0] ?? null) : (v as T);
}
