'use client';

import { useRef } from 'react';
import { gsap, useGSAP } from '@/lib/motion/register';
import { DEV, DUR, EASE } from '@/lib/motion/tokens';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { SYSTEM_FLOW } from '@/content/site';

/**
 * O único pin da página. Em desktop, os 7 passos correm na horizontal com
 * scrub 1:1 e a linha de ligação é desenhada em sincronia (DrawSVG).
 *
 * `end` é função de `scrollWidth` (regra 2) e `invalidateOnRefresh` recalcula
 * no resize. Em mobile e em reduced-motion o pin nunca é criado: a lista fica
 * empilhada na vertical e totalmente percorrível por teclado.
 */
export function FlowDiagram() {
  const scope = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLOListElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add(
        { isDesktop: '(min-width: 1024px) and (prefers-reduced-motion: no-preference)' },
        (ctx) => {
          if (!ctx.conditions?.isDesktop) return;

          const el = track.current!;
          const distance = () => el.scrollWidth - el.clientWidth;
          if (distance() <= 0) return;

          const tl = gsap.timeline({
            scrollTrigger: {
              id: 'flow-pin',
              trigger: scope.current,
              start: 'top top',
              end: () => `+=${distance()}`,
              pin: true,
              scrub: 1,
              invalidateOnRefresh: true,
              anticipatePin: 1,
              markers: DEV,
            },
          });

          tl.to(el, { x: () => -distance(), ease: EASE.none });

          const line = scope.current!.querySelector('[data-flow-line]');
          if (line) {
            tl.fromTo(line, { drawSVG: '0%' }, { drawSVG: '100%', ease: EASE.none }, 0);
          }

          return () => {
            tl.scrollTrigger?.kill();
            tl.kill();
          };
        },
      );

      // Mobile / reduced-motion: revelação simples, sem pin.
      mm.add('(max-width: 1023px), (prefers-reduced-motion: reduce)', () => {
        const steps = scope.current!.querySelectorAll('[data-flow-step]');
        gsap.from(steps, {
          autoAlpha: 0,
          y: 20,
          duration: DUR.sm,
          stagger: 0.06,
          scrollTrigger: { trigger: scope.current, start: 'top 80%', once: true },
        });
      });

      return () => mm.revert();
    },
    { scope },
  );

  return (
    <div ref={scope} className="overflow-hidden">
      <div style={{ maxWidth: 'var(--container-max)', paddingInline: 'var(--container-gutter)' }} className="mx-auto">
        <Eyebrow>{SYSTEM_FLOW.eyebrow}</Eyebrow>
        <h2 className="mt-4 max-w-[22ch] text-[length:var(--text-h2)]">{SYSTEM_FLOW.title}</h2>
        <p className="mt-5 max-w-[46rem] text-[length:var(--text-lead)] text-[color:var(--muted)]">
          {SYSTEM_FLOW.lead}
        </p>
      </div>

      <div className="relative mt-14">
        {/* Linha de ligação — decorativa, escondida dos leitores de ecrã */}
        <svg
          aria-hidden
          className="pointer-events-none absolute top-[2.15rem] left-0 hidden h-px w-full lg:block"
          preserveAspectRatio="none"
          viewBox="0 0 1000 1"
        >
          <line data-flow-line x1="0" y1="0.5" x2="1000" y2="0.5" stroke="var(--accent)" strokeWidth="1" />
        </svg>

        <ol
          ref={track}
          className="flex flex-col gap-8 lg:flex-row lg:gap-10 lg:will-change-transform"
          style={{ paddingInline: 'var(--container-gutter)' }}
        >
          {SYSTEM_FLOW.steps.map((s, i) => (
            <li key={s.key} data-flow-step className="lg:w-[22rem] lg:shrink-0">
              <div className="flex items-center gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-full border border-[color:var(--accent)] bg-[color:var(--surface)] font-mono text-[length:var(--text-micro)] text-[color:var(--accent)]">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <h3 className="font-display text-[length:var(--text-h3)]">{s.title}</h3>
              </div>
              <p className="mt-3 text-[color:var(--muted)]">{s.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
