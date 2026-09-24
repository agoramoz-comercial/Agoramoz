import { redirect } from 'next/navigation';
import { createSessionClient } from './client';

/**
 * Quem está autenticado, e o que pode fazer.
 *
 * Uma sessão válida **não é acesso**. O Supabase é dono da autenticação; quem
 * responde a «esta pessoa pode ver isto?» é a tabela `profiles`, e uma conta
 * sem perfil activo não vê nada — é o que `is_staff()` já impõe do lado da
 * base. Estas funções garantem que o ecrã diz o mesmo que a base, em vez de
 * mostrar uma casca vazia a quem não devia lá estar.
 */

export const PAPEIS = ['admin', 'comercial', 'leitura'] as const;
export type Papel = (typeof PAPEIS)[number];

export interface Sessao {
  readonly userId: string;
  readonly email: string | null;
  readonly nome: string;
  readonly papel: Papel;
}

/**
 * Devolve a sessão, ou `null`. Usa `getUser()` e não `getSession()`: o
 * primeiro valida o token contra o servidor de autenticação, o segundo aceita
 * o que estiver no cookie. Num guarda de acesso, a diferença é toda.
 */
export async function currentSession(): Promise<Sessao | null> {
  const supabase = await createSessionClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;

  const { data: perfil } = await supabase
    .from('profiles')
    .select('role, display_name, active')
    .eq('id', user.id)
    .maybeSingle();

  // Sem perfil, ou perfil desactivado: autenticado e sem acesso nenhum.
  if (!perfil || perfil.active !== true) return null;

  return {
    userId: user.id,
    email: user.email ?? null,
    nome: perfil.display_name as string,
    papel: perfil.role as Papel,
  };
}

/** Para páginas. Sem sessão, vai para a entrada. */
export async function requireStaff(): Promise<Sessao> {
  const sessao = await currentSession();
  if (!sessao) redirect('/admin/entrar');
  return sessao;
}

/**
 * Para páginas restritas a certos papéis. Quem é da casa mas não tem o papel
 * volta ao painel — devolver 404 a um colega seria mentir-lhe sobre o que
 * existe.
 *
 * Isto é a camada de ecrã. A camada que **decide** é a base: cada função de
 * escrita verifica o papel outra vez, porque um botão escondido não é uma
 * autorização.
 */
export async function requireRole(papeis: readonly Papel[]): Promise<Sessao> {
  const sessao = await requireStaff();
  if (!papeis.includes(sessao.papel)) redirect('/admin');
  return sessao;
}

/** Quem pode escrever. Usado só para decidir o que mostrar. */
export function podeEscrever(papel: Papel): boolean {
  return papel === 'admin' || papel === 'comercial';
}
