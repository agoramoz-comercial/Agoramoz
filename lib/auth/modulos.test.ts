import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * O espaço privado abre só com o módulo, e qualquer dúvida lê-se como «não».
 * A base é quem decide (RLS + funções); isto prova que o ecrã não abre o que
 * a base fecharia.
 */

class NaoEncontrado extends Error {}

vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new NaoEncontrado();
  },
  redirect: (d: string) => {
    throw new Error(`redirect:${d}`);
  },
}));

const resultado = vi.fn();

vi.mock('./client', () => ({
  createSessionClient: async () => ({
    from: () => ({ select: async () => resultado() }),
  }),
}));

vi.mock('./session', () => ({
  requireStaff: async () => ({ userId: 'u', email: null, nome: 'Pessoa', papel: 'comercial' }),
}));

const { modulosDaSessao, requireModulo } = await import('./modulos');

beforeEach(() => resultado.mockReset());

describe('módulos', () => {
  it('devolve os módulos conhecidos da pessoa', async () => {
    resultado.mockResolvedValue({ data: [{ modulo: 'energia' }, { modulo: 'desconhecido' }], error: null });
    expect(await modulosDaSessao()).toEqual(['energia']);
  });

  it('um erro (por exemplo, a 0017 ainda por aplicar) lê-se como sem acesso', async () => {
    resultado.mockResolvedValue({ data: null, error: { code: '42P01' } });
    expect(await modulosDaSessao()).toEqual([]);
  });

  it('com o módulo, entra; sem ele, 404 — também para administradores', async () => {
    resultado.mockResolvedValue({ data: [{ modulo: 'energia' }], error: null });
    await expect(requireModulo('energia')).resolves.toMatchObject({ nome: 'Pessoa' });
    resultado.mockResolvedValue({ data: [], error: null });
    await expect(requireModulo('energia')).rejects.toBeInstanceOf(NaoEncontrado);
  });
});
