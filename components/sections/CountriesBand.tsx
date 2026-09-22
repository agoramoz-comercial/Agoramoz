import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Reveal } from '@/components/motion/Reveal';
import { COUNTRIES, COUNTRY_CODES } from '@/content/registry';

export function CountriesBand() {
  return (
    <Reveal className="mt-12 grid gap-5 md:grid-cols-3">
      {COUNTRY_CODES.map((code) => {
        const c = COUNTRIES[code];
        return (
          <Link
            key={code}
            href={`/${code}`}
            data-animate
            className="group flex flex-col justify-between rounded-[--radius-lg] border border-[color:var(--border)] p-7 transition-colors hover:border-[color:var(--accent)]"
          >
            <div>
              <p className="font-mono text-[length:var(--text-micro)] tracking-[var(--tracking-eyebrow)] text-[color:var(--accent)] uppercase">
                {c.name}
              </p>
              <p className="mt-4 text-[color:var(--muted)]">{c.positioning}</p>
            </div>
            <span className="mt-7 inline-flex items-center gap-1.5 text-sm font-medium text-[color:var(--accent)]">
              Explorar {c.name}
              <ArrowRight aria-hidden className="size-4 transition-transform group-hover:translate-x-0.5" />
            </span>
          </Link>
        );
      })}
    </Reveal>
  );
}
