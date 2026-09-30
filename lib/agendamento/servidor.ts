import type { SupabaseClient } from '@supabase/supabase-js';
import { gerarRef, hashRef, type Reuniao } from './cal';

/**
 * As duas escritas do agendamento, pela chave de serviço. Como em
 * `ingestDiagnosticResponse`, um erro propaga o CÓDIGO do Postgres e nunca a
 * mensagem, que pode trazer fragmentos do que foi enviado.
 */

function falha(onde: string, codigo: string | undefined): Error {
  const e = new Error(`${onde} falhou (${codigo ?? 'sem código'})`);
  (e as Error & { code?: string }).code = codigo;
  return e;
}

/**
 * Cria a intenção de marcação de uma oportunidade e devolve o `ref` em claro —
 * que só viaja no link de marcação. A base fica só com o hash.
 */
export async function criarIntencao(cliente: SupabaseClient, dealId: string): Promise<string> {
  const ref = gerarRef();
  const { error } = await cliente.from('reunioes_intencoes').insert({ ref_hash: hashRef(ref), deal_id: dealId });
  if (error) throw falha('Intenção de marcação', error.code);
  return ref;
}

export interface ResultadoReuniao {
  readonly ligada: boolean;
  readonly mudou: boolean;
  readonly estado: string;
  /** `sem-ref`, `ref-desconhecido` (inclui expirado), `ref`, `anterior` ou `reuniao`. */
  readonly motivo: string;
}

/** Uma entrega do Cal, já autenticada e lida, na transação `registar_reuniao`. */
export async function registarReuniao(cliente: SupabaseClient, r: Reuniao): Promise<ResultadoReuniao> {
  const { data, error } = await cliente.rpc('registar_reuniao', {
    p_evento: r.evento,
    p_cal_uid: r.uid,
    p_ref_hash: r.ref ? hashRef(r.ref) : null,
    p_inicio: r.inicio,
    p_fim: r.fim,
    p_tipo: r.tipo,
    p_uid_anterior: r.uidAnterior,
  });
  if (error) throw falha('Registo de reunião', error.code);
  return data as ResultadoReuniao;
}
