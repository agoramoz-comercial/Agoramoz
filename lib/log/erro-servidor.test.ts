import { afterEach, describe, expect, it, vi } from 'vitest';
import { onRequestError } from '@/instrumentation';
import { camposDoErro } from './erro-servidor';

const CONTEXTO = {
  routerKind: 'App Router' as const,
  routePath: '/admin/inqueritos/[id]',
  routeType: 'action' as const,
  revalidateReason: undefined,
};
const PEDIDO = {
  path: '/admin/inqueritos/963d1a7f-45de-4511-8acb-4b8306d5d015?erro=x',
  method: 'POST',
  headers: { cookie: 'sb-access-token=segredo', 'next-action': 'abc' },
};

describe('erro de servidor no log', () => {
  afterEach(() => vi.restoreAllMocks());

  it('leva o digest, a rota como padrão, o tipo e onde rebentou', () => {
    const e = Object.assign(new TypeError('Cannot read properties of undefined'), {
      digest: '1234567890',
    });
    e.stack = 'TypeError: x\n    at guardar (/var/task/.next/server/chunks/ssr/abc_123.js:4:567)';
    expect(camposDoErro(e, PEDIDO, CONTEXTO)).toEqual({
      digest: '1234567890',
      rota: '/admin/inqueritos/[id]',
      tipoRota: 'action',
      metodo: 'POST',
      erro: 'TypeError',
      mensagem: 'Cannot read properties of undefined',
      origem: 'abc_123.js:4:567',
    });
  });

  it('corta mensagens longas', () => {
    const r = camposDoErro(new Error('a'.repeat(500)), PEDIDO, CONTEXTO);
    expect(r.mensagem!.length).toBe(201);
  });

  it('aceita o que não é Error', () => {
    expect(camposDoErro('falhou', PEDIDO, CONTEXTO)).toMatchObject({
      erro: 'string',
      mensagem: 'falhou',
    });
  });

  it('onRequestError escreve uma linha sem cookies, cabeçalhos, caminho com id nem query', () => {
    const espiao = vi.spyOn(console, 'error').mockImplementation(() => {});
    void onRequestError(Object.assign(new Error('boom'), { digest: 'd1' }), PEDIDO, CONTEXTO);
    expect(espiao).toHaveBeenCalledTimes(1);
    const linha = String(espiao.mock.calls[0]![0]);
    const json = JSON.parse(linha) as Record<string, unknown>;
    expect(json).toMatchObject({ event: 'servidor.erro', digest: 'd1', rota: '/admin/inqueritos/[id]' });
    expect(json).not.toHaveProperty('droppedFields');
    expect(linha).not.toMatch(/segredo|963d1a7f|erro=x|next-action/);
  });
});
