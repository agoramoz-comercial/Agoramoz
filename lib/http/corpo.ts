/**
 * Lê o corpo de um pedido e pára assim que passa de `max` bytes.
 *
 * `request.text()` lê tudo antes de se poder medir: um corpo enviado em
 * blocos, sem `Content-Length`, ficava inteiro em memória antes de qualquer
 * verificação. Aqui a leitura é cancelada ao primeiro byte a mais.
 */
export type Corpo = { readonly ok: true; readonly texto: string } | { readonly ok: false; readonly motivo: 'grande' | 'leitura' };

export async function lerCorpoLimitado(request: Request, max: number): Promise<Corpo> {
  if (!request.body) return { ok: true, texto: '' };
  const leitor = request.body.getReader();
  const partes: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await leitor.read();
      if (done) break;
      total += value.byteLength;
      if (total > max) {
        await leitor.cancel().catch(() => {});
        return { ok: false, motivo: 'grande' };
      }
      partes.push(value);
    }
  } catch {
    return { ok: false, motivo: 'leitura' };
  }
  const junto = new Uint8Array(total);
  let pos = 0;
  for (const p of partes) {
    junto.set(p, pos);
    pos += p.byteLength;
  }
  return { ok: true, texto: new TextDecoder().decode(junto) };
}
