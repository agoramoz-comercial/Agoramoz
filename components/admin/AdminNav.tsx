'use client';

import { useEffect, useId, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Briefcase,
  Building2,
  ChevronDown,
  ClipboardCheck,
  History,
  Inbox,
  KeyRound,
  Landmark,
  LayoutDashboard,
  ListChecks,
  Newspaper,
  Radar,
  Sun,
  UserCog,
  Users,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';

/**
 * A navegação é um componente de cliente por duas razões concretas:
 * `aria-current="page"` precisa de saber onde estamos (um layout de servidor
 * não sabe o caminho) e, no telemóvel, a lista abre e fecha como gaveta.
 *
 * O ícone viaja como chave e não como componente: uma função não atravessa a
 * fronteira servidor → cliente.
 */

const ICONES = {
  hoje: Sun,
  painel: LayoutDashboard,
  diagnosticos: ClipboardCheck,
  oportunidades: Briefcase,
  contactos: Users,
  organizacoes: Building2,
  aquisicao: Radar,
  inqueritos: ListChecks,
  news: Newspaper,
  fila: Inbox,
  equipa: UserCog,
  auditoria: History,
  energia: Zap,
  gabinete: Landmark,
  conta: KeyRound,
} satisfies Record<string, LucideIcon>;

export interface Entrada {
  readonly href: string;
  readonly texto: string;
  readonly icone: keyof typeof ICONES;
}

export interface GrupoNav {
  readonly titulo: string;
  readonly entradas: readonly Entrada[];
}

/** `/admin` só é a página activa quando é exactamente ela; as outras contam os filhos. */
export function estaActiva(href: string, caminho: string): boolean {
  if (href === '/admin') return caminho === '/admin';
  return caminho === href || caminho.startsWith(`${href}/`);
}

export function AdminNav({ grupos }: { grupos: readonly GrupoNav[] }) {
  const caminho = usePathname();
  const [aberta, setAberta] = useState(false);
  const [vistoEm, setVistoEm] = useState(caminho);
  const idLista = useId();

  // Ao mudar de página, a gaveta fecha-se: ficar aberta tapava o ecrã novo.
  // Ajuste durante a renderização (padrão do React) em vez de um efeito.
  if (vistoEm !== caminho) {
    setVistoEm(caminho);
    setAberta(false);
  }

  useEffect(() => {
    if (!aberta) return;
    function fechar(e: KeyboardEvent) {
      if (e.key === 'Escape') setAberta(false);
    }
    document.addEventListener('keydown', fechar);
    return () => document.removeEventListener('keydown', fechar);
  }, [aberta]);

  const actual = grupos.flatMap((g) => g.entradas).find((e) => estaActiva(e.href, caminho));

  return (
    <nav aria-label="Secções da administração">
      {/* Só no telemóvel: a lista inteira não cabe ao alto, e uma linha com
          scroll horizontal escondia metade das secções. */}
      <button
        type="button"
        aria-expanded={aberta}
        aria-controls={idLista}
        onClick={() => setAberta((v) => !v)}
        className="flex min-h-11 w-full items-center justify-between gap-3 rounded-[--radius-xs] border border-[color:var(--border)] px-3 text-sm lg:hidden"
      >
        <span>
          <span className="sr-only">Secções. Actual: </span>
          {actual?.texto ?? 'Secções'}
        </span>
        <ChevronDown aria-hidden className={cn('size-4 transition-transform', aberta && 'rotate-180')} />
      </button>

      <div id={idLista} className={cn('mt-3 flex-col gap-5 lg:mt-0 lg:flex', aberta ? 'flex' : 'hidden')}>
        {grupos.map((g) => (
          <div key={g.titulo}>
            <p className="mb-1.5 px-3 font-[family-name:var(--font-chakra)] text-[length:var(--text-micro)] tracking-[var(--tracking-eyebrow)] text-[color:var(--muted)] uppercase">
              {g.titulo}
            </p>
            <ul role="list" className="flex flex-col gap-0.5">
              {g.entradas.map((e) => {
                const activo = estaActiva(e.href, caminho);
                const Icone = ICONES[e.icone];
                return (
                  <li key={e.href}>
                    <Link
                      href={e.href}
                      aria-current={activo ? 'page' : undefined}
                      className={cn(
                        'flex min-h-10 items-center gap-3 rounded-[--radius-xs] px-3 text-sm whitespace-nowrap',
                        activo
                          ? 'bg-[color:var(--on-surface)] font-medium text-[color:var(--surface)]'
                          : 'text-[color:var(--muted)] hover:bg-[color:var(--surface-raised)] hover:text-[color:var(--on-surface)]',
                      )}
                    >
                      <Icone aria-hidden className="size-4 shrink-0" />
                      {e.texto}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </nav>
  );
}
