'use client';

import { useRef } from 'react';
import { gsap, useGSAP } from '@/lib/motion/register';
import { DEV, DUR, EASE, STAGGER } from '@/lib/motion/tokens';
import { PROCESS } from '@/content/site';

/**
 * Régua de progresso ligada ao scroll: `scaleY` com transformOrigin no topo,
 * scrub 1:1. Fica no compositor — nenhum frame provoca layout.
 *
 * Um único ScrollTrigger, na timeline de topo. Em reduced-motion a régua é
 * estática e os passos entram sem deslocação.
 */
export function ProcessTimeline() {
  const scope = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add('(prefers-reduced-motion: reduce)', () => {
        gsap.set(scope.current!.querySelectorAll('[data-step]'), { autoAlpha: 1 });
        gsap.set(scope.current!.querySelector('[data-rail]'), { scaleY: 1 });
      });

      mm.add('(prefers-reduced-motion: no-preference)', () => {
        const rail = scope.current!.querySelector('[data-rail]');
        const steps = gsap.utils.toArray<HTMLElement>('[data-step]', scope.current);

        gsap.fromTo(
          rail,
          { scaleY: 0 },
          {
            scaleY: 1,
            transformOrigin: 'top center',
            ease: EASE.none,
            scrollTrigger: {
              trigger: scope.current,
              start: 'top 70%',
              end: 'bottom 80%',
              scrub: 0.4,
              markers: DEV,
            },
          },
        );

        gsap.from(steps, {
          autoAlpha: 0,
          y: 28,
          duration: DUR.md,
          stagger: STAGGER.base,
          ease: EASE.out,
          scrollTrigger: { trigger: scope.current, start: 'top 75%', once: true },
        });
      });

      return () => mm.revert();
    },
    { scope },
  );

  return (
    <div ref={scope} className="relative mt-16 pl-8 md:pl-16">
      {/* Régua vertical: o traço estático e o traço que cresce com o scroll. */}
      <div aria-hidden className="absolute top-0 bottom-0 left-0 w-px bg-[color:var(--hairline)]" />
      <div
        aria-hidden
        data-rail
        className="absolute top-0 bottom-0 left-0 w-px origin-top scale-y-0 bg-[color:var(--accent)]"
      />

      <ol className="grid gap-x-16 gap-y-12 md:grid-cols-2">
        {PROCESS.steps.map((s, i) => (
          <li key={s.title} data-step className="relative">
            <span
              aria-hidden
              className="absolute top-2 -left-8 size-1.5 bg-[color:var(--accent)] md:-left-16"
            />
            <span className="rule-label text-[color:var(--muted)]">
              {String(i + 1).padStart(2, '0')}
            </span>
            <h3 className="mt-3 font-display text-[length:var(--text-h3)] font-semibold">{s.title}</h3>
            <p className="mt-3 max-w-[44ch] text-[color:var(--muted)]">{s.body}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
