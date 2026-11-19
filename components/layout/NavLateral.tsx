'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import * as Dialog from '@radix-ui/react-dialog';
import { ArrowUpRight, X } from 'lucide-react';
import { SoPortugues } from '@/components/ui/SoPortugues';
import { NAV, SITE } from '@/content/site';
import { getSolutionSummaries } from '@/content/registry';
import { CHROME, ENTRADAS_DE_MERCADO, NAV_TEXTO, RESUMO_SOLUCAO, destinoDaEntrada } from '@/content/i18n/chrome';
import type { Idioma } from '@/content/types';
import { destinoNoOutroIdioma, inicioDoIdioma, ligacao } from '@/lib/i18n/rotas';
import { t } from '@/lib/i18n/texto';
import logoClaro from '@/public/brand/logo-transparente-claro.png';

/**
 * Navegação do website v2 (D-51).
 *
 * - Computador: uma barra vertical fixa na margem direita, com o menu, o
 *   símbolo, as entradas principais escritas na vertical, os idiomas e, em
 *   baixo, o separador verde do diagnóstico.
 * - Telemóvel e tablet: uma barra no topo em três blocos: menu (preto), marca
 *   (branco) e diagnóstico (verde).
 * - Menu: ecrã inteiro, preto. Junta o que antes estava no cabeçalho e na faixa
 *   de topo: soluções, páginas, mercados, idiomas e canais directos.
 *
 * Os rótulos vêm de `CHROME` e `NAV_TEXTO`, nos dois idiomas. O verde do
 * logótipo leva texto preto (8,06:1); branco sobre verde não passa o contraste.
 */

const VERTICAL = 'whitespace-nowrap [writing-mode:vertical-rl] rotate-180';

