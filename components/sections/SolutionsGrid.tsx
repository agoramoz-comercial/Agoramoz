import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { Reveal } from '@/components/motion/Reveal';
import { getSolutionSummaries } from '@/content/registry';

export function SolutionsGrid() {
  const solutions = getSolutionSummaries();

  return (
    <Reveal className="mt-12 grid gap-px overflow-hidden rounded-[--radius-lg] border border-[color:var(--border)] bg-[color:var(--border)] sm:grid-cols-2 lg:grid-cols-3">
      {solutions.map((s) => (
        <Link
          key={s.slug}
          href={s.href}
          data-animate
          className="group flex min-h-[11rem] flex-col justify-between bg-[color:var(--surface)] p-6 transition-colors hover:bg-[color:var(--surface-raised)]"
        >
          <div>
            <h3 className="font-display text-[length:var(--text-h3)]">{s.label}</h3>
            <p className="mt-2.5 text-sm text-[color:var(--muted)]">{s.short}</p>
          </div>
          <ArrowUpRight
            aria-hidden
            className="mt-6 size-5 text-[color:var(--accent)] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
          />
        </Link>
      ))}
    </Reveal>
  );
}
