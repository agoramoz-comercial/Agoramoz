import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { FASE_OPORTUNIDADE, type FaseOportunidade } from '@/lib/admin/labels';
import { lerProposta, type Proposta } from './modelo';

/**
 * Leituras das propostas pela sessão de quem pede (RLS: toda a equipa lê).
 *
 * A 0020 é aplicada pelo fundador; o código pode chegar à produção antes.
 * Uma tabela em falta responde 42P01 (Postgres) ou PGRST205 (cache do
 * PostgREST): os ecrãs mostram «por activar» com o passo que falta, e o
 * editor continua a funcionar só no separador.
 */

export const PASSO_0020 = 'Aplicar supabase/aplicar-0020.sql no SQL Editor; a linha 32 do verificar-estado deve dizer «ok».';

export const ESTADOS_PROPOSTA = ['rascunho', 'enviada', 'aceite', 'recusada', 'arquivada'] as const;
export type EstadoProposta = (typeof ESTADOS_PROPOSTA)[number];

export const ROTULO_ESTADO: Readonly<Record<EstadoProposta, string>> = {
  rascunho: 'Rascunho',
  enviada: 'Enviada',
  aceite: 'Aceite',
  recusada: 'Recusada',
  arquivada: 'Arquivada',
};

export function tabelaEmFalta(codigo: string | undefined): boolean {
  return codigo === '42P01' || codigo === 'PGRST205' || codigo === 'PGRST202';
}

export interface PropostaLinha {
  readonly id: string;
  readonly projeto: string;
  readonly cliente: string;
  readonly estado: EstadoProposta;
  readonly moeda: string;
  readonly total: number;
  readonly versao: number;
  readonly revisao: number;
  readonly dealId: string | null;
  readonly actualizada: string;
}

export interface VersaoLinha {
  readonly versao: number;
  readonly nota: string | null;
  readonly total: number;
  readonly moeda: string;
  readonly criada: string;
  readonly autor: string | null;
  readonly comTexto: boolean;
}

export interface OportunidadeOpcao {
  readonly id: string;
  readonly rotulo: string;
}

type Resultado<T> = { readonly estado: 'ok'; readonly dados: T } | { readonly estado: 'por-activar' } | { readonly estado: 'erro' };

const COLUNAS = 'id, projeto, cliente, estado, moeda, total, versao_actual, revisao, deal_id, updated_at';

function linha(r: Record<string, unknown>): PropostaLinha {
  return {
    id: String(r.id),
    projeto: String(r.projeto),
    cliente: String(r.cliente),
    estado: (ESTADOS_PROPOSTA as readonly string[]).includes(String(r.estado)) ? (r.estado as EstadoProposta) : 'rascunho',
    moeda: String(r.moeda),
    total: Number(r.total),
    versao: Number(r.versao_actual),
    revisao: Number(r.revisao),
    dealId: (r.deal_id as string | null) ?? null,
    actualizada: String(r.updated_at),
  };
}

/** As últimas propostas, mais recentes primeiro. Uma equipa pequena: 200 chegam, e passar disso diz-se. */
export async function listarPropostas(sb: SupabaseClient): Promise<Resultado<{ itens: PropostaLinha[]; truncado: boolean }>> {
  const { data, error } = await sb.from('propostas').select(COLUNAS).order('updated_at', { ascending: false }).limit(201);
  if (error) return tabelaEmFalta(error.code) ? { estado: 'por-activar' } : { estado: 'erro' };
  const itens = (data as Record<string, unknown>[]).map(linha);
  return { estado: 'ok', dados: { itens: itens.slice(0, 200), truncado: itens.length > 200 } };
}

export interface PropostaAberta {
  readonly linha: PropostaLinha;
  readonly versoes: readonly VersaoLinha[];
  /** A versão pedida (por omissão, a actual). */
  readonly versao: number;
  readonly conteudo: Proposta | null;
  readonly textoColado: string | null;
}

/** Uma proposta, o histórico de versões e o conteúdo da versão pedida — validado de novo ao ler. */
export async function abrirProposta(sb: SupabaseClient, id: string, versaoPedida?: number): Promise<Resultado<PropostaAberta | null>> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return { estado: 'ok', dados: null };
  const p = await sb.from('propostas').select(COLUNAS).eq('id', id).maybeSingle();
  if (p.error) return tabelaEmFalta(p.error.code) ? { estado: 'por-activar' } : { estado: 'erro' };
  if (!p.data) return { estado: 'ok', dados: null };
  const l = linha(p.data as Record<string, unknown>);

  const v = await sb
    .from('propostas_versoes')
    .select('versao, nota, total, moeda, created_at, criada_por, texto_colado')
    .eq('proposta_id', id)
    .order('versao', { ascending: false });
  if (v.error || !Array.isArray(v.data)) return { estado: 'erro' };
  const brutas = v.data as Record<string, unknown>[];

  const ids = [...new Set(brutas.map((r) => r.criada_por).filter((x): x is string => typeof x === 'string'))];
  const nomes = new Map<string, string>();
  if (ids.length) {
    const pf = await sb.from('profiles').select('id, display_name').in('id', ids);
    for (const r of (pf.data ?? []) as { id: string; display_name: string }[]) nomes.set(r.id, r.display_name);
  }

  const versoes: VersaoLinha[] = brutas.map((r) => ({
    versao: Number(r.versao),
    nota: (r.nota as string | null) ?? null,
    total: Number(r.total),
    moeda: String(r.moeda),
    criada: String(r.created_at),
    autor: nomes.get(String(r.criada_por)) ?? null,
    comTexto: typeof r.texto_colado === 'string' && r.texto_colado.length > 0,
  }));

  const versao = versaoPedida && versoes.some((x) => x.versao === versaoPedida) ? versaoPedida : l.versao;
  const c = await sb.from('propostas_versoes').select('conteudo, texto_colado').eq('proposta_id', id).eq('versao', versao).maybeSingle();
  if (c.error) return { estado: 'erro' };
  const dados = c.data as { conteudo: unknown; texto_colado: string | null } | null;
  return {
    estado: 'ok',
    dados: { linha: l, versoes, versao, conteudo: dados ? lerProposta(dados.conteudo) : null, textoColado: dados?.texto_colado ?? null },
  };
}

/** As oportunidades abertas, para ligar a proposta (e a que já está ligada, mesmo que fechada). */
export async function oportunidadesParaLigar(sb: SupabaseClient, incluir?: string | null): Promise<OportunidadeOpcao[]> {
  const { data, error } = await sb
    .from('deals')
    .select('id, stage, created_at, contacts(name), organisations(name)')
    .order('created_at', { ascending: false })
    .limit(300);
  if (error || !Array.isArray(data)) return [];
  type D = { id: string; stage: string; contacts: { name: string } | null; organisations: { name: string } | null };
  return (data as unknown as D[])
    .filter((d) => !['ganho', 'perdido'].includes(d.stage) || d.id === incluir)
    .map((d) => {
      const quem = d.organisations?.name ?? d.contacts?.name ?? 'Sem nome';
      const fase = FASE_OPORTUNIDADE[d.stage as FaseOportunidade]?.texto ?? d.stage;
      return { id: d.id, rotulo: `${quem} · ${fase}` };
    });
}
