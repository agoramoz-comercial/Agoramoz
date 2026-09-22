'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { COUNTRY_CODES, COUNTRIES } from '@/content/registry';

/**
 * §1 do documento. Sem descontos, sem contadores, sem urgência — apenas
 * enquadramento geográfico e um caminho rápido por país.
 */
export function TopBar() {
  const pathname = usePathname();

  return (
    <div data-surface="deep" className="bg-[color:var(--surface)] text-[color:var(--on-surface)]">
      <div
        className="mx-auto flex w-full flex-wrap items-center justify-between gap-x-6 gap-y-1.5 py-3"
        style={{ maxWidth: 'var(--container-max)', paddingInline: 'var(--container-gutter)' }}
      >
        <p className="rule-label text-[color:var(--muted)]">
          Websites, software, automação e agentes de IA para empresas em Moçambique, Portugal e Brasil.
        </p>
        <nav aria-label="Selecionar país" className="flex items-center gap-1">
          {COUNTRY_CODES.map((code) => (
            <Link
              key={code}
              href={`/${code}`}
              aria-current={pathname === `/${code}` ? 'page' : undefined}
              className="rule-label inline-flex min-h-11 items-center px-2 text-[color:var(--muted)] transition-colors hover:text-[color:var(--on-surface)] aria-[current=page]:text-[color:var(--on-surface)]"
            >
              {COUNTRIES[code].name}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
