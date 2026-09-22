'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import * as Dialog from '@radix-ui/react-dialog';
import { Menu, X, ChevronDown } from 'lucide-react';
import { Logo } from '@/components/brand/Logo';
import { Button } from '@/components/ui/Button';
import { CTA, NAV } from '@/content/site';
import { getSolutionSummaries } from '@/content/registry';
import { COUNTRIES, COUNTRY_CODES, getSectorsForCountry } from '@/content/registry';
import { cn } from '@/lib/utils/cn';

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState<'solucoes' | 'setores' | null>(null);
  const solutions = getSolutionSummaries();

  /**
   * Fechar os menus quando a rota muda. Ajustar estado durante o render (em
   * vez de num efeito) evita o render em cascata: React reinicia o render
   * imediatamente, sem pintar o estado intermédio.
   */
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
    setMenu(null);
  }

  return (
    <header
      data-surface="deep"
      className="sticky top-0 z-50 border-b border-[color:var(--hairline)] bg-[color:var(--surface)]/90 text-[color:var(--on-surface)] backdrop-blur-xl"
      onMouseLeave={() => setMenu(null)}
    >
      <div
        className="mx-auto flex w-full items-center justify-between gap-6 py-4"
        style={{ maxWidth: 'var(--container-max)', paddingInline: 'var(--container-gutter)' }}
      >
        <Logo />

        <nav aria-label="Navegação principal" className="hidden items-center gap-1 lg:flex">
          {(['solucoes', 'setores'] as const).map((key) => (
            <button
              key={key}
              type="button"
              aria-expanded={menu === key}
              aria-haspopup="true"
              onClick={() => setMenu(menu === key ? null : key)}
              onMouseEnter={() => setMenu(key)}
              className="rule-label inline-flex min-h-11 items-center gap-1.5 px-3 text-[color:var(--muted)] transition-colors hover:text-[color:var(--on-surface)]"
            >
              {key === 'solucoes' ? 'Soluções' : 'Setores'}
              <ChevronDown aria-hidden className={cn('size-3.5 transition-transform duration-300', menu === key && 'rotate-180')} />
            </button>
          ))}
          {NAV.primary.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rule-label inline-flex min-h-11 items-center px-3 text-[color:var(--muted)] transition-colors hover:text-[color:var(--on-surface)]"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Button asChild size="sm" className="hidden sm:inline-flex">
            <Link href="/diagnostico">{CTA.primary}</Link>
          </Button>

          <Dialog.Root open={open} onOpenChange={setOpen}>
            <Dialog.Trigger asChild>
              <button
                type="button"
                aria-label="Abrir menu"
                className="inline-flex size-11 items-center justify-center rounded-xs lg:hidden"
              >
                <Menu aria-hidden className="size-6" />
              </button>
            </Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Overlay className="fixed inset-0 z-[60] bg-black/60" />
              <Dialog.Content
                data-surface="deep"
                className="fixed inset-y-0 right-0 z-[70] w-full max-w-sm overflow-y-auto bg-[color:var(--surface)] p-6 text-[color:var(--on-surface)]"
              >
                <Dialog.Title className="sr-only">Menu de navegação</Dialog.Title>
                <div className="flex items-center justify-between">
                  <Logo />
                  <Dialog.Close
                    aria-label="Fechar menu"
                    className="inline-flex size-11 items-center justify-center rounded-xs"
                  >
                    <X aria-hidden className="size-6" />
                  </Dialog.Close>
                </div>

                <nav aria-label="Navegação móvel" className="mt-8 flex flex-col gap-1">
                  <p className="mt-2 mb-1 font-mono text-[length:var(--text-micro)] tracking-[var(--tracking-eyebrow)] text-[color:var(--accent)] uppercase">
                    Soluções
                  </p>
                  {solutions.map((s) => (
                    <Link key={s.slug} href={s.href} className="min-h-11 py-2.5 text-[0.9375rem]">
                      {s.label}
                    </Link>
                  ))}

                  <p className="mt-5 mb-1 font-mono text-[length:var(--text-micro)] tracking-[var(--tracking-eyebrow)] text-[color:var(--accent)] uppercase">
                    Setores
                  </p>
                  {COUNTRY_CODES.map((code) => (
                    <Link key={code} href={`/${code}`} className="min-h-11 py-2.5 text-[0.9375rem]">
                      {COUNTRIES[code].name}
                    </Link>
                  ))}

                  <div className="mt-5 border-t border-[color:var(--border)] pt-3">
                    {NAV.primary.map((item) => (
                      <Link key={item.href} href={item.href} className="block min-h-11 py-2.5 text-[0.9375rem]">
                        {item.label}
                      </Link>
                    ))}
                  </div>

                  <Button asChild className="mt-6 w-full">
                    <Link href="/diagnostico">{CTA.primary}</Link>
                  </Button>
                </nav>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        </div>
      </div>

      {/* Mega-menu (desktop) */}
      {menu && (
        <div className="hidden border-t border-[color:var(--hairline)] bg-[color:var(--surface)] lg:block">
          <div
            className="mx-auto grid w-full gap-x-12 gap-y-3 py-12 md:grid-cols-3"
            style={{ maxWidth: 'var(--container-max)', paddingInline: 'var(--container-gutter)' }}
          >
            {menu === 'solucoes'
              ? [
                  ...solutions.map((s) => (
                    <Link key={s.slug} href={s.href} className="group border-t border-[color:var(--hairline)] py-4 transition-colors hover:border-[color:var(--accent)]">
                      <span className="block font-display text-[1.0625rem] font-semibold tracking-[-0.02em]">{s.label}</span>
                      <span className="mt-1 block text-sm text-[color:var(--muted)]">{s.short}</span>
                    </Link>
                  )),
                  <Link
                    key="indice"
                    href="/solucoes"
                    className="border-t border-[color:var(--accent)] py-4 text-[color:var(--accent)]"
                  >
                    <span className="block font-display text-[1.0625rem] font-semibold tracking-[-0.02em]">Ver todas as soluções</span>
                    <span className="mt-1 block text-sm text-[color:var(--muted)]">
                      Como se combinam num único sistema
                    </span>
                  </Link>,
                ]
              : COUNTRY_CODES.map((code) => (
                  <div key={code} className="border-t border-[color:var(--hairline)] py-4">
                    <Link href={`/${code}`} className="block font-display font-semibold hover:text-[color:var(--accent)]">
                      {COUNTRIES[code].name}
                    </Link>
                    <ul className="mt-2 space-y-1.5">
                      {getSectorsForCountry(code).map((s) => (
                        <li key={s.sector}>
                          <Link href={s.href} className="text-sm text-[color:var(--muted)] hover:text-[color:var(--on-surface)]">
                            {s.label}
                            {!s.published && <span className="ml-1.5 opacity-60">·</span>}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
          </div>
        </div>
      )}
    </header>
  );
}
