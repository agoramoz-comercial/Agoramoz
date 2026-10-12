import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

/**
 * Trilho de navegação das fichas do admin: onde estou e por onde vim.
 * O último elemento é a página actual (`aria-current`), sem ligação.
 */
export function Trilho({ itens }: { itens: readonly { texto: string; href?: string }[] }) {
  return (
    <nav aria-label="Trilho" className="mb-4">
      <ol role="list" className="flex flex-wrap items-center gap-1 text-xs text-[color:var(--muted)]">
        {itens.map((i, n) => {
          const ultimo = n === itens.length - 1;
          return (
            <li key={`${i.texto}-${n}`} className="flex items-center gap-1">
              {i.href && !ultimo ? (
                <Link href={i.href} className="underline-offset-4 hover:text-[color:var(--on-surface)] hover:underline">
                  {i.texto}
                </Link>
              ) : (
                <span aria-current={ultimo ? 'page' : undefined} className={ultimo ? 'text-[color:var(--on-surface)]' : undefined}>
                  {i.texto}
                </span>
              )}
              {!ultimo && <ChevronRight aria-hidden className="size-3" />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
