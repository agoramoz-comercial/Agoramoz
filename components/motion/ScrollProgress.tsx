'use client';

import { useRef } from 'react';
import { gsap, useGSAP } from '@/lib/motion/register';
import { EASE } from '@/lib/motion/tokens';

/**
 * Barra de progresso de leitura. `scaleX` em vez de `width`: fica no
 * compositor e não provoca layout a cada frame.
 */
export function ScrollProgress() {
  const bar = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const mm = gsap.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.fromTo(
        bar.current,
        { scaleX: 0 },
        {
          scaleX: 1,
          transformOrigin: 'left center',
          ease: EASE.none,
          scrollTrigger: { start: 0, end: 'max', scrub: 0.3 },
        },
      );
    });
    return () => mm.revert();
  }, []);

  return (
    <div aria-hidden className="fixed inset-x-0 top-0 z-[70] h-px bg-transparent">
      <div ref={bar} className="h-full origin-left scale-x-0 bg-[color:var(--color-signal-500)]" />
    </div>
  );
}
