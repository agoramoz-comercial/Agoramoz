'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Logo } from '@/components/brand/Logo';
import { NAV, SITE } from '@/content/site';
import { SocialLinks } from '@/components/ui/SocialLinks';
import { getSolutionSummaries } from '@/content/registry';
import { COUNTRIES, COUNTRY_CODES, getSectorsForCountry } from '@/content/registry';
import { MotionToggle } from '@/components/motion/MotionToggle';

/**
 * Duas correções que só um teste por ecrã apanha:
 *
 * 1. **Alvo de toque.** Estas ligações tinham 14 a 17px de altura — abaixo do
 *    mínimo de 24x24 da WCAG 2.2 AA (2.5.8). O axe não testa este critério,
 *    pelo que passavam sem aviso. `min-h-11` dá 44px, que é o conforto, não só
 *    a conformidade.
 * 2. **`aria-current`.** Nenhuma navegação do site marcava a página atual.
 */
export function SiteFooter() {
  const solutions = getSolutionSummaries();
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
            <p className="mt-4 max-w-xs text-sm text-[color:var(--muted)]">{SITE.tagline}.</p>

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
                <span className="sr-only"> (abre noutro separador)</span>
              </a>
            </div>

            <SocialLinks className="mt-5" />
          </div>

          <nav aria-label="Soluções">
            <h2 className="rule-label text-[color:var(--muted)]">
              <Link href="/solucoes" className="flex min-h-11 items-center hover:text-[color:var(--on-surface)]">
                Soluções
              </Link>
            </h2>
            <ul className="mt-2">
              {solutions.map((s) => (
                <li key={s.slug}>
                  <Link
                    href={s.href}
                    aria-current={current(s.href)}
                    className="flex min-h-11 items-center text-sm transition-colors hover:text-[color:var(--accent)] aria-[current=page]:text-[color:var(--accent)]"
                  >
                    {s.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Mercados">
            <h2 className="rule-label text-[color:var(--muted)]">
              Mercados
            </h2>
            <ul className="mt-2">
              {COUNTRY_CODES.map((code) => (
                <li key={code}>
                  <Link
                    href={`/${code}`}
                    aria-current={current(`/${code}`)}
                    className="flex min-h-11 items-center text-sm transition-colors hover:text-[color:var(--accent)] aria-[current=page]:text-[color:var(--accent)]"
                  >
                    {COUNTRIES[code].name}
                  </Link>
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
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Empresa">
            <h2 className="rule-label text-[color:var(--muted)]">
              Empresa
            </h2>
            <ul className="mt-2">
              {NAV.primary.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={current(item.href)}
                    className="flex min-h-11 items-center text-sm transition-colors hover:text-[color:var(--accent)] aria-[current=page]:text-[color:var(--accent)]"
                  >
                    {item.label}
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
                  href="/perfil"
                  aria-current={current('/perfil')}
                  className="flex min-h-11 items-center text-sm transition-colors hover:text-[color:var(--accent)] aria-[current=page]:text-[color:var(--accent)]"
                >
                  Quem somos, em resumo
                </Link>
              </li>
              <li>
                <Link
                  href="/diagnostico"
                  aria-current={current('/diagnostico')}
                  className="flex min-h-11 items-center text-sm transition-colors hover:text-[color:var(--accent)] aria-[current=page]:text-[color:var(--accent)]"
                >
                  Solicitar diagnóstico
                </Link>
              </li>
              <li>
                <Link
                  href="/privacidade"
                  aria-current={current('/privacidade')}
                  className="flex min-h-11 items-center text-sm transition-colors hover:text-[color:var(--accent)] aria-[current=page]:text-[color:var(--accent)]"
                >
                  Privacidade
                </Link>
              </li>
            </ul>
          </nav>
        </div>

        <div className="rule mt-16 flex flex-col gap-4 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="rule-label text-[color:var(--muted)]">
            © {new Date().getFullYear()} AGORAMOZ. Todos os direitos reservados.
          </p>
          <MotionToggle />
        </div>
      </div>
    </footer>
  );
}
