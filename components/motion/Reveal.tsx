'use client';

import { useRef } from 'react';
import { gsap, useGSAP, ScrollTrigger } from '@/lib/motion/register';
import { DEV, DIST, DUR, EASE, STAGGER } from '@/lib/motion/tokens';

/**
 * Revelação em lote. Usa ScrollTrigger.batch — um observador para N filhos —
 * em vez de N ScrollTriggers independentes.
 *
 * Os filhos marcam-se com `data-animate`, que os esconde por CSS até o GSAP
 * os revelar com autoAlpha. Sem JS, o <noscript> do layout mantém-nos visíveis.
 */
export function Reveal({
  children,
  selector = '[data-animate]',
  stagger = STAGGER.base,
  distance = DIST.md,
  className,
}: {
  children: React.ReactNode;
  selector?: string;
  stagger?: number;
  distance?: number;
  className?: string;
}) {
  const scope = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const targets = gsap.utils.toArray<HTMLElement>(selector, scope.current);
      if (!targets.length) return;

      const mm = gsap.matchMedia();

      mm.add('(prefers-reduced-motion: reduce)', () => {
        gsap.set(targets, { autoAlpha: 1 });
      });

      mm.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.set(targets, { autoAlpha: 0, y: distance });
        ScrollTrigger.batch(targets, {
          start: 'top 88%',
          once: true,
          onEnter: (batch) =>
            gsap.to(batch, {
              autoAlpha: 1,
              y: 0,
              duration: DUR.md,
              ease: EASE.out,
              stagger,
              overwrite: true,
            }),
        });
        if (DEV) ScrollTrigger.refresh();
      });

      return () => mm.revert();
    },
    { scope },
  );

  return (
    <div ref={scope} className={className}>
      {children}
    </div>
  );
}
