'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Logo } from '@/components/brand/Logo';
import { NAV, SITE } from '@/content/site';
import { SocialLinks } from '@/components/ui/SocialLinks';
import { SoPortugues } from '@/components/ui/SoPortugues';
import { getSolutionSummaries } from '@/content/registry';
import { COUNTRY_CODES, GLOBAL_CODES, getSectorsForCountry } from '@/content/registry';
import { MotionToggle } from '@/components/motion/MotionToggle';
import { CHROME, NAV_TEXTO, NOME_PAIS, RESUMO_SOLUCAO } from '@/content/i18n/chrome';
import type { Idioma } from '@/content/types';
import { ligacao } from '@/lib/i18n/rotas';
import { caminhoNoIdioma, t } from '@/lib/i18n/texto';

/**
 * Duas correções que só um teste por ecrã apanha:
 *
 * 1. **Alvo de toque.** Estas ligações tinham 14 a 17px de altura — abaixo do
 *    mínimo de 24x24 da WCAG 2.2 AA (2.5.8). O axe não testa este critério,
 *    pelo que passavam sem aviso. `min-h-11` dá 44px, que é o conforto, não só
 *    a conformidade.
 * 2. **`aria-current`.** Nenhuma navegação do site marcava a página atual.
 */
export function SiteFooter({ idioma = 'pt' }: { idioma?: Idioma }) {
  // A regra do cabeçalho: página inglesa quando existe, portuguesa marcada
  // «(PT)» quando não existe.
  const solutions = getSolutionSummaries().map((s) => {
    const l = ligacao(s.href, idioma);
    return { slug: s.slug, label: t(RESUMO_SOLUCAO[s.slug].label, idioma), href: l.href, soPortugues: l.soPortugues };
  });
  const indiceSolucoes = ligacao('/solucoes', idioma);
  const diagnostico = ligacao('/diagnostico', idioma);
  const news = ligacao('/news', idioma);
  const globalHref = caminhoNoIdioma('/global', idioma);
  const pt = idioma === 'en' ? ('pt' as const) : undefined;
  const pathname = usePathname();
  const current = (href: string) => (pathname === href ? 'page' : undefined);

  return (
    <footer data-surface="deep" className="bg-[color:var(--surface)] text-[color:var(--on-surface)]">
      <div
        className="mx-auto w-full py-20"
        style={{ maxWidth: 'var(--container-max)', paddingInline: 'var(--container-gutter)' }}
      >
        {/* Quatro colunas a partir de 768px davam ~180px a cada uma, e a coluna
            Mercados leva listas de setores aninhadas: ilegível em tablet.
            Duas colunas em md, quatro só quando há largura para elas. */}
        <div className="rule grid gap-x-10 gap-y-12 pt-10 md:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1fr]">
          <div>
            <Logo href={null} />
            <p className="mt-4 max-w-xs text-sm text-[color:var(--muted)]">{t(CHROME.tagline, idioma)}.</p>

            <div className="mt-6 flex flex-col gap-2">
              <a
                href={`mailto:${SITE.email}`}
                className="inline-flex min-h-11 items-center rounded-xs text-sm text-[color:var(--on-surface)] underline-offset-4 hover:underline"
              >
                {SITE.email}
              </a>
              <a
                href={`https://wa.me/${SITE.whatsapp.e164}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center rounded-xs text-sm text-[color:var(--on-surface)] underline-offset-4 hover:underline"
              >
                WhatsApp {SITE.whatsapp.display}
                <span className="sr-only"> {t(CHROME.novoSeparador, idioma)}</span>
              </a>
            </div>

            <SocialLinks className="mt-5" idioma={idioma} />
          </div>

          <nav aria-label={t(CHROME.solucoes, idioma)}>
            <h2 className="rule-label text-[color:var(--muted)]">
              <Link
                href={indiceSolucoes.href}
                hrefLang={indiceSolucoes.soPortugues ? 'pt' : undefined}
                className="flex min-h-11 items-center hover:text-[color:var(--on-surface)]"
              >
                {t(CHROME.solucoes, idioma)}
                {indiceSolucoes.soPortugues && <SoPortugues idioma={idioma} />}
              </Link>
            </h2>
            <ul className="mt-2">
              {solutions.map((s) => (
                <li key={s.slug}>
                  <Link
                    href={s.href}
                    hrefLang={s.soPortugues ? 'pt' : undefined}
                    aria-current={current(s.href)}
                    className="flex min-h-11 items-center text-sm transition-colors hover:text-[color:var(--accent)] aria-[current=page]:text-[color:var(--accent)]"
                  >
                    {s.label}
                    {s.soPortugues && <SoPortugues idioma={idioma} />}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label={t(CHROME.mercados, idioma)}>
            <h2 className="rule-label text-[color:var(--muted)]">
              {t(CHROME.mercados, idioma)}
            </h2>
            <ul className="mt-2">
              {COUNTRY_CODES.map((code) => (
                <li key={code}>
                  <Link
                    href={`/${code}`}
                    hrefLang={pt}
                    aria-current={current(`/${code}`)}
                    className="flex min-h-11 items-center text-sm transition-colors hover:text-[color:var(--accent)] aria-[current=page]:text-[color:var(--accent)]"
                  >
                    {t(NOME_PAIS[code], idioma)}
                    <SoPortugues idioma={idioma} />
                  </Link>
                  {/* Os setores são páginas em português, com título português: em inglês, só o país. */}
                  {idioma === 'pt' && (
                  <ul className="mt-0.5 mb-2 pl-3">
                    {getSectorsForCountry(code)
                      .filter((s) => s.published)
                      .map((s) => (
                        <li key={s.sector}>
                          <Link
                            href={s.href}
                            aria-current={current(s.href)}
                            className="flex min-h-11 items-center text-[length:var(--text-micro)] text-[color:var(--muted)] transition-colors hover:text-[color:var(--on-surface)] aria-[current=page]:text-[color:var(--on-surface)]"
                          >
                            {s.label}
                          </Link>
                        </li>
                      ))}
                  </ul>
                  )}
                </li>
              ))}
              {/*
                Depois dos três mercados de operação, o nível global. É a única
                ligação permanente para /global: sem ela, as 22 páginas só
                existiam no sitemap.
              */}
              <li>
                <Link
                  href={globalHref}
                  aria-current={current(globalHref)}
                  className="flex min-h-11 items-center text-sm transition-colors hover:text-[color:var(--accent)] aria-[current=page]:text-[color:var(--accent)]"
                >
                  {t(CHROME.globalN, idioma).replace('{n}', String(GLOBAL_CODES.length))}
                </Link>
              </li>
            </ul>
          </nav>

          <nav aria-label={t(CHROME.empresa, idioma)}>
            <h2 className="rule-label text-[color:var(--muted)]">
              {t(CHROME.empresa, idioma)}
            </h2>
            <ul className="mt-2">
              {NAV.primary.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    hrefLang={pt}
                    aria-current={current(item.href)}
                    className="flex min-h-11 items-center text-sm transition-colors hover:text-[color:var(--accent)] aria-[current=page]:text-[color:var(--accent)]"
                  >
                    {t(NAV_TEXTO[item.href], idioma)}
                    <SoPortugues idioma={idioma} />
                  </Link>
                </li>
              ))}
              {/*
                O rodapé é a única ligação interna para `/perfil`. É deliberado:
                a página existe para receber tráfego do perfil do Google, não
                para competir com `/mz` na navegação — mas uma página sem
                nenhuma ligação interna é uma página que o rastreador alcança
                só pelo sitemap, e isso enfraquece-a.
              */}
              <li>
                <Link
                  href={news.href}
                  aria-current={current(news.href)}
                  className="flex min-h-11 items-center text-sm transition-colors hover:text-[color:var(--accent)] aria-[current=page]:text-[color:var(--accent)]"
                >
                  {t(CHROME.news, idioma)}
                </Link>
              </li>
              {/* `/perfil` fica só em português, por decisão: é a página do Google Business Profile. */}
              {idioma === 'pt' && (
                <li>
                  <Link
                    href="/perfil"
                    aria-current={current('/perfil')}
                    className="flex min-h-11 items-center text-sm transition-colors hover:text-[color:var(--accent)] aria-[current=page]:text-[color:var(--accent)]"
                  >
                    {t(CHROME.perfilResumo, idioma)}
                  </Link>
                </li>
              )}
              <li>
                <Link
                  href={diagnostico.href}
                  hrefLang={diagnostico.soPortugues ? 'pt' : undefined}
                  aria-current={current(diagnostico.href)}
                  className="flex min-h-11 items-center text-sm transition-colors hover:text-[color:var(--accent)] aria-[current=page]:text-[color:var(--accent)]"
                >
                  {t(CHROME.solicitarDiagnostico, idioma)}
                  {diagnostico.soPortugues && <SoPortugues idioma={idioma} />}
                </Link>
              </li>
              <li>
                <Link
                  href="/privacidade"
                  hrefLang={pt}
                  aria-current={current('/privacidade')}
                  className="flex min-h-11 items-center text-sm transition-colors hover:text-[color:var(--accent)] aria-[current=page]:text-[color:var(--accent)]"
                >
                  {t(CHROME.privacidade, idioma)}
                  <SoPortugues idioma={idioma} />
                </Link>
              </li>
            </ul>
          </nav>
        </div>

        <div className="rule mt-16 flex flex-col gap-4 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="rule-label text-[color:var(--muted)]">
            {/* Os mesmos três nós de texto do original — «© », o ano e o resto —
                para o português renderizar igual ao píxel. */}
            © {new Date().getFullYear()}
            {` AGORAMOZ. ${t(CHROME.direitos, idioma)}`}
          </p>
          <MotionToggle idioma={idioma} />
        </div>
      </div>
    </footer>
  );
}
