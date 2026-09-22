import Link from 'next/link';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { CTA, OFFER } from '@/content/site';

export function OfferSection({ href = '/diagnostico' }: { href?: string }) {
  return (
    <div className="grid gap-12 lg:grid-cols-[1fr_1.1fr] lg:items-start">
      <div>
        <Eyebrow>{OFFER.eyebrow}</Eyebrow>
        <h2 className="mt-4 text-[length:var(--text-h2)]">{OFFER.title}</h2>
        <p className="mt-5 font-mono text-sm tracking-[0.04em] text-[color:var(--accent)] uppercase">
          {OFFER.name}
        </p>
        <p className="mt-4 max-w-[38rem] text-[length:var(--text-lead)] text-[color:var(--muted)]">
          {OFFER.promise}
        </p>
        <Button asChild size="lg" className="mt-8">
          <Link href={href}>{CTA.primary}</Link>
        </Button>
        <p className="mt-4 font-mono text-[length:var(--text-micro)] text-[color:var(--muted)]">{OFFER.note}</p>
      </div>

      <div className="rounded-[--radius-xl] border border-[color:var(--border)] bg-[color:var(--surface-raised)] p-7 md:p-9">
        <h3 className="font-display text-[length:var(--text-h3)]">O que recebe</h3>
        <ul className="mt-6 space-y-3.5">
          {OFFER.deliverables.map((d) => (
            <li key={d} className="flex items-start gap-3">
              <Check aria-hidden className="mt-1 size-4 shrink-0 text-[color:var(--ok)]" />
              <span className="text-sm text-[color:var(--muted)]">{d}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
