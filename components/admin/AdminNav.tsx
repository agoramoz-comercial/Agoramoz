'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Briefcase,
  Building2,
  ClipboardCheck,
  Inbox,
  LayoutDashboard,
  ListChecks,
  Radar,
  UserCog,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';

/**
 * A navegação é o único componente de cliente do admin, e existe por uma razão
 * concreta: `aria-current="page"` precisa de saber onde estamos, e um layout
 * de servidor não sabe o caminho. O resto do admin renderiza sem JavaScript.
 *
 * O ícone viaja como chave e não como componente: uma função não atravessa a
 * fronteira servidor → cliente.
 */

const ICONES = {
  painel: LayoutDashboard,
  diagnosticos: ClipboardCheck,
  oportunidades: Briefcase,
  contactos: Users,
  organizacoes: Building2,
  aquisicao: Radar,
  inqueritos: ListChecks,
  fila: Inbox,
  equipa: UserCog,
} satisfies Record<string, LucideIcon>;

export interface Entrada {
  readonly href: string;
  readonly texto: string;
  readonly icone: keyof typeof ICONES;
}

export function AdminNav({ entradas }: { entradas: readonly Entrada[] }) {
  const caminho = usePathname();
  const nav = useRef<HTMLElement>(null);

  // No telemóvel a navegação é uma linha com scroll: traz a secção activa
  // para dentro do ecrã. `nearest` nos dois eixos não mexe na página.
  useEffect(() => {
    nav.current
      ?.querySelector('[aria-current="page"]')
      ?.scrollIntoView({ inline: 'nearest', block: 'nearest' });
  }, [caminho]);

  return (
    <nav
      ref={nav}
      aria-label="Secções da administração"
      className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0 lg:pb-0"
    >
      {entradas.map((e) => {
        const activo = e.href === '/admin' ? caminho === '/admin' : caminho.startsWith(e.href);
        const Icone = ICONES[e.icone];
        return (
          <Link
            key={e.href}
            href={e.href}
            aria-current={activo ? 'page' : undefined}
            className={cn(
              'flex min-h-11 shrink-0 items-center gap-3 rounded-[--radius-xs] px-3 text-sm whitespace-nowrap',
              activo
                ? 'bg-[color:var(--on-surface)] font-medium text-[color:var(--surface)]'
                : 'text-[color:var(--muted)] hover:bg-[color:var(--surface-raised)] hover:text-[color:var(--on-surface)]',
            )}
          >
            <Icone aria-hidden className="size-4 shrink-0" />
            {e.texto}
          </Link>
        );
      })}
    </nav>
  );
}
