'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import * as Dialog from '@radix-ui/react-dialog';
import { Menu, X, ChevronDown } from 'lucide-react';
import { Logo } from '@/components/brand/Logo';
import { Button } from '@/components/ui/Button';
import { NAV, SITE } from '@/content/site';
import { SocialLinks } from '@/components/ui/SocialLinks';
import { SoPortugues } from '@/components/ui/SoPortugues';
import { getSolutionSummaries } from '@/content/registry';
import { COUNTRY_CODES, GLOBAL_CODES, GLOBAL_MARKETS, getSectorsForCountry } from '@/content/registry';
import { CHROME, NAV_TEXTO, NOME_PAIS, RESUMO_SOLUCAO } from '@/content/i18n/chrome';
import type { Idioma } from '@/content/types';
import { inicioDoIdioma, ligacao } from '@/lib/i18n/rotas';
import { caminhoNoIdioma, t } from '@/lib/i18n/texto';
import { cn } from '@/lib/utils/cn';

/**
 * Nos dois idiomas. Em português, tudo como estava, mais a entrada Global —
 * a quarta das quatro entradas de mercado. Em inglês:
 *
 * - as soluções levam à página inglesa quando existe, e à portuguesa marcada
 *   «(PT)» quando não existe (`ligacao`);
 * - o menu «Markets» mostra os três mercados de operação — páginas em
 *   português, marcadas — e os dez globais em inglês;
 * - as páginas institucionais, que só existem em português, saem da barra e
 *   ficam na gaveta e no rodapé, marcadas.
 */
