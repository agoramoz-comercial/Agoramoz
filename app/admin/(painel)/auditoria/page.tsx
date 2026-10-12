import { AuditoriaVista } from '@/components/admin/AuditoriaVista';
import { AdminHeading } from '@/components/admin/primitives';
import { lerFiltrosAuditoria, type LinhaAuditoria } from '@/lib/admin/auditoria';
import { fatiar, intervalo } from '@/lib/admin/paginacao';
import { createSessionClient } from '@/lib/auth/client';
import { requireRole } from '@/lib/auth/session';
import { lerEquipa } from '@/lib/crm/leitura';

export const metadata = { title: 'Auditoria' };

/** O dia seguinte (AAAA-MM-DD), para o «até» incluir o dia inteiro. */
function diaSeguinte(dia: string): string {
  const d = new Date(`${dia}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

/**
 * Só administradores. Lê o `audit_log` pela sessão: a RLS mostra à equipa
 * tudo menos os espaços privados (CEnO e Gabinete), que nem aqui aparecem.
 */
export default async function AuditoriaPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireRole(['admin']);
  const p = await searchParams;
  const f = lerFiltrosAuditoria(p);
  const { pagina, de, ate } = intervalo(p.pagina);
  const sb = await createSessionClient();

  let q = sb
    .from('audit_log')
    .select('id, actor_id, actor_type, action, entity_type, entity_id, before, after, occurred_at')
    .order('occurred_at', { ascending: false })
    .range(de, ate);
  if (f.entidade) q = q.eq('entity_type', f.entidade);
  if (f.pessoa) q = q.eq('actor_id', f.pessoa);
  if (f.id) q = q.eq('entity_id', f.id);
  // Dias de Maputo (UTC+2 todo o ano).
  if (f.desde) q = q.gte('occurred_at', `${f.desde}T00:00:00+02:00`);
  if (f.ate) q = q.lt('occurred_at', `${diaSeguinte(f.ate)}T00:00:00+02:00`);

  const [{ data, error }, equipa] = await Promise.all([q, lerEquipa(sb)]);
  const { linhas, haMais } = fatiar(data as LinhaAuditoria[] | null);

  return (
    <>
      <AdminHeading
        titulo="Auditoria"
        descricao="Cada alteração feita no admin: quem, o quê, quando e o que mudou. Os espaços privados (CEnO e Gabinete) não aparecem aqui."
      />
      {error ? (
        <p role="alert" className="mb-6 text-sm">
          Não foi possível ler a auditoria. Recarregue a página.
        </p>
      ) : null}
      <AuditoriaVista
        linhas={linhas}
        nomes={new Map((equipa ?? []).map((e) => [e.id, e.nome]))}
        equipa={equipa ?? []}
        filtros={f}
        pagina={pagina}
        haMais={haMais}
      />
    </>
  );
}
