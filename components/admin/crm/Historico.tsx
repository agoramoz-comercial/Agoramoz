import Link from 'next/link';
import { formatarQuando } from '@/lib/crm/cronologia';
import { mudancas, quemAgiu, rotuloAccao, type LinhaAuditoria } from '@/lib/admin/auditoria';

/**
 * O histórico de alterações de um objecto, lido do `audit_log`: quem fez o
 * quê, quando, e o que mudou. Fechado por omissão — é a prova, não o trabalho
 * do dia. Os administradores têm a ligação para a auditoria completa.
 */
export function Historico({
  entradas,
  nomes,
  auditoria,
}: {
  entradas: readonly LinhaAuditoria[];
  nomes: ReadonlyMap<string, string>;
  /** Ligação para `/admin/auditoria` filtrada por este objecto; só para admin. */
  auditoria?: string;
}) {
  return (
    <details className="border border-[color:var(--border)]">
      <summary className="flex min-h-11 cursor-pointer items-center justify-between gap-3 px-4 text-sm font-medium">
        Histórico de alterações
        <span className="tabular-nums text-[color:var(--muted)]">{entradas.length}</span>
      </summary>
      {entradas.length === 0 ? (
        <p className="border-t border-[color:var(--border)] px-4 py-4 text-sm text-[color:var(--muted)]">Sem alterações registadas.</p>
      ) : (
        <ol role="list" className="divide-y divide-[color:var(--hairline)] border-t border-[color:var(--border)]">
          {entradas.map((e) => {
            const m = mudancas(e.before, e.after);
            return (
              <li key={e.id} className="px-4 py-3 text-sm">
                <p className="font-medium">{rotuloAccao(e.action)}</p>
                <p className="text-xs text-[color:var(--muted)]">
                  <time dateTime={e.occurred_at} className="tabular-nums">
                    {formatarQuando(e.occurred_at)}
                  </time>{' '}
                  · {quemAgiu(e, nomes)}
                </p>
                {m.length > 0 ? (
                  <ul role="list" className="mt-1.5 flex flex-col gap-0.5 text-xs">
                    {m.map((x) => (
                      <li key={x.campo} className="break-words">
                        <span className="text-[color:var(--muted)]">{x.campo}:</span> {x.antes} → {x.depois}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            );
          })}
        </ol>
      )}
      {auditoria ? (
        <p className="border-t border-[color:var(--border)] px-4 py-3 text-sm">
          <Link href={auditoria} className="underline">
            Ver na auditoria
          </Link>
        </p>
      ) : null}
    </details>
  );
}
