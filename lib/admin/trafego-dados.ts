import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import sitemap from '@/app/sitemap';
import { CONVERSOES, resumir, type LinhaEvento, type PeriodoTrafego, type Resumo } from './trafego';

/**
 * Leitura do tráfego pela sessão de quem pede (RLS: a equipa lê
 * `analytics_events`). O PostgREST devolve no máximo 1000 linhas por pedido:
 * lê-se às páginas, até um tecto — e passar o tecto é dito no ecrã.
 */

const POR_PEDIDO = 1000;
export const TECTO_EVENTOS = 60_000;
const NOMES = ['page_view', 'page_engagement', ...CONVERSOES];

export type DadosTrafego =
  | { readonly estado: 'ok'; readonly resumo: Resumo; readonly truncado: boolean; readonly desde: string }
  | { readonly estado: 'erro' };

/** As páginas públicas do site, do sitemap: aparecem no painel mesmo sem vistas. */
async function paginasDoSite(): Promise<string[]> {
  try {
    return (await sitemap()).map((e) => new URL(e.url).pathname.replace(/\/$/, '') || '/');
  } catch {
    return [];
  }
}

export async function carregarTrafego(sb: SupabaseClient, dias: PeriodoTrafego, agora: Date): Promise<DadosTrafego> {
  const desde = new Date(agora.getTime() - dias * 24 * 60 * 60 * 1000).toISOString();
  const linhas: LinhaEvento[] = [];
  let truncado = false;
  for (let de = 0; ; de += POR_PEDIDO) {
    const { data, error } = await sb
      .from('analytics_events')
      .select('name, occurred_at, channel, campaign, path, props')
      .in('name', NOMES)
      .gte('occurred_at', desde)
      .order('occurred_at', { ascending: true })
      .range(de, de + POR_PEDIDO - 1);
    if (error || !Array.isArray(data)) return { estado: 'erro' };
    linhas.push(...(data as LinhaEvento[]));
    if (data.length < POR_PEDIDO) break;
    if (linhas.length >= TECTO_EVENTOS) {
      truncado = true;
      break;
    }
  }
  return { estado: 'ok', resumo: resumir(linhas, await paginasDoSite(), agora), truncado, desde };
}
