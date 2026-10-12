'use server';

import { createSessionClient } from '@/lib/auth/client';
import { requireStaff } from '@/lib/auth/session';
import { pesquisar } from '@/lib/crm/pesquisa';
import { limparTermo, VAZIO, type ResultadoPesquisa } from '@/lib/crm/pesquisa-modelo';

/**
 * A pesquisa da paleta (⌘K). É uma leitura, mas exposta como Server Action:
 * qualquer browser a pode invocar, por isso exige sessão de equipa e lê pela
 * sessão (RLS) — nunca pela chave de serviço. O termo não vai para os logs.
 */
export async function pesquisarGlobal(q: string): Promise<{ resultado: ResultadoPesquisa; falhou: boolean }> {
  await requireStaff();
  const termo = limparTermo(q);
  if (!termo) return { resultado: VAZIO, falhou: false };
  const r = await pesquisar(await createSessionClient(), termo);
  return r ? { resultado: r, falhou: false } : { resultado: VAZIO, falhou: true };
}