export function NavLateral({ idioma }: { idioma: Idioma }) {
  const pathname = usePathname();
  const [aberto, setAberto] = useState(false);
  const [ultimo, setUltimo] = useState(pathname);
  if (pathname !== ultimo) {
    setUltimo(pathname);
    setAberto(false);
  }

  const inicio = inicioDoIdioma(idioma);
  const diagnostico = ligacao('/diagnostico', idioma);
  const solucoes = ligacao('/solucoes', idioma);
  const setores = ligacao('/setores', idioma);
  const outro = destinoNoOutroIdioma(pathname, idioma);
  const principais = [
    { href: solucoes.href, rotulo: t(CHROME.solucoes, idioma), pt: solucoes.soPortugues },
    { href: setores.href, rotulo: t(CHROME.setores, idioma), pt: setores.soPortugues },
    ...NAV.primary.map((i) => {
      const l = ligacao(i.href, idioma);
      return { href: l.href, rotulo: t(NAV_TEXTO[i.href], idioma), pt: l.soPortugues };
    }),
  ];

  const idiomas = (direcao: 'linha' | 'coluna') => (
    <nav aria-label={t(CHROME.idiomaAria, idioma)} className={direcao === 'coluna' ? 'flex flex-col' : 'flex gap-1'}>
      {(['pt', 'en'] as const).map((i) =>
        i === idioma ? (
          <span key={i} aria-current="true" className="grid min-h-11 min-w-11 place-items-center text-sm font-semibold">
            {i.toUpperCase()}
          </span>
        ) : (
          <Link
            key={i}
            href={outro.href}
            hrefLang={i}
            lang={i}
            className="grid min-h-11 min-w-11 place-items-center text-sm text-[color:var(--muted)] hover:text-[color:var(--on-surface)]"
          >
            {i.toUpperCase()}
          </Link>
        ),
      )}
    </nav>
  );

  return (
    <Dialog.Root open={aberto} onOpenChange={setAberto}>
      {/* Telemóvel e tablet: barra de topo em três blocos */}
      <header data-surface="light" className="sticky top-0 z-50 grid grid-cols-[4rem_minmax(0,1fr)_auto] border-b border-[color:var(--v2-preto)] bg-white lg:hidden">
        <Dialog.Trigger
          aria-label={t(CHROME.abrirMenu, idioma)}
          className="grid h-16 place-items-center bg-[color:var(--v2-preto)] text-white"
        >
          <span aria-hidden className="grid w-7 gap-1.5">
            <span className="h-0.5 bg-current" />
            <span className="h-0.5 bg-current" />
            <span className="h-0.5 bg-current" />
          </span>
        </Dialog.Trigger>
        <Link href={inicio} className="flex items-center px-4 text-xl font-medium leading-none tracking-[-0.03em]">
          AGORAMOZ
        </Link>
        <Link
          href={diagnostico.href}
          hrefLang={diagnostico.soPortugues ? 'pt' : undefined}
          className="flex min-w-32 items-start justify-between gap-3 bg-[color:var(--v2-verde)] px-4 py-2.5 text-lg font-medium leading-none tracking-[-0.02em] text-[color:var(--v2-preto)]"
        >
          {t(CHROME.diagnosticoCurto, idioma)}
          <ArrowUpRight aria-hidden className="size-5 shrink-0" />
        </Link>
      </header>

      {/* Computador: barra vertical fixa à direita */}
      <aside
        data-surface="light"
        aria-label={t(CHROME.navPrincipal, idioma)}
        className="fixed inset-y-0 right-0 z-50 hidden w-16 flex-col border-l border-[color:var(--v2-preto)] bg-white lg:flex"
      >
        <Dialog.Trigger
          aria-label={t(CHROME.abrirMenu, idioma)}
          className="grid h-16 shrink-0 place-items-center bg-[color:var(--v2-preto)] text-white"
        >
          <span aria-hidden className="grid w-7 gap-1.5">
            <span className="h-0.5 bg-current" />
            <span className="h-0.5 bg-current" />
            <span className="h-0.5 bg-current" />
          </span>
        </Dialog.Trigger>
        <Link href={inicio} aria-label="AGORAMOZ" className="grid shrink-0 place-items-center border-b border-[color:var(--border)] py-4">
          <span className={`${VERTICAL} text-sm font-semibold tracking-[0.08em]`}>AGORAMOZ</span>
        </Link>
        <nav className="flex min-h-0 flex-1 flex-col items-center gap-1 overflow-hidden py-4">
          {principais.map((p) => (
            <Link
              key={p.href}
              href={p.href}
              hrefLang={p.pt ? 'pt' : undefined}
              aria-current={pathname === p.href ? 'page' : undefined}
              className={`${VERTICAL} min-w-11 py-2 text-[0.9375rem] leading-none text-[color:var(--muted)] transition-colors hover:text-[color:var(--on-surface)] aria-[current=page]:font-semibold aria-[current=page]:text-[color:var(--on-surface)]`}
            >
              {p.rotulo}
            </Link>
          ))}
        </nav>
        <div className="grid place-items-center border-t border-[color:var(--border)] py-1">
          {idiomas('coluna')}
        </div>
        <Link
          href={diagnostico.href}
          hrefLang={diagnostico.soPortugues ? 'pt' : undefined}
          className="grid h-44 shrink-0 place-items-center gap-2 bg-[color:var(--v2-verde)] py-4 text-[color:var(--v2-preto)]"
        >
          <span className={`${VERTICAL} text-lg font-medium leading-none tracking-[-0.02em]`}>{t(CHROME.diagnosticoCurto, idioma)}</span>
          <ArrowUpRight aria-hidden className="size-5" />
        </Link>
      </aside>

      {/* Menu em ecrã inteiro */}
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[80] bg-[color:var(--v2-preto,#0a0a0b)]" />
        <Dialog.Content
          data-v2
          data-surface="deep"
          className="fixed inset-0 z-[81] overflow-y-auto bg-[color:var(--surface)] text-[color:var(--on-surface)] outline-none"
        >
          <div className="mx-auto grid min-h-full max-w-[var(--container-max)] content-start gap-12 px-[var(--container-gutter)] py-6 lg:pr-24">
            <div className="flex items-center justify-between gap-4">
              <Image src={logoClaro} alt="AGORAMOZ" className="h-9 w-auto" />
              <Dialog.Title className="sr-only">{t(CHROME.menuTitulo, idioma)}</Dialog.Title>
              <Dialog.Close
                aria-label={t(CHROME.fecharMenu, idioma)}
                className="grid size-12 place-items-center bg-white text-[color:var(--v2-preto)]"
              >
                <X aria-hidden className="size-6" />
              </Dialog.Close>
            </div>

            <div className="grid gap-12 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
              <nav aria-label={t(CHROME.navPrincipal, idioma)}>
                <ul className="m-0 grid list-none gap-1 p-0">
                  {[...principais, ...NAV.secundaria.map((i) => {
                    const l = ligacao(i.href, idioma);
                    return { href: l.href, rotulo: t(NAV_TEXTO[i.href], idioma), pt: l.soPortugues };
                  })]
                    // «Setores» vem dos menus principais e da lista secundária: uma vez só.
                    .filter((p, i, todos) => todos.findIndex((x) => x.href === p.href) === i)
                    .map((p) => (
                    <li key={p.href}>
                      <Link
                        href={p.href}
                        hrefLang={p.pt ? 'pt' : undefined}
                        className="inline-flex min-h-11 items-baseline gap-2 text-[length:clamp(1.75rem,1.2rem+2vw,3rem)] font-medium leading-tight tracking-[-0.035em] hover:text-[color:var(--v2-amarelo)]"
                      >
                        {p.rotulo}
                        <SoPortugues idioma={idioma} />
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>

              <div className="grid content-start gap-10">
                <div>
                  <p className="m-0 text-sm font-semibold uppercase tracking-[0.14em] text-[color:var(--muted)]">{t(CHROME.solucoes, idioma)}</p>
                  <ul className="m-0 mt-3 grid list-none gap-0.5 p-0">
                    {getSolutionSummaries().map((s) => {
                      const l = ligacao(s.href, idioma);
                      return (
                        <li key={s.slug}>
                          <Link href={l.href} hrefLang={l.soPortugues ? 'pt' : undefined} className="inline-flex min-h-11 items-center text-lg hover:text-[color:var(--v2-amarelo)]">
                            {t(RESUMO_SOLUCAO[s.slug].label, idioma)}
                            <SoPortugues idioma={idioma} />
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
                <div className="grid gap-3">
                  <p className="m-0 text-sm font-semibold uppercase tracking-[0.14em] text-[color:var(--muted)]">{t(CHROME.mercadosAria, idioma)}</p>
                  <nav aria-label={t(CHROME.mercadosAria, idioma)} className="flex flex-wrap gap-2">
                    {ENTRADAS_DE_MERCADO.map((e) => (
                      <Link
                        key={e.chave}
                        href={destinoDaEntrada(e.chave)}
                        hrefLang={e.lang}
                        className="inline-flex min-h-11 items-center border border-[color:var(--border)] px-4 text-sm hover:border-[color:var(--v2-amarelo)]"
                      >
                        {e.codigo} · {t(e.nome, idioma)}
                      </Link>
                    ))}
                  </nav>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-[color:var(--muted)]">{t(CHROME.idiomaAria, idioma)}</span>
                    {idiomas('linha')}
                  </div>
                </div>
                <div className="grid gap-2">
                  <p className="m-0 text-sm font-semibold uppercase tracking-[0.14em] text-[color:var(--muted)]">{t(CHROME.canais, idioma)}</p>
                  <a href={`https://wa.me/${SITE.whatsapp.e164}`} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center text-lg hover:text-[color:var(--v2-amarelo)]">
                    WhatsApp {SITE.whatsapp.display}
                  </a>
                  <span className="select-all text-lg">{SITE.email}</span>
                </div>
              </div>
            </div>

            <Link
              href={diagnostico.href}
              hrefLang={diagnostico.soPortugues ? 'pt' : undefined}
              className="flex items-center justify-between gap-4 bg-[color:var(--v2-verde)] px-6 py-5 text-[length:clamp(1.5rem,1.1rem+1.6vw,2.5rem)] font-medium tracking-[-0.03em] text-[color:var(--v2-preto)]"
            >
              {t(CHROME.ctaPrimario, idioma)}
              <ArrowUpRight aria-hidden className="size-8 shrink-0" />
            </Link>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
