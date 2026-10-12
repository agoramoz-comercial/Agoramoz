import Link from 'next/link';
import { EmptyState } from '@/components/admin/primitives';
import { CAMPO, ROTULO } from '@/components/admin/crm/partes';
import {
  ENTIDADE,
  ENTIDADES,
  ligacaoDe,
  mudancas,
  quemAgiu,
  rotuloAccao,
  type FiltrosAuditoria,
  type LinhaAuditoria,
} from '@/lib/admin/auditoria';
import { formatarQuando } from '@/lib/crm/cronologia';
import { cn } from '@/lib/utils/cn';

/**
 * A auditoria lida por pessoas: quem fez o quê, a que objecto, quando, e o que
 * mudou. Filtros no URL (objecto, pessoa, período) e paginação sem contagem.
 * Os espaços privados (CEnO, Gabinete) nunca aparecem — a RLS esconde-os.
 */
export function AuditoriaVista({
  linhas,
  nomes,
  equipa,
  filtros,
  pagina,
  haMais,
}: {
  linhas: readonly LinhaAuditoria[];
  nomes: ReadonlyMap<string, string>;
  equipa: readonly { id: string; nome: string }[];
  filtros: FiltrosAuditoria;
  pagina: number;
  haMais: boolean;
}) {
  const url = (p: number) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(filtros)) if (v) q.set(k, v);
    if (p > 1) q.set('pagina', String(p));
    const s = q.toString();
    return s ? `/admin/auditoria?${s}` : '/admin/auditoria';
  };
  const algum = Object.values(filtros).some(Boolean);

  return (
    <>
      <form method="get" className="mb-6 flex flex-wrap items-end gap-3">
        {filtros.id ? <input type="hidden" name="id" value={filtros.id} /> : null}
        <label className="flex flex-col gap-1">
          <span className={ROTULO}>Objecto</span>
          <select name="entidade" defaultValue={filtros.entidade ?? ''} className={cn(CAMPO, 'w-auto')}>
            <option value="">Todos</option>
            {ENTIDADES.map((e) => (
              <option key={e} value={e}>
                {ENTIDADE[e]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className={ROTULO}>Pessoa</span>
          <select name="pessoa" defaultValue={filtros.pessoa ?? ''} className={cn(CAMPO, 'w-auto')}>
            <option value="">Todas</option>
            {equipa.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className={ROTULO}>Desde</span>
          <input type="date" name="desde" defaultValue={filtros.desde ?? ''} className={cn(CAMPO, 'w-auto')} />
        </label>
        <label className="flex flex-col gap-1">
          <span className={ROTULO}>Até</span>
          <input type="date" name="ate" defaultValue={filtros.ate ?? ''} className={cn(CAMPO, 'w-auto')} />
        </label>
        <button type="submit" className="min-h-11 border border-[color:var(--border)] px-4 text-sm hover:bg-[color:var(--surface-raised)]">
          Filtrar
        </button>
        {algum ? (
          <Link href="/admin/auditoria" className="min-h-11 py-3 text-sm underline">
            Limpar filtros
          </Link>
        ) : null}
      </form>
      {filtros.id ? <p className="mb-4 text-sm text-[color:var(--muted)]">Só os registos de um objecto.</p> : null}

      {linhas.length === 0 ? (
        <EmptyState titulo="Nenhum registo com estes filtros." />
      ) : (
        <div className="relative overflow-x-auto border border-[color:var(--border)]">
          <table className="w-full min-w-[52rem] border-collapse text-sm">
            <caption className="sr-only">Registos de auditoria, do mais recente para o mais antigo</caption>
            <thead>
              <tr className="border-b border-[color:var(--border)] bg-[color:var(--surface-raised)]">
                {['Quando', 'Quem', 'Acção', 'Objecto', 'O que mudou'].map((t) => (
                  <th key={t} scope="col" className={cn(ROTULO, 'px-3 py-2 text-left')}>
                    {t}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {linhas.map((l) => {
                const href = ligacaoDe(l.entity_type, l.entity_id);
                const m = mudancas(l.before, l.after);
                return (
                  <tr key={l.id} className="border-b border-[color:var(--hairline)] align-top last:border-b-0">
                    <td className="px-3 py-2.5 whitespace-nowrap tabular-nums">
                      <time dateTime={l.occurred_at}>{formatarQuando(l.occurred_at)}</time>
                    </td>
                    <td className="px-3 py-2.5">{quemAgiu(l, nomes)}</td>
                    <td className="px-3 py-2.5">{rotuloAccao(l.action)}</td>
                    <td className="px-3 py-2.5">
                      {href ? (
                        <Link href={href} className="underline">
                          {ENTIDADE[l.entity_type] ?? l.entity_type}
                        </Link>
                      ) : (
                        <span>
                          {ENTIDADE[l.entity_type] ?? l.entity_type}
                          {l.entity_type === 'crm_lista' ? ` · ${l.entity_id}` : ''}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-xs">
                      {m.length === 0 ? (
                        <span className="text-[color:var(--muted)]">—</span>
                      ) : (
                        <ul role="list" className="flex flex-col gap-0.5">
                          {m.map((x) => (
                            <li key={x.campo} className="break-words">
                              <span className="text-[color:var(--muted)]">{x.campo}:</span> {x.antes} → {x.depois}
                            </li>
                          ))}
                        </ul>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {pagina > 1 || haMais ? (
        <nav className="mt-6 flex items-center justify-between" aria-label="Paginação">
          {pagina > 1 ? (
            <Link href={url(pagina - 1)} className="min-h-11 py-3 text-sm underline">
              ← Mais recentes
            </Link>
          ) : (
            <span />
          )}
          <span className={ROTULO}>Página {pagina}</span>
          {haMais ? (
            <Link href={url(pagina + 1)} className="min-h-11 py-3 text-sm underline">
              Mais antigos →
            </Link>
          ) : (
            <span />
          )}
        </nav>
      ) : null}
    </>
  );
}
