import Link from 'next/link';
import { Logo } from '@/components/brand/Logo';
import { NAV, SITE } from '@/content/site';
import { getSolutionSummaries } from '@/content/registry';
import { COUNTRIES, COUNTRY_CODES, getSectorsForCountry } from '@/content/registry';
import { MotionToggle } from '@/components/motion/MotionToggle';

export function SiteFooter() {
  const solutions = getSolutionSummaries();

  return (
    <footer data-surface="deep" className="bg-[color:var(--surface)] text-[color:var(--on-surface)]">
      <div
        className="mx-auto w-full py-20"
        style={{ maxWidth: 'var(--container-max)', paddingInline: 'var(--container-gutter)' }}
      >
        <div className="rule grid gap-12 pt-10 md:grid-cols-[1.6fr_1fr_1fr_1fr]">
          <div>
            <Logo href={null} />
            <p className="mt-4 max-w-xs text-sm text-[color:var(--muted)]">{SITE.tagline}.</p>
            <a
              href={`mailto:${SITE.email}`}
              className="mt-4 inline-block rounded-xs text-sm text-[color:var(--accent)] underline-offset-4 hover:underline"
            >
              {SITE.email}
            </a>
          </div>

          <nav aria-label="Soluções">
            <h2 className="rule-label text-[color:var(--muted)]">
              <Link href="/solucoes" className="hover:text-[color:var(--on-surface)]">
                Soluções
              </Link>
            </h2>
            <ul className="mt-4 space-y-2.5">
              {solutions.map((s) => (
                <li key={s.slug}>
                  <Link href={s.href} className="text-sm transition-colors hover:text-[color:var(--accent)]">
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
            <ul className="mt-4 space-y-2.5">
              {COUNTRY_CODES.map((code) => (
                <li key={code}>
                  <Link href={`/${code}`} className="text-sm transition-colors hover:text-[color:var(--accent)]">
                    {COUNTRIES[code].name}
                  </Link>
                  <ul className="mt-1.5 space-y-1">
                    {getSectorsForCountry(code)
                      .filter((s) => s.published)
                      .map((s) => (
                        <li key={s.sector}>
                          <Link href={s.href} className="text-[length:var(--text-micro)] text-[color:var(--muted)] transition-colors hover:text-[color:var(--on-surface)]">
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
            <ul className="mt-4 space-y-2.5">
              {NAV.primary.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="text-sm transition-colors hover:text-[color:var(--accent)]">
                    {item.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/diagnostico" className="text-sm transition-colors hover:text-[color:var(--accent)]">
                  Solicitar diagnóstico
                </Link>
              </li>
              <li>
                <Link href="/privacidade" className="text-sm transition-colors hover:text-[color:var(--accent)]">
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
