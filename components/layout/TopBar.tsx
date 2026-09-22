import Link from 'next/link';
import { COUNTRY_CODES, COUNTRIES } from '@/content/registry';

/**
 * §1 do documento. Sem descontos, sem contadores, sem urgência — apenas
 * enquadramento geográfico e um caminho rápido por país.
 */
export function TopBar() {
  return (
    <div data-surface="deep" className="bg-[color:var(--surface)] text-[color:var(--on-surface)]">
      <div
        className="mx-auto flex w-full flex-wrap items-center justify-between gap-x-6 gap-y-1.5 py-2.5"
        style={{ maxWidth: 'var(--container-max)', paddingInline: 'var(--container-gutter)' }}
      >
        <p className="text-[length:var(--text-micro)] text-[color:var(--muted)]">
          Websites, software, automação e agentes de IA para empresas em Moçambique, Portugal e Brasil.
        </p>
        <nav aria-label="Selecionar país" className="flex items-center gap-1">
          {COUNTRY_CODES.map((code) => (
            <Link
              key={code}
              href={`/${code}`}
              className="rounded-xs px-2 py-1 font-mono text-[length:var(--text-micro)] tracking-[0.06em] text-[color:var(--muted)] uppercase transition-colors hover:text-[color:var(--on-surface)]"
            >
              {COUNTRIES[code].name}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
