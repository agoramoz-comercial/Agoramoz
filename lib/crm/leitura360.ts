import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { serverEnv } from '@/lib/config/env';
import { umDe } from '@/lib/utils/um';
import type { Fontes, OportunidadeLigada } from './ficha360';

/**
 * Leituras das fichas 360, pela sessão de quem pede (RLS). Uma fonte que
 * falha ou que ainda não existe (reuniões sem a 0012) lê-se como vazia: a
 * ficha mostra o resto em vez de partir.
 */

const BASE = 'id, stage, owner_id, next_action_at, created_at, contact_id, contacts(name)';
const NOVAS = 'proxima_accao, valor, moeda';

type LinhaDeal = {
  id: string;
  stage: string;
  owner_id: string | null;
  next_action_at: string | null;
  created_at: string;
  contact_id: string;
  contacts: { name: string } | null;
  proxima_accao?: string | null;
  valor?: number | string | null;
  moeda?: string | null;
};

export async function lerOportunidadesDe(
  sb: SupabaseClient,
  coluna: 'contact_id' | 'organisation_id',
  id: string,
  activo: boolean,
): Promise<(OportunidadeLigada & { created_at: string })[]> {
  const { data, error } = await sb
    .from('deals')
    .select(activo ? `${BASE}, ${NOVAS}` : BASE)
    .eq(coluna, id)
    .order('created_at', { ascending: false })
    .limit(100);
  if (error || !Array.isArray(data)) return [];
  return (data as unknown as LinhaDeal[]).map((d) => ({
    id: d.id,
    stage: d.stage,
    owner_id: d.owner_id,
    next_action_at: d.next_action_at,
    proxima_accao: d.proxima_accao ?? null,
    valor: d.valor === null || d.valor === undefined ? null : Number(d.valor),
    moeda: d.moeda ?? null,
    created_at: d.created_at,
    contacto: d.contacts?.name,
  }));
}

/** Actividades, reuniões e respostas ligadas às oportunidades e contactos dados. */
export async function lerFontes(
  sb: SupabaseClient,
  oportunidades: readonly { id: string; created_at: string; contacto?: string }[],
  contactos: readonly { id: string; nome: string }[],
): Promise<Omit<Fontes, 'consentimentos'>> {
  const ids = oportunidades.map((o) => o.id);
  const cids = contactos.map((c) => c.id);
  const contexto = new Map(oportunidades.map((o) => [o.id, o.contacto]));
  const nomeContacto = new Map(contactos.map((c) => [c.id, c.nome]));
  const env = serverEnv();
  // Com inquéritos ligados, as respostas a inquéritos (com link) ficam de fora: só diagnósticos.
  const excluirInqueritos = env.SURVEYS === 'on' || Boolean(env.SURVEY_LINK_SECRET);

  const [act, resp] = await Promise.all([
    ids.length
      ? sb
          .from('activities')
          .select('id, deal_id, activity_type, body, occurred_at, metadata')
          .in('deal_id', ids)
          .order('occurred_at', { ascending: false })
          .limit(200)
      : Promise.resolve({ data: [], error: null }),
    cids.length
      ? (() => {
          const q = sb.from('responses').select('id, submitted_at, contact_id, diagnostics(id, tier, score)').in('contact_id', cids);
          return (excluirInqueritos ? q.is('survey_link_id', null) : q).order('submitted_at', { ascending: false }).limit(100);
        })()
      : Promise.resolve({ data: [], error: null }),
  ]);

  return {
    actividades: act.error
      ? []
      : ((act.data ?? []) as { id: number; deal_id: string | null; activity_type: string; body: string | null; occurred_at: string; metadata: Record<string, unknown> | null }[]).map(
          (a) => ({ ...a, contexto: oportunidades.length > 1 && a.deal_id ? contexto.get(a.deal_id) : undefined }),
        ),
    respostas: resp.error
      ? []
      : ((resp.data ?? []) as unknown as { id: string; submitted_at: string; contact_id: string; diagnostics: { id: string; tier: string; score: number } | { id: string; tier: string; score: number }[] | null }[]).map(
          (r) => ({
            id: r.id,
            submitted_at: r.submitted_at,
            diagnostico: umDe(r.diagnostics),
            contexto: contactos.length > 1 ? nomeContacto.get(r.contact_id) : undefined,
          }),
        ),
    oportunidades: oportunidades.map((o) => ({ id: o.id, created_at: o.created_at, contexto: oportunidades.length > 1 ? o.contacto : undefined })),
  };
}
