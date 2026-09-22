'use client';

import { useRef } from 'react';
import { gsap, useGSAP } from '@/lib/motion/register';

/**
 * Atração magnética ao ponteiro. `quickTo` reutiliza uma tween por
 * propriedade — criar `gsap.to()` dentro de pointermove geraria dezenas de
 * tweens por segundo.
 *
 * Só em `(hover: hover) and (pointer: fine)`: em touch não há hover e o
 * efeito só custaria CPU no dispositivo onde ela é mais escassa.
 */
export function MagneticButton({
  children,
  strength = 0.28,
  className,
}: {
  children: React.ReactNode;
  strength?: number;
  className?: string;
}) {
  const wrap = useRef<HTMLSpanElement>(null);

  useGSAP(
    () => {
      const el = wrap.current;
      if (!el) return;

      const mm = gsap.matchMedia();
      mm.add('(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)', () => {
        const xTo = gsap.quickTo(el, 'x', { duration: 0.45, ease: 'power3.out' });
        const yTo = gsap.quickTo(el, 'y', { duration: 0.45, ease: 'power3.out' });

        const onMove = (e: PointerEvent) => {
          const r = el.getBoundingClientRect();
          xTo((e.clientX - (r.left + r.width / 2)) * strength);
          yTo((e.clientY - (r.top + r.height / 2)) * strength);
        };
        const onLeave = () => {
          xTo(0);
          yTo(0);
        };

        el.addEventListener('pointermove', onMove);
        el.addEventListener('pointerleave', onLeave);
        return () => {
          el.removeEventListener('pointermove', onMove);
          el.removeEventListener('pointerleave', onLeave);
        };
      });

      return () => mm.revert();
    },
    { scope: wrap },
  );

  return (
    <span ref={wrap} className={className} style={{ display: 'inline-block', willChange: 'transform' }}>
      {children}
    </span>
  );
}
