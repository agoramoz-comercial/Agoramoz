import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/auth/client', () => ({ createSessionClient: async () => ({}) }));
vi.mock('next/navigation', () => ({ redirect: vi.fn() }));

const { mensagemDe } = await import('./executar');

describe('mensagemDe — o que um erro da base pode dizer no ecrã', () => {
  it('o texto que as nossas funções escrevem para pessoas passa (só a 1.ª linha)', () => {
    expect(mensagemDe('22023', 'Para implementar falta: Contrato.\nCONTEXT: ...')).toBe('Para implementar falta: Contrato.');
    expect(mensagemDe('23514', 'Não é possível desactivar o próprio perfil.')).toBe('Não é possível desactivar o próprio perfil.');
  });

  it('o texto do Postgres sobre restrições nunca sai (nomes de tabelas e restrições)', () => {
    expect(
      mensagemDe('23514', 'new row for relation "gab_projetos" violates check constraint "gab_projetos_activo_tem_accao"'),
    ).toBe('Dados inválidos. Reveja os campos.');
    expect(
      mensagemDe('23503', 'insert or update on table "gab_tesouraria" violates foreign key constraint "x_fkey"'),
    ).toBe('Dados inválidos. Reveja os campos.');
    expect(mensagemDe('23514', undefined)).toBe('Dados inválidos. Reveja os campos.');
  });

  it('códigos conhecidos têm texto fixo; o resto é genérico', () => {
    expect(mensagemDe('40001', 'qualquer')).toMatch(/mudou entretanto/);
    expect(mensagemDe('23505', 'Key (slug)=(segredo) already exists')).not.toContain('segredo');
    expect(mensagemDe('XX000', 'stack trace')).toBe('Não foi possível concluir a acção.');
  });
});
