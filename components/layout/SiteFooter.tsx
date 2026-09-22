import Link from 'next/link';
import { Logo } from '@/components/brand/Logo';
import { NAV, SITE } from '@/content/site';
import { COUNTRIES, COUNTRY_CODES, getSectorsForCountry } from '@/content/registry';
import { MotionToggle } from '@/components/motion/MotionToggle';

export function SiteFooter() {
  return (
    <footer data-surface="deep" className="bg-[color:var(--surface)] text-[color:var(--on-surface)]">
      <div
        className="mx-auto w-full py-16"
        style={{ maxWidth: 'var(--container-max)', paddingInline: 'var(--container-gutter)' }}
      >
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
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
            <h2 className="font-mono text-[length:var(--text-micro)] tracking-[var(--tracking-eyebrow)] text-[color:var(--muted)] uppercase">
              Soluções
            </h2>
            <ul className="mt-4 space-y-2.5">
              {NAV.solutions.map((s) => (
                <li key={s.slug}>
                  <Link href={`/solucoes/${s.slug}`} className="text-sm hover:text-[color:var(--accent)]">
                    {s.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Mercados">
            <h2 className="font-mono text-[length:var(--text-micro)] tracking-[var(--tracking-eyebrow)] text-[color:var(--muted)] uppercase">
              Mercados
            </h2>
            <ul className="mt-4 space-y-2.5">
              {COUNTRY_CODES.map((code) => (
                <li key={code}>
                  <Link href={`/${code}`} className="text-sm hover:text-[color:var(--accent)]">
                    {COUNTRIES[code].name}
                  </Link>
                  <ul className="mt-1.5 space-y-1">
                    {getSectorsForCountry(code)
                      .filter((s) => s.published)
                      .map((s) => (
                        <li key={s.sector}>
                          <Link href={s.href} className="text-[length:var(--text-micro)] text-[color:var(--muted)] hover:text-[color:var(--on-surface)]">
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
            <h2 className="font-mono text-[length:var(--text-micro)] tracking-[var(--tracking-eyebrow)] text-[color:var(--muted)] uppercase">
              Empresa
            </h2>
            <ul className="mt-4 space-y-2.5">
              {NAV.primary.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="text-sm hover:text-[color:var(--accent)]">
                    {item.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/diagnostico" className="text-sm hover:text-[color:var(--accent)]">
                  Solicitar diagnóstico
                </Link>
              </li>
              <li>
                <Link href="/privacidade" className="text-sm hover:text-[color:var(--accent)]">
                  Privacidade
                </Link>
              </li>
            </ul>
          </nav>
        </div>

        <div className="mt-14 flex flex-col gap-4 border-t border-[color:var(--border)] pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[length:var(--text-micro)] text-[color:var(--muted)]">
            © {new Date().getFullYear()} AGORAMOZ. Todos os direitos reservados.
          </p>
          <MotionToggle />
        </div>
      </div>
    </footer>
  );
}
