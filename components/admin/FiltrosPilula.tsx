import Link from 'next/link';
import { cn } from '@/lib/utils/cn';

/**
 * LIST-PIL-01 — Filtros de uma lista em pílulas com a contagem ao lado
 * (estudo do painel, 25/11/2026). São ligações GET: o estado da vista vive
 * no URL, partilhável e sem JavaScript. A contagem `null` (leitura falhou)
 * mostra só o rótulo — nunca um zero que não foi contado.
 */
export interface Pilula {
  readonly rotulo: string;
  readonly href: string;
  readonly contagem?: number | null;
  readonly activa: boolean;
}

export function FiltrosPilula({ rotulo, itens }: { rotulo: string; itens: readonly Pilula[] }) {
  return (
    <nav aria-label={rotulo} className="mb-6">
      <ul role="list" className="flex flex-wrap gap-2">
        {itens.map((p) => (
          <li key={p.href}>
            <Link
              href={p.href}
              aria-current={p.activa ? 'true' : undefined}
              className={cn(
                'inline-flex min-h-10 items-center gap-2 rounded-full border px-4 text-sm whitespace-nowrap',
                p.activa
                  ? 'border-[#e9a35c] bg-[#e9a35c] font-medium text-[#0b0a09]'
                  : 'border-[color:var(--border)] bg-[color:var(--surface-raised)] hover:border-[#0b0a09]/40',
              )}
            >
              {p.rotulo}
              {typeof p.contagem === 'number' ? (
                <span
                  className={cn(
                    'inline-flex min-w-6 items-center justify-center rounded-full px-1.5 text-xs tabular-nums',
                    p.activa ? 'bg-[#0b0a09] text-[#efe8da]' : 'bg-[color:var(--surface)] text-[color:var(--muted)]',
                  )}
                >
                  {p.contagem.toLocaleString('pt-PT')}
                </span>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
