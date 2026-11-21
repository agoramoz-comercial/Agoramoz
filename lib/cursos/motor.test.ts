import { describe, expect, it } from 'vitest';
import { criarMotor, ErroMotor, lerResposta } from './motor';

const pedido = { tarefa: 'planear' as const, prompt: 'p', schema: {} };

describe('motor ZabaEdu', () => {
  it('envia o segredo no cabeçalho e devolve o JSON', async () => {
    let visto: RequestInit | undefined;
    const m = criarMotor({
      url: 'https://exemplo.test/functions/agoramoz_llm',
      chave: 'x'.repeat(24),
      fetch: (async (_u: string, init: RequestInit) => {
        visto = init;
        return Response.json({ titulo: 'T' });
      }) as unknown as typeof fetch,
    });
    expect(await m(pedido)).toEqual({ titulo: 'T' });
    expect((visto!.headers as Record<string, string>)['x-agoramoz-chave']).toBe('x'.repeat(24));
    expect((visto!.headers as Record<string, string>)['x-servico-token']).toBe('x'.repeat(24));
    expect(JSON.parse(String(visto!.body))).toEqual(pedido);
  });

  it('traduz falhas em códigos', async () => {
    const com = (r: () => Promise<Response>) =>
      criarMotor({ url: 'https://e.test/f', chave: 'x'.repeat(24), fetch: r as unknown as typeof fetch });
    await expect(com(async () => new Response('', { status: 401 }))(pedido)).rejects.toMatchObject({ codigo: 'recusado' });
    await expect(com(async () => new Response('', { status: 500 }))(pedido)).rejects.toMatchObject({ codigo: 'indisponivel' });
    await expect(com(async () => new Response('nao json'))(pedido)).rejects.toMatchObject({ codigo: 'resposta_invalida' });
    const lento = criarMotor({
      url: 'https://e.test/f',
      chave: 'x'.repeat(24),
      tempoMs: 20,
      fetch: ((_u: string, i: RequestInit) =>
        new Promise((_, rej) => i.signal!.addEventListener('abort', () => rej(i.signal!.reason)))) as unknown as typeof fetch,
    });
    await expect(lento(pedido)).rejects.toMatchObject({ codigo: 'timeout' });
  });

  it('o erro diz o código do ZabaEdu e o que fazer, nunca o corpo', async () => {
    const com = (status: number) =>
      criarMotor({
        url: 'https://e.test/f',
        chave: 'x'.repeat(24),
        fetch: (async () => new Response('segredo do pedido', { status })) as unknown as typeof fetch,
      });
    const e500 = await com(500)(pedido).catch((e: ErroMotor) => e);
    expect(e500).toMatchObject({ codigo: 'indisponivel', status: 500 });
    expect((e500 as ErroMotor).message).toMatch(/respondeu 500: .*registos da função agoramoz_llm/);
    expect((e500 as ErroMotor).message).not.toContain('segredo');
    expect(((await com(404)(pedido).catch((e: Error) => e)) as Error).message).toMatch(/não existe ou não está publicada/);
    expect(((await com(418)(pedido).catch((e: Error) => e)) as Error).message).toMatch(/respondeu 418: veja os registos/);
  });

  it('desembrulha respostas', () => {
    expect(lerResposta('```json\n{"a":1}\n```')).toEqual({ a: 1 });
    expect(lerResposta({ result: { a: 1 } })).toEqual({ a: 1 });
    expect(lerResposta({ a: 1, b: 2 })).toEqual({ a: 1, b: 2 });
    expect(() => lerResposta([1])).toThrow(ErroMotor);
  });

  it('sem configuração, está desligado', () => {
    expect(() => criarMotor()).toThrow(ErroMotor);
  });
});
