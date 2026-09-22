'use client';

import { useRef } from 'react';
import { gsap, useGSAP } from '@/lib/motion/register';
import { DEV, DUR, EASE } from '@/lib/motion/tokens';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { SYSTEM_FLOW } from '@/content/site';

/**
 * Scroll horizontal sem pin.
 *
 * A versão com `pin: true` produzia CLS de 0,99: o pin-spacer do ScrollTrigger
 * cresce a altura do documento quando é criado e outra vez quando o refresh
 * pós-carregamento das fontes recalcula a distância — e tudo o que está abaixo
 * salta duas vezes.
 *
 * Aqui a altura é reservada em CSS (`lg:h-[280vh]`) desde o primeiro paint e
 * o sticky é nativo, pelo que não há inserção de espaço nem salto. O
 * ScrollTrigger limita-se a fazer scrub do `x` da pista dentro do intervalo
 * que a secção já ocupa.
 *
 * `end` depende do layout, por isso é função, com `invalidateOnRefresh` para
 * recalcular no resize. `ease: none` é obrigatório num scrub 1:1.
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
          const distance = () => Math.max(0, el.scrollWidth - el.clientWidth);
          if (distance() <= 0) return;

          const tween = gsap.to(el, {
            x: () => -distance(),
            ease: EASE.none,
            scrollTrigger: {
              id: 'flow-scrub',
              trigger: scope.current,
              start: 'top top',
              end: 'bottom bottom',
              scrub: 1,
              invalidateOnRefresh: true,
              markers: DEV,
            },
          });

          return () => {
            tween.scrollTrigger?.kill();
            tween.kill();
          };
        },
      );

      // Mobile e tablet: lista vertical, revelação simples, sem sticky.
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
    <div ref={scope} className="lg:h-[280vh]">
      <div className="lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:justify-center lg:overflow-hidden">
        <div
          style={{ maxWidth: 'var(--container-max)', paddingInline: 'var(--container-gutter)' }}
          className="mx-auto w-full"
        >
          <div className="rule flex items-baseline gap-4 pt-6">
            <span className="rule-label text-[color:var(--muted)]">05</span>
            <Eyebrow>{SYSTEM_FLOW.eyebrow}</Eyebrow>
          </div>
          <h2 className="mt-8 max-w-[18ch] text-[length:var(--text-h1)] leading-[var(--leading-display)] font-bold tracking-[var(--tracking-display)]">
            {SYSTEM_FLOW.title}
          </h2>
          <p className="mt-8 max-w-[52ch] text-[length:var(--text-lead)] text-[color:var(--muted)]">
            {SYSTEM_FLOW.lead}
          </p>
        </div>

        <ol
          ref={track}
          className="mt-12 flex flex-col gap-10 lg:mt-16 lg:flex-row lg:gap-14 lg:will-change-transform"
          style={{ paddingInline: 'var(--container-gutter)' }}
        >
          {SYSTEM_FLOW.steps.map((s, i) => (
            <li key={s.key} data-flow-step className="lg:w-[24rem] lg:shrink-0">
              <div className="border-t border-[color:var(--hairline)] pt-6">
                <span className="rule-label text-[color:var(--accent)]">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <h3 className="mt-4 font-display text-[length:var(--text-h2)] leading-[1.02] font-bold tracking-[var(--tracking-heading)]">
                  {s.title}
                </h3>
                <p className="mt-4 max-w-[38ch] text-[color:var(--muted)]">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
