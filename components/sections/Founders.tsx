import { Reveal } from '@/components/motion/Reveal';
import { FOUNDERS } from '@/content/site';

export function Founders() {
  return (
    <Reveal className="mt-12 grid gap-8 md:grid-cols-2">
      {FOUNDERS.people.map((p) => (
        <div key={p.name} data-animate className="border-t border-[color:var(--border)] pt-6">
          <h3 className="font-display text-[length:var(--text-h3)]">{p.name}</h3>
          <p className="mt-1.5 font-mono text-[length:var(--text-micro)] tracking-[0.06em] text-[color:var(--accent)] uppercase">
            {p.role}
          </p>
          <p className="mt-4 text-[color:var(--muted)]">{p.body}</p>
          <a
            href={p.linkedin}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-block text-sm text-[color:var(--accent)] underline-offset-4 hover:underline"
          >
            Perfil público no LinkedIn
          </a>
        </div>
      ))}
    </Reveal>
  );
}
