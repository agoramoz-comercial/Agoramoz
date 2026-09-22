import Link from 'next/link';
import { Reveal } from '@/components/motion/Reveal';
import { COUNTRIES, COUNTRY_CODES } from '@/content/registry';

export function CountriesBand() {
  return (
    <Reveal className="mt-16">
      <ul className="grid lg:grid-cols-3">
        {COUNTRY_CODES.map((code, i) => {
          const c = COUNTRIES[code];
          return (
            <li key={code} data-animate className="lg:border-l lg:border-[color:var(--hairline)] lg:first:border-l-0">
              <Link
                href={`/${code}`}
                className="group flex h-full flex-col justify-between border-t border-dashed border-[color:var(--hairline)] py-8 lg:border-t-0 lg:px-8 lg:first:pl-0 lg:last:pr-0"
              >
                <div>
                  <div className="flex items-baseline gap-4">
                    <span className="rule-label text-[color:var(--muted)]">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className="rule-label text-[color:var(--accent)]">{c.locale}</span>
                  </div>

                  <h3 className="mt-6 font-display text-[length:var(--text-h2)] leading-[1.02] font-bold tracking-[var(--tracking-heading)] transition-transform duration-500 group-hover:translate-x-1.5">
                    {c.name}
                  </h3>

                  <p className="mt-5 text-[color:var(--muted)]">{c.positioning}</p>
                </div>

                <span className="rule-label mt-8 inline-flex items-center gap-2 text-[color:var(--accent)]">
                  Explorar {c.name}
                  <span aria-hidden className="transition-transform duration-500 group-hover:translate-x-1">
                    →
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </Reveal>
  );
}
