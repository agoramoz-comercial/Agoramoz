import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * A 0019 é aplicada pelo fundador; o código pode chegar à produção antes. Uma
 * coluna em falta responde 42703 (Postgres) ou PGRST204 (cache do PostgREST).
 * Nesse caso os ecrãs mostram «por activar» com o passo que falta, em vez de
 * partir ou de inventar zeros.
 */
export function colunaEmFalta(codigo: string | undefined): boolean {
  return codigo === '42703' || codigo === 'PGRST204';
}

export const PASSO_0019 =
  'Aplicar aplicar-0019-parte1.sql e parte2.sql no SQL Editor; a linha 31 do verificar-estado deve dizer «ok».';

/** `true` se a 0019 está aplicada; `null` se a leitura falhou por outra razão. */
export async function crmOperacional(sb: SupabaseClient): Promise<boolean | null> {
  const { error } = await sb.from('deals').select('proxima_accao, revisao').limit(1);
  if (!error) return true;
  return colunaEmFalta(error.code) ? false : null;
}
