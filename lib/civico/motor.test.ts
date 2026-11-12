import { describe, expect, it, vi } from 'vitest';
import { MAX_TEXTO, consultarLovable, corpoDoPedido } from './motor';
import { pedidoSchema } from './pedido';

/**
 * O adaptador do motor cívico, com o motor simulado por `fetch`. Nenhum teste
 * fala com a rede: gastaria modelos de IA para provar o que um duplo prova.
 */

const URL_MOTOR = 'https://portal-exemplo.lovable.app/api/consulta';
const CFG = { url: URL_MOTOR, timeoutMs: 5_000 };
const PEDIDO = pedidoSchema.parse({ pergunta: 'Que aviso prévio tem de dar o empregador?' });

const fluxo = (texto: string) =>
  [
    { type: 'start' },
    { type: 'text-start', id: 't1' },
    ...(texto.match(/[\s\S]{1,25}/g) ?? []).map((delta) => ({ type: 'text-delta', id: 't1', delta })),
    { type: 'text-end', id: 't1' },
    { type: 'finish' },
  ]
    .map((e) => `data: ${JSON.stringify(e)}\n\n`)
    .join('') + 'data: [DONE]\n\n';

function motor(corpo: string, init: ResponseInit = {}) {
  return vi.fn<(url: string | URL | Request, init?: RequestInit) => Promise<Response>>(
    async () => new Response(corpo, { status: 200, ...init }),
  );
}

describe('corpoDoPedido', () => {
  it('escreve as mensagens no formato do transporte de chat, com as trocas anteriores à frente', () => {
    const pedido = pedidoSchema.parse({
      pergunta: 'E se o contrato for a prazo?',
      historico: [{ pergunta: 'Que aviso prévio tem de dar o empregador?', resposta: 'Depende da antiguidade.' }],
    });
    const corpo = corpoDoPedido(pedido);
    expect(corpo.trigger).toBe('submit-message');
    expect(corpo.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(corpo.messages.map((m) => [m.role, m.parts])).toEqual([
      ['user', [{ type: 'text', text: 'Que aviso prévio tem de dar o empregador?' }]],
      ['assistant', [{ type: 'text', text: 'Depende da antiguidade.' }]],
      ['user', [{ type: 'text', text: 'E se o contrato for a prazo?' }]],
    ]);
    expect(new Set(corpo.messages.map((m) => m.id)).size).toBe(3);
  });
});

describe('consultarLovable', () => {
  it('chama o motor por POST, em português, sem credenciais e sem seguir redireccionamentos', async () => {
    const f = motor(fluxo('Resposta.'));
    await consultarLovable(PEDIDO, CFG, f as unknown as typeof fetch);

    expect(f).toHaveBeenCalledTimes(1);
    const [url, init] = f.mock.calls[0]!;
    expect(url).toBe(URL_MOTOR);
    expect(init!.method).toBe('POST');
    expect(init!.redirect).toBe('error');
    expect(init!.cache).toBe('no-store');
    const headers = init!.headers as Record<string, string>;
    expect(headers['x-idioma']).toBe('pt');
    expect(headers['content-type']).toBe('application/json');
    // O motor é público: nada de `authorization`, `cookie` ou IP de quem pergunta.
    expect(Object.keys(headers).map((h) => h.toLowerCase()).sort()).toEqual(['accept', 'content-type', 'x-idioma']);
    expect(JSON.parse(init!.body as string).messages.at(-1).parts[0].text).toBe(PEDIDO.pergunta);
  });

  it('devolve a resposta normalizada, com as fontes', async () => {
    const md = '## Aviso prévio\n\nVeja a [Lei do Trabalho](https://www.mitess.gov.mz/lei-13-2023).';
    const r = await consultarLovable(PEDIDO, CFG, motor(fluxo(md)) as unknown as typeof fetch);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.resposta.blocos.map((b) => b.tipo)).toEqual(['titulo', 'paragrafo']);
    expect(r.resposta.fontes).toEqual([
      { n: 1, titulo: 'Lei do Trabalho', href: 'https://www.mitess.gov.mz/lei-13-2023', dominio: 'mitess.gov.mz', estado: true },
    ]);
  });

  it.each([
    [401, 'indisponivel'],
    [402, 'indisponivel'],
    [403, 'indisponivel'],
    [429, 'indisponivel'],
    [404, 'http'],
    [500, 'http'],
  ])('HTTP %i do motor é %s', async (status, motivo) => {
    const r = await consultarLovable(PEDIDO, CFG, motor('x', { status }) as unknown as typeof fetch);
    expect(r).toEqual({ ok: false, motivo, status });
  });

  it('timeout e falha de rede não lançam; a rede leva só o código da causa', async () => {
    const lento = vi.fn(async () => {
      throw Object.assign(new Error('The operation was aborted due to timeout'), { name: 'TimeoutError' });
    });
    expect(await consultarLovable(PEDIDO, CFG, lento as unknown as typeof fetch)).toEqual({ ok: false, motivo: 'timeout' });

    const semRede = vi.fn(async () => {
      throw Object.assign(new TypeError(`fetch failed: ${URL_MOTOR}`), { cause: { code: 'ECONNREFUSED' } });
    });
    const r = await consultarLovable(PEDIDO, CFG, semRede as unknown as typeof fetch);
    expect(r).toEqual({ ok: false, motivo: 'rede', codigo: 'ECONNREFUSED' });
    expect(JSON.stringify(r)).not.toContain('lovable.app');
  });

  it('a leitura do fluxo interrompida a meio é timeout, não um erro por tratar', async () => {
    const f = vi.fn(async () => ({
      ok: true,
      status: 200,
      headers: new Headers(),
      text: async () => {
        throw Object.assign(new Error('aborted'), { name: 'AbortError' });
      },
    }));
    expect(await consultarLovable(PEDIDO, CFG, f as unknown as typeof fetch)).toEqual({ ok: false, motivo: 'timeout' });
  });

  it('um evento de erro no fluxo é falha do motor', async () => {
    const corpo = `data: ${JSON.stringify({ type: 'error', errorText: 'interno' })}\n\n`;
    expect(await consultarLovable(PEDIDO, CFG, motor(corpo) as unknown as typeof fetch)).toEqual({ ok: false, motivo: 'motor' });
  });

  it('uma página que não é um fluxo (bloqueio, manutenção) é vazio', async () => {
    const r = await consultarLovable(PEDIDO, CFG, motor('<html>Just a moment…</html>') as unknown as typeof fetch);
    expect(r).toEqual({ ok: false, motivo: 'vazio' });
  });

  it('resposta acima do tecto é recusada, declarada ou não', async () => {
    const declarada = motor('x', { headers: { 'content-length': '9000000' } });
    expect(await consultarLovable(PEDIDO, CFG, declarada as unknown as typeof fetch)).toEqual({ ok: false, motivo: 'grande' });

    const longa = motor(fluxo('palavra '.repeat(MAX_TEXTO / 8 + 100)));
    expect(await consultarLovable(PEDIDO, CFG, longa as unknown as typeof fetch)).toEqual({ ok: false, motivo: 'grande' });
  });
});
