import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { lerEquipa } from '@/lib/crm/leitura';
import type { Factura, LinhaFacturacao } from './facturacao';

/**
 * Leitura da fila «A facturar» pela sessão de quem pede (RLS da equipa).
 *
 * As migrações são aplicadas pelo fundador e o código pode chegar antes:
 * - sem a 0019, as oportunidades não têm valor nem data de ganho: «por activar»;
 * - sem a 0021, a fila mostra-se, mas registar facturas fica por activar.
 */

export const PASSO_0021 = 'Aplicar supabase/aplicar-0021.sql no SQL Editor; a linha 33 do verificar-estado deve dizer «ok».';
const TECTO = 1000;

const emFalta = (codigo: string | undefined) => codigo === '42P01' || codigo === 'PGRST205' || codigo === '42703' || codigo === 'PGRST204';

export type LeituraFacturacao =
  | { readonly estado: 'ok'; readonly linhas: LinhaFacturacao[]; readonly registoActivo: boolean; readonly truncado: boolean }
  | { readonly estado: 'por-activar-0019' }
  | { readonly estado: 'erro' };

type Negocio = {
  id: string;
  fase_desde: string;
  valor: number | string | null;
  moeda: string | null;
  owner_id: string | null;
  contacts: { name: string } | null;
  organisations: { name: string } | null;
};

type LinhaFactura = {
  deal_id: string;
  estado: 'facturada' | 'anulada';
  numero_factura: string;
  data_factura: string;
  valor: number | string;
  moeda: string;
  nota: string | null;
  motivo_anulacao: string | null;
  revisao: number;
};

export async function lerFacturacao(sb: SupabaseClient): Promise<LeituraFacturacao> {
  const d = await sb
    .from('deals')
    .select('id, fase_desde, valor, moeda, owner_id, contacts(name), organisations(name)')
    .eq('stage', 'ganho')
    .order('fase_desde', { ascending: false })
    .limit(TECTO + 1);
  if (d.error) return emFalta(d.error.code) ? { estado: 'por-activar-0019' } : { estado: 'erro' };
  const negocios = (d.data ?? []) as unknown as Negocio[];

  const f = await sb
    .from('facturacao')
    .select('deal_id, estado, numero_factura, data_factura, valor, moeda, nota, motivo_anulacao, revisao')
    .limit(10_000);
  const registoActivo = !f.error;
  if (f.error && !emFalta(f.error.code)) return { estado: 'erro' };
  const facturas = new Map<string, Factura>();
  for (const r of (f.data ?? []) as LinhaFactura[]) {
    facturas.set(r.deal_id, {
      estado: r.estado,
      numero: r.numero_factura,
      data: r.data_factura,
      valor: Number(r.valor),
      moeda: r.moeda,
      nota: r.nota,
      motivoAnulacao: r.motivo_anulacao,
      revisao: r.revisao,
    });
  }

  const equipa = new Map(((await lerEquipa(sb)) ?? []).map((e) => [e.id, e.nome]));
  const linhas: LinhaFacturacao[] = negocios.slice(0, TECTO).map((n) => ({
    dealId: n.id,
    cliente: n.organisations?.name ?? n.contacts?.name ?? 'Sem nome',
    contacto: n.organisations ? (n.contacts?.name ?? null) : null,
    responsavel: n.owner_id ? (equipa.get(n.owner_id) ?? null) : null,
    ganhaEm: n.fase_desde,
    valor: n.valor === null ? null : Number(n.valor),
    moeda: n.moeda,
    factura: facturas.get(n.id) ?? null,
  }));
  return { estado: 'ok', linhas, registoActivo, truncado: negocios.length > TECTO };
}
