import { describe, expect, it } from 'vitest';
import { lerCorpoLimitado } from './corpo';

/** Um pedido cujo corpo chega em blocos, sem Content-Length. */
function emBlocos(blocos: string[]): Request {
  const cod = new TextEncoder();
  let lidos = 0;
  const fluxo = new ReadableStream<Uint8Array>({
    pull(c) {
      if (lidos < blocos.length) c.enqueue(cod.encode(blocos[lidos++]));
      else c.close();
    },
  });
  return new Request('https://agoramoz.com/x', { method: 'POST', body: fluxo, duplex: 'half' } as RequestInit);
}

describe('lerCorpoLimitado', () => {
  it('devolve o texto inteiro, com acentos, quando cabe', async () => {
    expect(await lerCorpoLimitado(emBlocos(['{"a":', '"ação"}']), 100)).toEqual({ ok: true, texto: '{"a":"ação"}' });
  });

  it('recusa e pára de ler ao passar do limite, sem Content-Length', async () => {
    let pedidos = 0;
    const fluxo = new ReadableStream<Uint8Array>({
      pull(c) {
        pedidos += 1;
        c.enqueue(new Uint8Array(1024));
      },
    });
    const r = await lerCorpoLimitado(
      new Request('https://agoramoz.com/x', { method: 'POST', body: fluxo, duplex: 'half' } as RequestInit),
      4096,
    );
    expect(r).toEqual({ ok: false, motivo: 'grande' });
    expect(pedidos).toBeLessThan(10);
  });

  it('o limite é inclusivo', async () => {
    expect((await lerCorpoLimitado(emBlocos(['x'.repeat(10)]), 10)).ok).toBe(true);
    expect((await lerCorpoLimitado(emBlocos(['x'.repeat(11)]), 10)).ok).toBe(false);
  });

  it('sem corpo é texto vazio', async () => {
    expect(await lerCorpoLimitado(new Request('https://agoramoz.com/x', { method: 'POST' }), 10)).toEqual({ ok: true, texto: '' });
  });
});
