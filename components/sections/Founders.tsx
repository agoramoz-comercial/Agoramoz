import { Reveal } from '@/components/motion/Reveal';
import { FOUNDERS } from '@/content/site';

export function Founders() {
  return (
    <Reveal className="mt-16">
      <ul>
        {FOUNDERS.people.map((p, i) => (
          <li
            key={p.name}
            data-animate
            className="grid gap-6 border-t border-dashed border-[color:var(--hairline)] py-10 md:grid-cols-12 md:gap-10"
          >
            <span className="rule-label text-[color:var(--muted)] md:col-span-1">
              {String(i + 1).padStart(2, '0')}
            </span>

            <div className="md:col-span-5">
              <h3 className="font-display text-[length:var(--text-h2)] leading-[1.02] font-bold tracking-[var(--tracking-heading)]">
                {p.name}
              </h3>
              <p className="rule-label mt-3 text-[color:var(--accent)]">{p.role}</p>
            </div>

            <div className="md:col-span-6">
              <p className="max-w-[46ch] text-[color:var(--muted)]">{p.body}</p>
              <a
                href={p.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="rule-label mt-5 inline-flex items-center gap-2 text-[color:var(--accent)] transition-opacity hover:opacity-70"
              >
                Perfil público no LinkedIn
                <span aria-hidden>→</span>
              </a>
            </div>
          </li>
        ))}
      </ul>
    </Reveal>
  );
}
