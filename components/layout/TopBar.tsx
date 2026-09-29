'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CHROME, ENTRADAS_DE_MERCADO, destinoDaEntrada } from '@/content/i18n/chrome';
import type { Idioma } from '@/content/types';
import { destinoNoOutroIdioma } from '@/lib/i18n/rotas';
import { t } from '@/lib/i18n/texto';

const LIGACAO =
  'rule-label inline-flex min-h-11 items-center px-2 text-[color:var(--muted)] transition-colors hover:text-[color:var(--on-surface)] aria-[current=page]:text-[color:var(--on-surface)]';

/**
 * §1 do documento. Sem descontos, sem contadores, sem urgência — apenas
 * enquadramento geográfico e um caminho rápido por mercado.
 *
 * Duas zonas, porque são duas perguntas diferentes:
 *
 * - **Mercado** — PT-PT, PT-MZ, PT-BR e EN · Global, na ordem pedida. O
 *   código visível é o `locale`; o nome acessível começa por ele (WCAG 2.5.3,
 *   o rótulo está no nome) e acrescenta o país.
 * - **Idioma desta página** — leva ao par da página actual quando ele existe
 *   (`ROTAS_BILINGUES`), e à entrada do outro idioma quando não existe. Nunca
 *   a um 404.
 */
export function TopBar({ idioma = 'pt' }: { idioma?: Idioma }) {
  const pathname = usePathname();
  const outro = destinoNoOutroIdioma(pathname, idioma);

  return (
    <div data-surface="deep" className="bg-[color:var(--surface)] text-[color:var(--on-surface)]">
      <div
        className="mx-auto flex w-full flex-wrap items-center justify-between gap-x-6 gap-y-1.5 py-3"
        style={{
          maxWidth: 'var(--container-max)',
          paddingInline: 'var(--container-gutter)',
        }}
      >
        <p className="rule-label text-[color:var(--muted)]">{t(CHROME.topo, idioma)}</p>
        <div className="flex flex-wrap items-center gap-x-3">
          <nav aria-label={t(CHROME.mercadosAria, idioma)} className="flex flex-wrap items-center gap-1">
            {ENTRADAS_DE_MERCADO.map((e) => {
              const href = destinoDaEntrada(e.chave);
              return (
                <Link
                  key={e.chave}
                  href={href}
                  hrefLang={e.lang}
                  aria-label={`${e.codigo} · ${t(e.nome, idioma)}`}
                  aria-current={pathname === href ? 'page' : undefined}
                  className={LIGACAO}
                >
                  {e.chave === 'global' ? `${e.codigo} · Global` : e.codigo}
                </Link>
              );
            })}
          </nav>
          {/* Só quando os dois grupos cabem na mesma linha; em telemóvel ficaria solto no fim da linha. */}
          <span aria-hidden className="hidden h-4 w-px bg-[color:var(--hairline)] sm:block" />
          <nav aria-label={t(CHROME.idiomaAria, idioma)} className="flex items-center">
            {(['pt', 'en'] as const).map((i) =>
              i === idioma ? (
                <span
                  key={i}
                  aria-current="true"
                  className={`${LIGACAO} min-w-11 justify-center text-[color:var(--on-surface)]`}
                >
                  {i.toUpperCase()}
                </span>
              ) : (
                <Link
                  key={i}
                  href={outro.href}
                  hrefLang={i}
                  lang={i}
                  // O nome de cada idioma no próprio idioma: quem procura o seu
                  // não tem de o reconhecer escrito na língua do outro.
                  aria-label={i === 'en' ? 'EN · English' : 'PT · Português'}
                  // Duas letras dão 34px de largura: abaixo dos 44 de conforto.
                  className={`${LIGACAO} min-w-11 justify-center`}
                >
                  {i.toUpperCase()}
                </Link>
              ),
            )}
          </nav>
        </div>
      </div>
    </div>
  );
}
