import { createSessionClient } from '@/lib/auth/client';
import { currentSession, podeEscrever } from '@/lib/auth/session';
import { recusarPedido, texto } from '@/lib/crm/exportar';
import { csvFacturacao, filtrar, lerFiltro, nomeFicheiroFacturacao } from '@/lib/erp/facturacao';
import { lerFacturacao } from '@/lib/erp/facturacao-leitura';
import { log } from '@/lib/log/logger';

/**
 * A fila «A facturar» em CSV, para o contabilista (D-48), com o filtro do
 * ecrã. Só admin e comercial; registada na auditoria antes de sair.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(pedido: Request) {
  const sessao = await currentSession();
  if (!sessao) return texto(404, 'Não encontrado.');
  if (!podeEscrever(sessao.papel)) return texto(403, 'O seu papel não permite exportar.');
  const recusa = recusarPedido(pedido, sessao.userId);
  if (recusa) return recusa;

  const filtro = lerFiltro(new URL(pedido.url).searchParams.get('estado') ?? undefined);
  const sb = await createSessionClient();
  const lido = await lerFacturacao(sb);
  if (lido.estado !== 'ok') return texto(409, 'Exportação por activar: falta aplicar a migração 0019. Nada foi exportado.');
  const linhas = filtrar(lido.linhas, filtro);

  const { error } = await sb.rpc('registar_exportacao_facturacao', { p_linhas: linhas.length, p_filtros: { estado: filtro } });
  if (error) {
    log.error('facturacao.exportacao_falhou', { errorCode: error.code ?? 'auditoria', outcome: 'failed' });
    if (error.code === '42501') return texto(403, 'Sem permissão para exportar.');
    if (error.code === '42883' || error.code === 'PGRST202')
      return texto(409, 'Exportação por activar: falta aplicar a migração 0021. Nada foi exportado.');
    return texto(503, 'Não foi possível registar a exportação. Nada foi exportado; tente de novo.');
  }
  return new Response(csvFacturacao(linhas), {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${nomeFicheiroFacturacao(new Date())}"`,
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
