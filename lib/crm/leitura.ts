import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { ESTADOS_POR_REVER } from '@/lib/admin/labels';
import type { OportunidadePipeline } from './pipeline';

/**
 * Leituras do CRM pela sessão de quem pede (RLS da equipa). Os volumes são de
 * uma equipa pequena: o pipeline lê até TECTO oportunidades e decide vistas e
 * ordem em memória (funções testadas em `pipeline.ts`). Passar o tecto não é
 * silencioso: a página di-lo.
 *
 * Sem a 0019 aplicada, lê só as colunas antigas — próxima acção, valor e
 * última actividade ficam vazias, e o ecrã mostra «por activar».
 */

export const TECTO = 500;

const BASE = 'id, stage, tier, score, owner_id, next_action_at, created_at, acquisition_channel, acquisition_campaign, contacts(id, name), organisations(id, name)';
const NOVAS = 'proxima_accao, fase_desde, valor, moeda, revisao';

type Linha = Record<string, unknown> & {
  id: string;
  contacts: { id: string; name: string } | null;
  organisations: { id: string; name: string } | null;
};

export interface FiltrosBase {
  readonly fase?: string;
  readonly canal?: string;
  readonly campanha?: string;
  readonly soAbertas?: boolean;
}

/** O pouco do construtor de consultas que aqui se usa (o tipo completo é demasiado fundo para o tsc). */
interface Consulta {
  eq(coluna: string, valor: string): Consulta;
  not(coluna: string, operador: string, valor: string): Consulta;
  order(coluna: string, opcoes: { ascending: boolean }): Consulta;
  limit(n: number): PromiseLike<{ data: unknown; error: { code?: string } | null }>;
}

function filtrar(q: Consulta, f: FiltrosBase): Consulta {
  let r = q;
  if (f.fase) r = r.eq('stage', f.fase);
  if (f.canal) r = r.eq('acquisition_channel', f.canal);
  if (f.campanha) r = r.eq('acquisition_campaign', f.campanha);
  if (f.soAbertas && !f.fase) r = r.not('stage', 'in', '(ganho,perdido)');
  return r;
}

export function linhaParaPipeline(l: Linha, ultima: string | null): OportunidadePipeline {
  const num = (v: unknown) => (v === null || v === undefined ? null : Number(v));
  return {
    id: l.id,
    stage: String(l.stage),
    tier: (l.tier as string | null) ?? null,
    score: num(l.score),
    owner_id: (l.owner_id as string | null) ?? null,
    next_action_at: (l.next_action_at as string | null) ?? null,
    proxima_accao: (l.proxima_accao as string | null) ?? null,
    fase_desde: (l.fase_desde as string | null) ?? null,
    valor: num(l.valor),
    moeda: (l.moeda as string | null) ?? null,
    created_at: String(l.created_at),
    canal: String(l.acquisition_channel),
    campanha: (l.acquisition_campaign as string | null) ?? null,
    contacto: l.contacts ? { id: l.contacts.id, nome: l.contacts.name } : null,
    organizacao: l.organisations ? { id: l.organisations.id, nome: l.organisations.name } : null,
    ultima_actividade: ultima,
  };
}

export async function lerOportunidades(
  sb: SupabaseClient,
  f: FiltrosBase,
  activo: boolean,
): Promise<{ itens: OportunidadePipeline[]; truncado: boolean } | null> {
  const colunas = activo ? `${BASE}, ${NOVAS}` : BASE;
  const principal = filtrar(sb.from('deals').select(colunas) as unknown as Consulta, f)
    .order('created_at', { ascending: false })
    .limit(TECTO + 1);
  const actividade = activo
    ? filtrar(sb.from('crm_oportunidades').select('id, ultima_actividade') as unknown as Consulta, f)
        .order('created_at', { ascending: false })
        .limit(TECTO + 1)
    : null;

  const [a, b] = await Promise.all([principal, actividade]);
  if (a.error || !Array.isArray(a.data)) return null;
  if (b && (b.error || !Array.isArray(b.data))) return null;

  const ultimas = new Map<string, string | null>();
  for (const r of (b?.data ?? []) as { id: string; ultima_actividade: string | null }[]) ultimas.set(r.id, r.ultima_actividade);

  const linhas = a.data as unknown as Linha[];
  return {
    itens: linhas.slice(0, TECTO).map((l) => linhaParaPipeline(l, ultimas.get(l.id) ?? null)),
    truncado: linhas.length > TECTO,
  };
}

/** Os nomes da equipa, para mostrar responsáveis por nome e não por UUID. */
export async function lerEquipa(sb: SupabaseClient): Promise<{ id: string; nome: string; activo: boolean }[] | null> {
  const { data, error } = await sb.from('profiles').select('id, display_name, active').order('display_name');
  if (error || !Array.isArray(data)) return null;
  return (data as { id: string; display_name: string; active: boolean }[]).map((p) => ({
    id: p.id,
    nome: p.display_name,
    activo: p.active,
  }));
}

export interface PorRever {
  readonly id: string;
  readonly tier: string;
  readonly score: number;
  readonly estado: string;
  readonly criado: string;
  readonly contacto: string | null;
}

const LIMITE_POR_REVER = 20;

/** Os diagnósticos à espera de decisão humana, os mais antigos primeiro (esperam há mais tempo). */
export async function lerPorRever(sb: SupabaseClient): Promise<{ itens: PorRever[]; total: number } | null> {
  const { data, error, count } = await sb
    .from('diagnostics')
    .select('id, tier, score, state, created_at, responses(contacts(name))', { count: 'exact' })
    .in('state', [...ESTADOS_POR_REVER])
    .order('created_at', { ascending: true })
    .limit(LIMITE_POR_REVER);
  if (error || !Array.isArray(data)) return null;
  const itens = (data as unknown as {
    id: string;
    tier: string;
    score: number;
    state: string;
    created_at: string;
    responses: { contacts: { name: string } | null } | null;
  }[]).map((d) => ({
    id: d.id,
    tier: d.tier,
    score: d.score,
    estado: d.state,
    criado: d.created_at,
    contacto: d.responses?.contacts?.name ?? null,
  }));
  return { itens, total: count ?? itens.length };
}

export interface ReuniaoProxima {
  readonly id: string;
  readonly inicio: string;
  readonly tipo: string | null;
  readonly oportunidade: { id: string; nome: string } | null;
}

/**
 * As reuniões marcadas para os próximos 7 dias. Sem a 0012 a tabela não
 * existe: lê-se como «nenhuma», porque o Cal ainda não está ligado.
 */
export async function lerProximasReunioes(sb: SupabaseClient, agora: Date): Promise<ReuniaoProxima[]> {
  const ate = new Date(agora.getTime() + 7 * 86_400_000);
  const { data, error } = await sb
    .from('reunioes')
    .select('id, inicio, tipo, deals(id, contacts(name))')
    .eq('estado', 'marcada')
    .gte('inicio', agora.toISOString())
    .lt('inicio', ate.toISOString())
    .order('inicio', { ascending: true })
    .limit(20);
  if (error || !Array.isArray(data)) return [];
  return (data as unknown as {
    id: string;
    inicio: string;
    tipo: string | null;
    deals: { id: string; contacts: { name: string } | null } | null;
  }[]).map((r) => ({
    id: r.id,
    inicio: r.inicio,
    tipo: r.tipo,
    oportunidade: r.deals ? { id: r.deals.id, nome: r.deals.contacts?.name ?? 'Sem nome' } : null,
  }));
}
