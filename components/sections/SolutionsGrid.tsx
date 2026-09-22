import Link from 'next/link';
import { Reveal } from '@/components/motion/Reveal';
import { getSolutionSummaries } from '@/content/registry';

/**
 * Índice editorial: cada capacidade é uma linha a toda a largura, com o
 * número, o nome em corpo display e o efeito a deslocar no hover. Substitui
 * a grelha de cartões — lê-se como sumário de publicação, não como catálogo.
 */
export function SolutionsGrid() {
  const solutions = getSolutionSummaries();

  return (
    <Reveal className="mt-16">
      <ul>
        {solutions.map((s, i) => (
          <li key={s.slug} data-animate>
            <Link
              href={s.href}
              className="group relative flex items-baseline gap-6 border-t border-dashed border-[color:var(--hairline)] py-7 transition-colors duration-500 hover:border-[color:var(--accent)] md:gap-10 md:py-9"
            >
              <span className="numeral shrink-0 text-[1.75rem] text-[color:var(--muted)] transition-colors duration-500 group-hover:text-[color:var(--accent)] md:text-[2.25rem]">
                {String(i + 1).padStart(2, '0')}
              </span>

              <span className="min-w-0 flex-1">
                <span className="block font-display text-[length:var(--text-h2)] leading-[1.05] font-bold tracking-[var(--tracking-heading)] transition-transform duration-500 ease-out group-hover:translate-x-2">
                  {s.label}
                </span>
                <span className="mt-2 block max-w-[46ch] text-[color:var(--muted)]">{s.short}</span>
              </span>

              <span
                aria-hidden
                className="shrink-0 self-center font-display text-2xl text-[color:var(--muted)] transition-all duration-500 group-hover:translate-x-1.5 group-hover:text-[color:var(--accent)]"
              >
                →
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </Reveal>
  );
}
