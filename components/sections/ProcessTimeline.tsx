import { Reveal } from '@/components/motion/Reveal';
import { PROCESS } from '@/content/site';

export function ProcessTimeline() {
  return (
    <Reveal className="mt-12 grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
      {PROCESS.steps.map((s, i) => (
        <div key={s.title} data-animate className="border-t border-[color:var(--border)] pt-5">
          <span className="font-mono text-[length:var(--text-micro)] text-[color:var(--accent)]">
            {String(i + 1).padStart(2, '0')}
          </span>
          <h3 className="mt-2 font-display text-[length:var(--text-h3)]">{s.title}</h3>
          <p className="mt-2.5 text-sm text-[color:var(--muted)]">{s.body}</p>
        </div>
      ))}
    </Reveal>
  );
}
