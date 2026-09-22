import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { MagneticButton } from '@/components/motion/MagneticButton';
import { SplitHeading } from '@/components/motion/SplitHeading';
import { Reveal } from '@/components/motion/Reveal';
import { CTA, OFFER } from '@/content/site';

export function OfferSection({ href = '/diagnostico' }: { href?: string }) {
  return (
    <div className="grid gap-14 lg:grid-cols-12 lg:gap-16">
      <div className="lg:col-span-6">
        <div className="flex items-baseline gap-4">
          <span className="rule-label text-[color:var(--muted)]">{OFFER.eyebrow}</span>
          <span className="rule-label text-[color:var(--accent)]">{OFFER.name}</span>
        </div>

        <SplitHeading
          as="h2"
          className="mt-8 max-w-[15ch] text-[length:var(--text-h1)] leading-[var(--leading-display)] font-bold tracking-[var(--tracking-display)]"
        >
          {OFFER.title}
        </SplitHeading>

        <p className="mt-8 max-w-[44ch] text-[length:var(--text-lead)] text-[color:var(--muted)]">
          {OFFER.promise}
        </p>

        <MagneticButton className="mt-10 inline-block">
          <Button asChild size="lg">
            <Link href={href}>
              {CTA.primary}
              <span aria-hidden className="transition-transform duration-300 group-hover:translate-x-1">
                →
              </span>
            </Link>
          </Button>
        </MagneticButton>

        <p className="rule-label mt-5 text-[color:var(--muted)]">{OFFER.note}</p>
      </div>

      <Reveal className="lg:col-span-6">
        <p className="rule-label text-[color:var(--muted)]">O que recebe</p>
        <ol className="mt-8">
          {OFFER.deliverables.map((d, i) => (
            <li
              key={d}
              data-animate
              className="flex items-baseline gap-6 border-t border-dashed border-[color:var(--hairline)] py-4"
            >
              <span className="rule-label shrink-0 text-[color:var(--accent)]">
                {String(i + 1).padStart(2, '0')}
              </span>
              <span className="text-[color:var(--muted)]">{d}</span>
            </li>
          ))}
        </ol>
      </Reveal>
    </div>
  );
}
