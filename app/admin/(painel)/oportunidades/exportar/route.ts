import { createSessionClient } from '@/lib/auth/client';
import { currentSession, podeEscrever } from '@/lib/auth/session';
import { crmOperacional } from '@/lib/crm/activacao';
import { csvOportunidades } from '@/lib/crm/csv';
import { entregarComAuditoria, recusarPedido, texto } from '@/lib/crm/exportar';
import { lerEquipa, lerOportunidades } from '@/lib/crm/leitura';
import { aplicarVista, lerFiltros, ordenar } from '@/lib/crm/pipeline';

/**
 * O pipeline em CSV, com exactamente a vista, os filtros e a ordem do ecrã de
 * onde se carregou. Só admin e comercial; lido pela sessão (RLS) e registado
 * na auditoria antes de sair. Acima do tecto da leitura recusa-se, em vez de
 * entregar um ficheiro incompleto com cara de completo.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(pedido: Request) {
  const sessao = await currentSession();
  if (!sessao) return texto(404, 'Não encontrado.');
  if (!podeEscrever(sessao.papel)) return texto(403, 'O seu papel não permite exportar.');
  const recusa = recusarPedido(pedido, sessao.userId);
  if (recusa) return recusa;

  const f = lerFiltros(Object.fromEntries(new URL(pedido.url).searchParams));
  const sb = await createSessionClient();
  const activo = (await crmOperacional(sb)) === true;
  if (!activo) return texto(409, 'Exportação por activar: falta aplicar a migração 0019. Nada foi exportado.');

  const [lido, equipa] = await Promise.all([
    lerOportunidades(sb, { fase: f.fase, canal: f.canal, campanha: f.campanha }, true),
    lerEquipa(sb),
  ]);
  if (!lido) return texto(503, 'Não foi possível ler as oportunidades.');
  if (lido.truncado) return texto(413, 'Demasiadas oportunidades com estes filtros. Restrinja por fase, canal ou campanha.');

  const itens = ordenar(aplicarVista(lido.itens, f.vista, sessao.userId, new Date()), f.ordem, f.sentido);
  const csv = csvOportunidades(itens, new Map((equipa ?? []).map((e) => [e.id, e.nome])));
  const filtros: Record<string, string> = { vista: f.vista };
  if (f.fase) filtros.fase = f.fase;
  if (f.canal) filtros.canal = f.canal;
  if (f.campanha) filtros.campanha = f.campanha;
  return entregarComAuditoria(sb, 'oportunidades', itens.length, filtros, csv);
}
