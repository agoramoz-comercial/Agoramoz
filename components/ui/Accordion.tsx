'use client';

import * as RA from '@radix-ui/react-accordion';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

/** Sem GSAP por opção: grid-template-rows é mais barato e mantém aria-expanded simples. */
export function Accordion({
  items,
  className,
}: {
  items: { q: string; a: string }[];
  className?: string;
}) {
  return (
    <RA.Root type="single" collapsible className={cn('divide-y divide-[color:var(--hairline)] border-y border-[color:var(--hairline)]', className)}>
      {items.map((item, i) => (
        <RA.Item key={i} value={`item-${i}`} className="group">
          <RA.Header>
            <RA.Trigger className="flex w-full items-start justify-between gap-6 py-7 text-left">
              <span className="font-display text-[1.125rem] font-semibold tracking-[-0.02em] md:text-[1.375rem]">
                {item.q}
              </span>
              <Plus
                aria-hidden
                className="mt-0.5 size-5 shrink-0 text-[color:var(--accent)] transition-transform duration-200 group-data-[state=open]:rotate-45"
              />
            </RA.Trigger>
          </RA.Header>
          <RA.Content className="grid grid-rows-[0fr] overflow-hidden transition-[grid-template-rows] duration-300 ease-out data-[state=open]:grid-rows-[1fr]">
            <div className="min-h-0">
              <p className="max-w-[46rem] pb-6 text-[color:var(--muted)]">{item.a}</p>
            </div>
          </RA.Content>
        </RA.Item>
      ))}
    </RA.Root>
  );
}