export function SiteHeader({ idioma = 'pt' }: { idioma?: Idioma }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState<'solucoes' | 'setores' | null>(null);
  const solutions = getSolutionSummaries().map((s) => {
    const l = ligacao(s.href, idioma);
    return {
      slug: s.slug,
      label: t(RESUMO_SOLUCAO[s.slug].label, idioma),
      short: t(RESUMO_SOLUCAO[s.slug].short, idioma),
      href: l.href,
      soPortugues: l.soPortugues,
    };
  });
  const indiceSolucoes = ligacao('/solucoes', idioma);
  const diagnostico = ligacao('/diagnostico', idioma);
  const cta = t(CHROME.ctaPrimario, idioma);
  const globalHref = caminhoNoIdioma('/global', idioma);
  const globalRotulo = t(CHROME.globalN, idioma).replace('{n}', String(GLOBAL_CODES.length));
  // Em inglês a barra só leva o que existe em inglês.
  const navPrimaria = idioma === 'pt' ? NAV.primary : [];
  const pt = idioma === 'en' ? ('pt' as const) : undefined;

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
        <Logo href={inicioDoIdioma(idioma)} idioma={idioma} />

        <nav aria-label={t(CHROME.navPrincipal, idioma)} className="hidden items-center gap-1 lg:flex">
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
              {t(key === 'solucoes' ? CHROME.solucoes : CHROME.setores, idioma)}
              <ChevronDown aria-hidden className={cn('size-3.5 transition-transform duration-300', menu === key && 'rotate-180')} />
            </button>
          ))}
          {navPrimaria.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={pathname === item.href ? 'page' : undefined}
              className="rule-label inline-flex min-h-11 items-center px-3 text-[color:var(--muted)] transition-colors hover:text-[color:var(--on-surface)] aria-[current=page]:text-[color:var(--on-surface)]"
            >
              {item.label}
            </Link>
          ))}
          {idioma === 'en' && (
            <Link
              href={globalHref}
              aria-current={pathname === globalHref ? 'page' : undefined}
              className="rule-label inline-flex min-h-11 items-center px-3 text-[color:var(--muted)] transition-colors hover:text-[color:var(--on-surface)] aria-[current=page]:text-[color:var(--on-surface)]"
            >
              {t(CHROME.mercadosGlobais, idioma)}
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-2">
          {/*
            Abaixo de 640px este botão tinha `hidden sm:inline-flex`: num
            telemóvel não havia CTA nenhum no cabeçalho. Passa a estar sempre
            presente, com rótulo curto onde não cabe o longo — o destino é o
            mesmo, e o nome acessível mantém o rótulo completo.
          */}
          <Button asChild size="sm">
            <Link href={diagnostico.href} hrefLang={diagnostico.soPortugues ? 'pt' : undefined}>
              <span className="sm:hidden" aria-hidden>
                {t(CHROME.diagnosticoCurto, idioma)}
              </span>
              <span className="hidden sm:inline">{cta}</span>
              <span className="sr-only sm:hidden">{cta}</span>
            </Link>
          </Button>

          <Dialog.Root open={open} onOpenChange={setOpen}>
            <Dialog.Trigger asChild>
              <button
                type="button"
                aria-label={t(CHROME.abrirMenu, idioma)}
                className="inline-flex size-11 items-center justify-center rounded-xs lg:hidden"
              >
                <Menu aria-hidden className="size-6" />
              </button>
            </Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Overlay className="fixed inset-0 z-[60] bg-black/60" />
              <Dialog.Content
                // O Radix leva a gaveta para o fim do <body>, fora do <div lang> do
                // chrome: sem isto, o menu inglês seria anunciado como português.
                lang={idioma === 'en' ? 'en' : undefined}
                data-surface="deep"
                className="fixed inset-y-0 right-0 z-[70] w-full max-w-sm overflow-y-auto bg-[color:var(--surface)] p-6 text-[color:var(--on-surface)]"
              >
                <Dialog.Title className="sr-only">{t(CHROME.menuTitulo, idioma)}</Dialog.Title>
                <div className="flex items-center justify-between">
                  <Logo href={inicioDoIdioma(idioma)} idioma={idioma} />
                  <Dialog.Close
                    aria-label={t(CHROME.fecharMenu, idioma)}
                    className="inline-flex size-11 items-center justify-center rounded-xs"
                  >
                    <X aria-hidden className="size-6" />
                  </Dialog.Close>
                </div>

                <nav aria-label={t(CHROME.navMovel, idioma)} className="mt-8 flex flex-col gap-1">
                  <p className="mt-2 mb-1 font-techno font-medium text-[length:var(--text-micro)] tracking-[var(--tracking-techno)] text-[color:var(--accent)] uppercase">
                    {t(CHROME.solucoes, idioma)}
                  </p>
                  {solutions.map((s) => (
                    <Link
                      key={s.slug}
                      href={s.href}
                      hrefLang={s.soPortugues ? 'pt' : undefined}
                      aria-current={pathname === s.href ? 'page' : undefined}
                      className="flex min-h-11 items-center text-[0.9375rem] aria-[current=page]:text-[color:var(--accent)]"
                    >
                      {s.label}
                      {s.soPortugues && <SoPortugues idioma={idioma} />}
                    </Link>
                  ))}

                  <p className="mt-5 mb-1 font-techno font-medium text-[length:var(--text-micro)] tracking-[var(--tracking-techno)] text-[color:var(--accent)] uppercase">
                    {t(CHROME.setores, idioma)}
                  </p>
                  {COUNTRY_CODES.map((code) => (
                    <Link
                      key={code}
                      href={`/${code}`}
                      hrefLang={pt}
                      aria-current={pathname === `/${code}` ? 'page' : undefined}
                      className="flex min-h-11 items-center text-[0.9375rem] aria-[current=page]:text-[color:var(--accent)]"
                    >
                      {t(NOME_PAIS[code], idioma)}
                      <SoPortugues idioma={idioma} />
                    </Link>
                  ))}
                  {/* Só em inglês: o menu português fica como estava — tem o Global no topo e no rodapé. */}
                  {idioma === 'en' && (
                    <Link
                      href={globalHref}
                      aria-current={pathname === globalHref ? 'page' : undefined}
                      className="flex min-h-11 items-center text-[0.9375rem] aria-[current=page]:text-[color:var(--accent)]"
                    >
                      {globalRotulo}
                    </Link>
                  )}

                  <div className="mt-5 border-t border-[color:var(--border)] pt-3">
                    {NAV.primary.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        hrefLang={pt}
                        aria-current={pathname === item.href ? 'page' : undefined}
                        className="flex min-h-11 items-center text-[0.9375rem] aria-[current=page]:text-[color:var(--accent)]"
                      >
                        {t(NAV_TEXTO[item.href], idioma)}
                        <SoPortugues idioma={idioma} />
                      </Link>
                    ))}
                  </div>

                  <Button asChild className="mt-6 w-full">
                    <Link href={diagnostico.href} hrefLang={diagnostico.soPortugues ? 'pt' : undefined}>
                      {cta}
                    </Link>
                  </Button>

                  {/* Num telemóvel é aqui que se procura como falar com alguém. */}
                  <div className="mt-8 border-t border-dashed border-[color:var(--hairline)] pt-5">
                    <p className="rule-label text-[color:var(--muted)]">{t(CHROME.canais, idioma)}</p>
                    <a
                      href={`https://wa.me/${SITE.whatsapp.e164}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 flex min-h-11 items-center text-[0.9375rem]"
                    >
                      WhatsApp {SITE.whatsapp.display}
                    </a>
                    <a href={`mailto:${SITE.email}`} className="flex min-h-11 items-center text-[0.9375rem]">
                      {SITE.email}
                    </a>
                    <SocialLinks className="mt-3" idioma={idioma} />
                  </div>
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
            className="mx-auto grid w-full gap-x-12 gap-y-3 py-12 lg:grid-cols-3"
            style={{ maxWidth: 'var(--container-max)', paddingInline: 'var(--container-gutter)' }}
          >
            {menu === 'solucoes'
              ? [
                  ...solutions.map((s) => (
                    <Link
                      key={s.slug}
                      href={s.href}
                      hrefLang={s.soPortugues ? 'pt' : undefined}
                      className="group border-t border-dashed border-[color:var(--hairline)] py-4 transition-colors hover:border-[color:var(--accent)]"
                    >
                      <span className="block font-display text-[1.0625rem] font-semibold tracking-[-0.02em]">
                        {s.label}
                        {s.soPortugues && <SoPortugues idioma={idioma} />}
                      </span>
                      <span className="mt-1 block text-sm text-[color:var(--muted)]">{s.short}</span>
                    </Link>
                  )),
                  <Link
                    key="indice"
                    href={indiceSolucoes.href}
                    hrefLang={indiceSolucoes.soPortugues ? 'pt' : undefined}
                    className="border-t border-[color:var(--accent)] py-4 text-[color:var(--accent)]"
                  >
                    <span className="block font-display text-[1.0625rem] font-semibold tracking-[-0.02em]">
                      {t(CHROME.verTodas, idioma)}
                      {indiceSolucoes.soPortugues && <SoPortugues idioma={idioma} />}
                    </span>
                    <span className="mt-1 block text-sm text-[color:var(--muted)]">
                      {t(CHROME.comoCombinam, idioma)}
                    </span>
                  </Link>,
                ]
              : [
                  ...COUNTRY_CODES.map((code) => (
                    <div key={code} className="border-t border-dashed border-[color:var(--hairline)] py-4">
                      <Link href={`/${code}`} hrefLang={pt} className="block font-display font-semibold hover:text-[color:var(--accent)]">
                        {t(NOME_PAIS[code], idioma)}
                        <SoPortugues idioma={idioma} />
                      </Link>
                      {/* Os setores são páginas em português, com título português: em inglês, só o país. */}
                      {idioma === 'pt' && (
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
                      )}
                    </div>
                  )),
                  // Em inglês, o nível global com os dez mercados. Em português o menu
                  // fica como estava: acrescentar uma quarta célula a uma grelha de
                  // três mudava-lhe a forma, e o design português não muda.
                  ...(idioma === 'en'
                    ? [
                  <div key="global" className="border-t border-dashed border-[color:var(--hairline)] py-4">
                    <Link href={globalHref} className="block font-display font-semibold hover:text-[color:var(--accent)]">
                      {globalRotulo}
                    </Link>
                    <ul className="mt-2 space-y-1.5">
                      {GLOBAL_CODES.map((c) => (
                        <li key={c}>
                          <Link
                            href={caminhoNoIdioma(`/global/${c}`, idioma)}
                            className="text-sm text-[color:var(--muted)] hover:text-[color:var(--on-surface)]"
                          >
                            {t(GLOBAL_MARKETS[c].name, idioma)}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>,
                      ]
                    : []),
                ]}
          </div>
        </div>
      )}
    </header>
  );
}
