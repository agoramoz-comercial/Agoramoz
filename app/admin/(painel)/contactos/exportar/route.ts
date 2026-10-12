import { createSessionClient } from '@/lib/auth/client';
import { currentSession, podeEscrever } from '@/lib/auth/session';
import { csvContactos, type ContactoExportado } from '@/lib/crm/csv';
import { entregarComAuditoria, recusarPedido, texto } from '@/lib/crm/exportar';
import { termoContactos } from '@/lib/crm/pesquisa-modelo';

/**
 * Os contactos em CSV, com a mesma procura da lista (`?q=`). Dados pessoais:
 * só admin e comercial, lido pela sessão (RLS), registado na auditoria antes
 * de sair — com «houve procura» e nunca o termo, que pode ser um nome.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PAGINA = 1000;
const TECTO = 20_000;

interface Linha {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: string | null;
  created_at: string;
  organisations: { name: string } | null;
}

export async function GET(pedido: Request) {
  const sessao = await currentSession();
  if (!sessao) return texto(404, 'Não encontrado.');
  if (!podeEscrever(sessao.papel)) return texto(403, 'O seu papel não permite exportar dados de contacto.');
  const recusa = recusarPedido(pedido, sessao.userId);
  if (recusa) return recusa;

  // A mesma limpeza da lista, para «esta procura» exportar o que o ecrã mostra.
  const procura = termoContactos(new URL(pedido.url).searchParams.get('q'));
  const sb = await createSessionClient();

  const todas: Linha[] = [];
  for (let de = 0; ; de += PAGINA) {
    let q = sb
      .from('contacts')
      .select('id, name, email, phone, role, created_at, organisations(name)')
      .order('created_at', { ascending: false })
      // Desempate estável: com datas iguais (importações), as páginas não saltam nem repetem linhas.
      .order('id', { ascending: true })
      .range(de, de + PAGINA - 1);
    if (procura) q = q.or(`name.ilike.%${procura}%,email.ilike.%${procura}%`);
    const { data, error } = await q;
    if (error) return texto(503, 'Não foi possível ler os contactos.');
    const pagina = (data ?? []) as unknown as Linha[];
    todas.push(...pagina);
    // Pára na página vazia, não na curta: `max_rows` pode estar abaixo de PAGINA.
    if (pagina.length === 0) break;
    if (todas.length > TECTO) return texto(413, `Mais de ${TECTO} contactos: use a procura para exportar por partes.`);
  }

  const itens: ContactoExportado[] = todas.map((c) => ({
    id: c.id,
    nome: c.name,
    email: c.email,
    telefone: c.phone,
    papel: c.role,
    organizacao: c.organisations?.name ?? null,
    criado: c.created_at,
  }));
  return entregarComAuditoria(sb, 'contactos', itens.length, { procura: Boolean(procura) }, csvContactos(itens));
}
