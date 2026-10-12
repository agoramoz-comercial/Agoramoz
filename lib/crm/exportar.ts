import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { log } from '@/lib/log/logger';
import { nomeFicheiro } from './csv';

/**
 * O fim comum das exportações do CRM: primeiro a auditoria, depois o ficheiro.
 * Sem registo (0019 por aplicar, papel sem direito, base em baixo) não sai
 * nada — um ficheiro com dados pessoais nunca sai sem rasto.
 */

export const texto = (status: number, corpo: string) =>
  new Response(corpo, {
    status,
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
  });

export async function entregarComAuditoria(
  sb: SupabaseClient,
  lista: 'oportunidades' | 'contactos',
  linhas: number,
  filtros: Record<string, string | boolean>,
  csv: string,
): Promise<Response> {
  const { error } = await sb.rpc('registar_exportacao_crm', { p_lista: lista, p_linhas: linhas, p_filtros: filtros });
  if (error) {
    log.error('crm.exportacao_falhou', { entityType: lista, errorCode: error.code ?? 'auditoria', outcome: 'failed' });
    if (error.code === '42501') return texto(403, 'Sem permissão para exportar.');
    if (error.code === '42883' || error.code === 'PGRST202') {
      return texto(409, 'Exportação por activar: falta aplicar a migração 0019 (parte 3). Nada foi exportado.');
    }
    return texto(503, 'Não foi possível registar a exportação. Nada foi exportado; tente de novo.');
  }
  return new Response(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${nomeFicheiro(lista, new Date())}"`,
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
