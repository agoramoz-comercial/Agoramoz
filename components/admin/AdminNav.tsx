'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils/cn';

/**
 * A navegação é o único componente de cliente do admin, e existe por uma razão
 * concreta: `aria-current="page"` precisa de saber onde estamos, e um layout
 * de servidor não sabe o caminho. O resto do admin renderiza sem JavaScript.
 */

export interface Entrada {
  readonly href: string;
  readonly texto: string;
}

export function AdminNav({ entradas }: { entradas: readonly Entrada[] }) {
  const caminho = usePathname();

  return (
    <nav aria-label="Secções da administração" className="flex flex-col gap-1">
      {entradas.map((e) => {
        const activo = e.href === '/admin' ? caminho === '/admin' : caminho.startsWith(e.href);
        return (
          <Link
            key={e.href}
            href={e.href}
            aria-current={activo ? 'page' : undefined}
            className={cn(
              'flex min-h-11 items-center rounded-[--radius-xs] px-3 text-sm',
              'hover:bg-[color:var(--surface-raised)]',
              activo
                ? 'bg-[color:var(--surface-raised)] font-medium text-[color:var(--on-surface)]'
                : 'text-[color:var(--muted)]',
            )}
          >
            {e.texto}
          </Link>
        );
      })}
    </nav>
  );
}
