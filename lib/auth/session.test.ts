import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Guarda de acesso.
 *
 * O que estes testes existem para provar: **uma sessão válida não é acesso**.
 * O Supabase responde a «quem é esta pessoa»; quem responde a «pode ver isto»
 * é a tabela `profiles`. Uma conta autenticada sem perfil activo tem de ser
 * indistinguível de nenhuma conta.
 */

class Redirecionou extends Error {
  constructor(readonly destino: string) {
    super(`redirect:${destino}`);
  }
}

vi.mock('next/navigation', () => ({
  redirect: (destino: string) => {
    throw new Redirecionou(destino);
  },
}));

const getUser = vi.fn();
const perfil = vi.fn();

vi.mock('./client', () => ({
  createSessionClient: async () => ({
    auth: { getUser },
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => perfil(),
        }),
      }),
    }),
  }),
}));

const { currentSession, podeEscrever, requireRole, requireStaff } = await import('./session');

const UTILIZADOR = { id: '11111111-1111-4111-8111-111111111111', email: 'pessoa@agoramoz.com' };

beforeEach(() => {
  getUser.mockReset();
  perfil.mockReset();
  getUser.mockResolvedValue({ data: { user: UTILIZADOR }, error: null });
  perfil.mockResolvedValue({ data: { role: 'comercial', display_name: 'Pessoa', active: true } });
});

describe('sessão', () => {
  it('devolve o perfil de quem está autenticado e activo', async () => {
    const s = await currentSession();
    expect(s).toEqual({
      userId: UTILIZADOR.id,
      email: UTILIZADOR.email,
      nome: 'Pessoa',
      papel: 'comercial',
    });
  });

  it('sem utilizador não há sessão', async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null });
    expect(await currentSession()).toBeNull();
  });

  it('token recusado pelo servidor de autenticação não é sessão', async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: { message: 'jwt expired' } });
    expect(await currentSession()).toBeNull();
  });

  it('autenticado SEM perfil não é acesso', async () => {
    perfil.mockResolvedValue({ data: null });
    expect(await currentSession()).toBeNull();
  });

  it('perfil desactivado não é acesso', async () => {
    perfil.mockResolvedValue({ data: { role: 'admin', display_name: 'X', active: false } });
    expect(await currentSession()).toBeNull();
  });
});

describe('guardas de página', () => {
  it('sem sessão vai para a entrada', async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null });
    await expect(requireStaff()).rejects.toThrow('redirect:/admin/entrar');
  });

  it('com sessão passa', async () => {
    await expect(requireStaff()).resolves.toMatchObject({ papel: 'comercial' });
  });

  it('papel insuficiente volta ao painel, não a um 404', async () => {
    // Devolver 404 a um colega seria mentir-lhe sobre o que existe.
    await expect(requireRole(['admin'])).rejects.toThrow('redirect:/admin');
  });

  it('papel suficiente passa', async () => {
    perfil.mockResolvedValue({ data: { role: 'admin', display_name: 'A', active: true } });
    await expect(requireRole(['admin'])).resolves.toMatchObject({ papel: 'admin' });
  });

  it('sem sessão, o guarda de papel também manda para a entrada', async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null });
    await expect(requireRole(['admin'])).rejects.toThrow('redirect:/admin/entrar');
  });
});

describe('quem escreve', () => {
  it('admin e comercial escrevem; leitura não', () => {
    expect(podeEscrever('admin')).toBe(true);
    expect(podeEscrever('comercial')).toBe(true);
    expect(podeEscrever('leitura')).toBe(false);
  });
});
