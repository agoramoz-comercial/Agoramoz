'use client';

import { useRef } from 'react';
import { gsap, useGSAP } from '@/lib/motion/register';

/**
 * Cursor substituto. `xPercent/yPercent: -50` centra sem tocar em left/top,
 * e `quickTo` mantém uma única tween por eixo.
 *
 * Só em ponteiro fino com hover. O cursor nativo NÃO é escondido: sobrepor
 * um ponto ao cursor real dá o efeito sem tirar a affordance a quem depende
 * dela — e nunca sobre campos de texto, onde o I-beam é informação.
 */
export function CustomCursor() {
  const dot = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const el = dot.current;
    if (!el) return;

    const mm = gsap.matchMedia();
    mm.add('(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)', () => {
      gsap.set(el, { xPercent: -50, yPercent: -50, autoAlpha: 0 });

      const xTo = gsap.quickTo(el, 'x', { duration: 0.32, ease: 'power3' });
      const yTo = gsap.quickTo(el, 'y', { duration: 0.32, ease: 'power3' });

      const onMove = (e: PointerEvent) => {
        xTo(e.clientX);
        yTo(e.clientY);
        gsap.to(el, { autoAlpha: 1, duration: 0.2, overwrite: 'auto' });

        const interactive = (e.target as Element | null)?.closest?.('a, button, [role="radio"]');
        gsap.to(el, { scale: interactive ? 3.2 : 1, duration: 0.25, overwrite: 'auto' });
      };
      const onLeave = () => gsap.to(el, { autoAlpha: 0, duration: 0.2 });

      window.addEventListener('pointermove', onMove);
      document.addEventListener('pointerleave', onLeave);
      return () => {
        window.removeEventListener('pointermove', onMove);
        document.removeEventListener('pointerleave', onLeave);
      };
    });

    return () => mm.revert();
  }, []);

  return (
    <div
      ref={dot}
      aria-hidden
      className="pointer-events-none fixed top-0 left-0 z-[80] size-2.5 rounded-full bg-[color:var(--color-signal-500)] opacity-0 mix-blend-difference"
    />
  );
}
