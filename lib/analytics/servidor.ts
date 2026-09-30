import type { SupabaseClient } from '@supabase/supabase-js';
import { serverEnv } from '@/lib/config/env';
import { dbAdmin } from '@/lib/db/client';
import { log } from '@/lib/log/logger';

/**
 * Eventos que nascem numa rota do servidor, não no browser nem num gatilho.
 *
 * O News não guarda análises (é uma decisão: o que alguém lê não é nosso para
 * arquivar), mas o painel precisa de saber quantas se fazem e com que
 * prioridade. Fica o facto, sem o conteúdo: nunca o URL, nunca o texto.
 */
export const EVENTOS_DE_ROTA = ['news_analisada', 'news_falhou'] as const;
export type EventoDeRota = (typeof EVENTOS_DE_ROTA)[number];

/** Só escalares: um objecto aninhado seria um sítio onde algo pessoal se esconde. */
export type PropsEscalares = Readonly<Record<string, string | number | boolean | null>>;

export interface Opcoes {
  /** Caminho de primeira parte, já saneado (`/news`). */
  readonly path?: string;
  /** Para testes. Por omissão, a configuração e o cliente de serviço. */
  readonly persistencia?: 'on' | 'off';
  readonly cliente?: SupabaseClient | null;
}

/**
 * Grava um evento de servidor. Nunca lança e nunca faz falhar quem chama: a
 * medição é acessória ao pedido que a origina. Uma falha fica no log, contada.
 */
export async function registarEventoServidor(nome: EventoDeRota, props: PropsEscalares, opcoes: Opcoes = {}) {
  try {
    const persistencia = opcoes.persistencia ?? serverEnv().ANALYTICS_PERSISTENCE;
    if (persistencia !== 'on') return;

    const cliente = opcoes.cliente === undefined ? dbAdmin() : opcoes.cliente;
    if (!cliente) {
      // Medição ligada e sem cliente: nunca em silêncio.
      log.error('analytics.insert_failed', { outcome: 'failed', reason: nome, errorCode: 'sem-cliente' });
      return;
    }

    const { error } = await cliente.from('analytics_events').insert({
      name: nome,
      channel: 'desconhecido',
      path: opcoes.path ?? null,
      props,
      origin: 'servidor',
    });
    if (error) {
      log.error('analytics.insert_failed', { outcome: 'failed', reason: nome, errorCode: error.code ?? 'desconhecido' });
    }
  } catch {
    log.error('analytics.insert_failed', { outcome: 'failed', reason: nome, errorCode: 'excepcao' });
  }
}
