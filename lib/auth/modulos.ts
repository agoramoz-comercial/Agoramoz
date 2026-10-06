import { notFound } from 'next/navigation';
import { createSessionClient } from './client';
import { requireStaff, type Sessao } from './session';

/**
 * Acesso por módulo — espaços de trabalho que não são de um papel, são de uma
 * pessoa. Hoje há um: `energia`, o Espaço CEnO da Chief Energy Officer.
 *
 * O papel diz o que alguém pode fazer no admin partilhado; o módulo diz se um
 * espaço privado existe para essa pessoa. Quem decide é a base: a linha em
 * `acessos_modulo` só a concede o dono da base (SQL Editor), a RLS só mostra
 * a cada um a sua própria linha, e as funções do espaço verificam o módulo
 * outra vez. Este ficheiro é só a camada de ecrã.
 */

export const MODULOS = ['energia'] as const;
export type Modulo = (typeof MODULOS)[number];

/**
 * Os módulos de quem está autenticado. Qualquer erro — incluindo a tabela
 * ainda não existir (0017 por aplicar) — lê-se como «sem acesso»: um espaço
 * privado nunca abre por engano.
 */
export async function modulosDaSessao(): Promise<readonly Modulo[]> {
  const supabase = await createSessionClient();
  const { data, error } = await supabase.from('acessos_modulo').select('modulo');
  if (error || !Array.isArray(data)) return [];
  return data
    .map((r: { modulo?: unknown }) => r.modulo)
    .filter((m): m is Modulo => typeof m === 'string' && (MODULOS as readonly string[]).includes(m));
}

/**
 * Para as páginas de um espaço privado. Sem o módulo: 404 — e não um
 * redirecionamento, que confirmaria a um colega que o espaço existe.
 */
export async function requireModulo(modulo: Modulo): Promise<Sessao> {
  const sessao = await requireStaff();
  const modulos = await modulosDaSessao();
  if (!modulos.includes(modulo)) notFound();
  return sessao;
}
