'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createSessionClient } from '@/lib/auth/client';
import { requireRole } from '@/lib/auth/session';
import { serverEnv } from '@/lib/config/env';
import { log } from '@/lib/log/logger';
import { contextoDoItem, mapaLeque } from './aeos-mapa';
import { carregarAccoes, permissoesAeos } from './aeos-servidor';
import { agentePorId, estadoInicial, podeDecidir, type EstadoAccao, type Proposta } from './agentes';
import { perguntarAoKimi } from './agentes-ia';

/**
 * As duas acções dos agentes no Mapa AEOS. A pergunta pode registar
 * propostas (a classe decide-se na base pelo tipo); decidir é só de admin,
 * verificado aqui e outra vez na função SQL.
 */

const perguntaSchema = z.object({
  agente: z.string().regex(/^AG-\d{2}$/),
  item: z.string().min(1).max(80),
  pergunta: z.string().trim().min(3).max(1200),
});

export type PropostaGuardada = Proposta & { readonly estado: EstadoAccao; readonly guardada: boolean };

export type RespostaPergunta =
  | { ok: true; resposta: string; propostas: PropostaGuardada[]; retiradas: number; aviso?: string }
  | { ok: false; erro: string };

const SEM_TABELA = new Set(['42P01', 'PGRST202', 'PGRST205', '42883']);

export async function perguntarAgente(entrada: unknown): Promise<RespostaPergunta> {
  const sessao = await requireRole(['admin', 'comercial']);
  const r = perguntaSchema.safeParse(entrada);
  if (!r.success) return { ok: false, erro: 'Escolha um agente e escreva uma pergunta (3 a 1200 caracteres).' };
  const agente = agentePorId(r.data.agente);
  if (!agente) return { ok: false, erro: 'Agente desconhecido.' };

  const env = serverEnv();
  if (!env.KIMI_API_KEY) return { ok: false, erro: 'Os agentes estão desligados (falta KIMI_API_KEY).' };

  const mapa = mapaLeque(await permissoesAeos(sessao), await carregarAccoes());
  const contexto = contextoDoItem(mapa, r.data.item);
  if (!contexto) return { ok: false, erro: 'Esse item não está no mapa.' };

  const res = await perguntarAoKimi(
    { chave: env.KIMI_API_KEY, modelo: env.KIMI_MODEL, baseUrl: env.KIMI_BASE_URL },
    agente,
    contexto,
    r.data.pergunta,
  );
  if (!res.ok) return res;

  const sb = await createSessionClient();
  const propostas: PropostaGuardada[] = [];
  let aviso: string | undefined;
  for (const p of res.propostas) {
    const { data, error } = await sb.rpc('propor_accao_agente', {
      p_agente: agente.id,
      p_tipo: p.tipo,
      p_titulo: p.titulo,
      p_descricao: p.descricao,
      p_alvo: r.data.item,
    });
    if (error) {
      aviso = SEM_TABELA.has(error.code ?? '')
        ? 'As propostas não foram guardadas: falta aplicar a migração 0024 (supabase/aplicar-0024.sql).'
        : 'Não foi possível guardar as propostas.';
      log.warn('aeos.propor', { outcome: 'failed', reason: error.code ?? 'desconhecido' });
      propostas.push({ ...p, estado: estadoInicial(p.tipo), guardada: false });
      continue;
    }
    const estado = ((data as { estado?: string } | null)?.estado ?? estadoInicial(p.tipo)) as EstadoAccao;
    propostas.push({ ...p, estado, guardada: true });
  }
  if (propostas.some((p) => p.guardada)) revalidatePath('/admin/aeos');
  log.info('aeos.agente', { outcome: 'accepted', reason: agente.id });
  return { ok: true, resposta: res.resposta, propostas, retiradas: res.retiradas, ...(aviso ? { aviso } : {}) };
}

const decisaoSchema = z.object({
  id: z.string().uuid(),
  decisao: z.enum(['aprovada', 'recusada']),
  nota: z.string().trim().max(400).optional(),
});

export async function decidirAccao(entrada: unknown): Promise<{ ok: true } | { ok: false; erro: string }> {
  const sessao = await requireRole(['admin', 'comercial']);
  if (!podeDecidir(sessao.papel)) return { ok: false, erro: 'Só um administrador pode aprovar ou recusar.' };
  const r = decisaoSchema.safeParse(entrada);
  if (!r.success) return { ok: false, erro: 'Decisão inválida.' };
  const sb = await createSessionClient();
  const { error } = await sb.rpc('decidir_accao_agente', {
    p_id: r.data.id,
    p_decisao: r.data.decisao,
    p_nota: r.data.nota ?? null,
  });
  if (error) {
    log.warn('aeos.decidir', { outcome: 'rejected', reason: error.code ?? 'desconhecido' });
    return { ok: false, erro: error.code === '40001' ? 'Esta proposta já foi decidida.' : 'Não foi possível registar a decisão.' };
  }
  revalidatePath('/admin/aeos');
  return { ok: true };
}
