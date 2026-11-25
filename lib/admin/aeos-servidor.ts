import 'server-only';
import { createSessionClient } from '@/lib/auth/client';
import { modulosDaSessao } from '@/lib/auth/modulos';
import type { Sessao } from '@/lib/auth/session';
import { serverEnv } from '@/lib/config/env';
import { log } from '@/lib/log/logger';
import type { Permissoes } from './aeos';
import type { AccaoAgente, EstadoAccao, TipoAccao } from './agentes';

export async function permissoesAeos(sessao: Sessao): Promise<Permissoes> {
  const modulos = await modulosDaSessao();
  const env = serverEnv();
  return {
    inqueritos: env.SURVEYS === 'on',
    news: env.NEWS_BLOG === 'on',
    energia: modulos.includes('energia'),
    direcao: modulos.includes('direcao'),
    admin: sessao.papel === 'admin',
  };
}

/** As acções dos agentes. `null` quando a 0024 ainda não foi aplicada (ou a base falhou): o mapa mostra «—». */
export async function carregarAccoes(): Promise<AccaoAgente[] | null> {
  try {
    const sb = await createSessionClient();
    const { data, error } = await sb
      .from('agentes_accoes')
      .select('id, agente, tipo, titulo, descricao, estado, alvo, created_at')
      .order('created_at', { ascending: false })
      .limit(60);
    if (error) {
      log.warn('aeos.accoes', { outcome: 'failed', reason: error.code ?? 'desconhecido' });
      return null;
    }
    return (data ?? []).map((r) => ({
      id: String(r.id),
      agente: String(r.agente),
      tipo: r.tipo as TipoAccao,
      titulo: String(r.titulo),
      descricao: String(r.descricao ?? ''),
      estado: r.estado as EstadoAccao,
      alvo: r.alvo ? String(r.alvo) : null,
      criadaEm: String(r.created_at),
    }));
  } catch {
    return null;
  }
}
