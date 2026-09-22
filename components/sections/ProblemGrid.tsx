import { Reveal } from '@/components/motion/Reveal';
import type { Problem } from '@/content/types';

/**
 * Linhas editoriais numeradas em vez de mosaico de cartões: a estrutura vem
 * da grelha e das réguas, não de contornos fechados.
 */
export function ProblemGrid({ items, columns = 2 }: { items: Problem[]; columns?: 2 | 3 | 4 }) {
  return (
    <Reveal className="mt-16">
      <ul className={columns >= 3 ? 'grid gap-x-10 md:grid-cols-2 xl:grid-cols-3' : 'grid gap-x-16 md:grid-cols-2'}>
        {items.map((p, i) => (
          <li
            key={p.title}
            data-animate
            className="group border-t border-[color:var(--hairline)] py-8 transition-colors duration-500 hover:border-[color:var(--accent)]"
          >
            <div className="flex items-start gap-6">
              <span className="rule-label mt-1.5 shrink-0 text-[color:var(--muted)] transition-colors duration-500 group-hover:text-[color:var(--accent)]">
                {String(i + 1).padStart(2, '0')}
              </span>
              <div>
                <h3 className="font-display text-[length:var(--text-h3)] font-semibold">{p.title}</h3>
                <p className="mt-3 max-w-[42ch] text-[color:var(--muted)]">{p.body}</p>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </Reveal>
  );
}
