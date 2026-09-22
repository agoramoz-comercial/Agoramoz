import { Card } from '@/components/ui/Card';
import { Reveal } from '@/components/motion/Reveal';
import type { Problem } from '@/content/types';

export function ProblemGrid({ items, columns = 4 }: { items: Problem[]; columns?: 2 | 3 | 4 }) {
  return (
    <Reveal
      className={`mt-12 grid gap-5 sm:grid-cols-2 ${columns === 4 ? 'lg:grid-cols-4' : columns === 3 ? 'lg:grid-cols-3' : ''}`}
    >
      {items.map((p) => (
        <Card key={p.title} data-animate>
          <h3 className="font-display text-[1.0625rem] font-semibold">{p.title}</h3>
          <p className="mt-2.5 text-sm text-[color:var(--muted)]">{p.body}</p>
        </Card>
      ))}
    </Reveal>
  );
}
