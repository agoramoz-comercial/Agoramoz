import { afterEach, describe, expect, it, vi } from 'vitest';
import { estadoErp, type ErpAdaptador, type OportunidadeGanha } from './porta';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('estadoErp', () => {
  it('desligado: por ligar', () => {
    expect(estadoErp({ ERP_PROVIDER: 'off' })).toEqual({ estado: 'por-ligar' });
  });

  it('configurado sem adaptador: diz isso, e não finge ligação', () => {
    expect(
      estadoErp({
        ERP_PROVIDER: 'http',
        ERP_URL: 'https://erp.exemplo.test',
        ERP_API_KEY: 'x'.repeat(20),
      }),
    ).toEqual({
      estado: 'configurado-sem-adaptador',
      fornecedor: 'http',
    });
  });
});

describe('configuração', () => {
  async function lerEnv(vars: Record<string, string>) {
    vi.resetModules();
    for (const [k, v] of Object.entries(vars)) vi.stubEnv(k, v);
    const { serverEnv } = await import('@/lib/config/env');
    return serverEnv();
  }

  it('ERP_PROVIDER=http exige URL https e chave', async () => {
    await expect(lerEnv({ ERP_PROVIDER: 'http' })).rejects.toThrow(/ERP_URL[\s\S]*ERP_API_KEY/);
    await expect(
      lerEnv({
        ERP_PROVIDER: 'http',
        ERP_URL: 'http://erp.exemplo.test',
        ERP_API_KEY: 'x'.repeat(20),
      }),
    ).rejects.toThrow(/https/);
  });

  it('a mensagem de erro nunca traz o valor da chave', async () => {
    const chave = 'curta-secreta';
    const erro = await lerEnv({
      ERP_PROVIDER: 'http',
      ERP_URL: 'https://erp.exemplo.test',
      ERP_API_KEY: chave,
    }).then(
      () => null,
      (e: Error) => e,
    );
    expect(erro?.message).toMatch(/ERP_API_KEY/);
    expect(erro?.message).not.toContain(chave);
  });

  it('por omissão está desligado', async () => {
    expect((await lerEnv({})).ERP_PROVIDER).toBe('off');
  });
});

describe('contrato ErpAdaptador', () => {
  it('um adaptador (aqui, um duplo) recebe só id, data e organização', async () => {
    const recebidos: OportunidadeGanha[] = [];
    const duplo: ErpAdaptador = {
      nome: 'duplo de teste',
      verificar: async () => ({ ok: true, valor: null }),
      registarGanho: async (o) => {
        recebidos.push(o);
        return { ok: true, valor: { referenciaErp: 'REF-1' } };
      },
    };
    const r = await duplo.registarGanho({
      id: 'd1',
      ganhaEm: '2026-10-01T00:00:00Z',
      organizacaoId: null,
    });
    expect(r).toEqual({ ok: true, valor: { referenciaErp: 'REF-1' } });
    expect(Object.keys(recebidos[0]!).sort()).toEqual(['ganhaEm', 'id', 'organizacaoId']);
  });
});
