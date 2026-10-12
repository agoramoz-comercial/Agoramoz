import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createMemoryRateLimiter } from '@/lib/http/rate-limit';
import { log } from '@/lib/log/logger';
import { nomeFicheiro } from './csv';

/**
 * O fim comum das exportações do CRM: primeiro a auditoria, depois o ficheiro.
 * Sem registo (0019 por aplicar, papel sem direito, base em baixo) a
 * exportação não sai.
 *
 * A auditoria é de detecção, não de prevenção: regista quem exportou pelo
 * admin. Quem tem sessão de equipa lê as mesmas tabelas pela RLS por outras
 * vias; restringir isso seria uma decisão de RLS, não deste ficheiro.
 */

/** Uma exportação por pessoa a cada 10 s, até 20 por hora (por instância). */
const curto = createMemoryRateLimiter({ max: 1, windowMs: 10_000 });
const hora = createMemoryRateLimiter({ max: 20, windowMs: 3_600_000 });

/**
 * Recusa o que não veio de um clique no próprio admin. É um GET que escreve
 * na auditoria: um link noutro site podia pô-lo a correr com a sessão de quem
 * passa (SameSite=Lax deixa). `none` é a barra de endereço; sem cabeçalho,
 * um browser antigo — aceita-se.
 */
export function recusarPedido(pedido: Request, utilizador: string): Response | null {
  const origem = pedido.headers.get('sec-fetch-site');
  if (origem && origem !== 'same-origin' && origem !== 'none') return texto(403, 'Exportação só a partir do admin.');
  if (!curto.check(utilizador).allowed || !hora.check(utilizador).allowed) {
    return texto(429, 'Demasiadas exportações seguidas. Espere um pouco e tente de novo.');
  }
  return null;
}

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
