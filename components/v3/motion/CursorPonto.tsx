'use client';

import { useRef } from 'react';
import { gsap, useGSAP } from '@/lib/motion/register';
import { PONTEIRO_FINO } from './util';

/**
 * Ponto que segue o cursor e cresce sobre links e botões. Só com ponteiro
 * fino e sem movimento reduzido; o cursor do sistema continua visível (o
 * ponto acompanha, não substitui — nunca esconder o cursor real).
 * `mix-blend-mode: difference` para se ver em fundo claro e escuro.
 */
export function CursorPonto() {
  const ponto = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const el = ponto.current;
    if (!el) return;
    const mm = gsap.matchMedia();
    mm.add(PONTEIRO_FINO, () => {
      gsap.set(el, { xPercent: -50, yPercent: -50, autoAlpha: 0 });
      const xTo = gsap.quickTo(el, 'x', { duration: 0.35, ease: 'power3.out' });
      const yTo = gsap.quickTo(el, 'y', { duration: 0.35, ease: 'power3.out' });
      let visivel = false;
      const mover = (e: PointerEvent) => {
        if (e.pointerType !== 'mouse') return;
        if (!visivel) {
          visivel = true;
          gsap.set(el, { x: e.clientX, y: e.clientY });
          gsap.to(el, { autoAlpha: 1, duration: 0.2 });
        }
        xTo(e.clientX);
        yTo(e.clientY);
        const sobre = (e.target as Element | null)?.closest?.('a, button, [role="button"], summary, label');
        gsap.to(el, { scale: sobre ? 4.5 : 1, duration: 0.35, ease: 'power3.out', overwrite: 'auto' });
      };
      const sair = () => {
        visivel = false;
        gsap.to(el, { autoAlpha: 0, duration: 0.2 });
      };
      window.addEventListener('pointermove', mover, { passive: true });
      document.documentElement.addEventListener('pointerleave', sair);
      return () => {
        window.removeEventListener('pointermove', mover);
        document.documentElement.removeEventListener('pointerleave', sair);
      };
    });
    return () => mm.revert();
  }, []);

  return (
    <div
      ref={ponto}
      aria-hidden
      className="pointer-events-none fixed top-0 left-0 z-[180] h-2.5 w-2.5 rounded-full bg-[#efe8da] mix-blend-difference"
      style={{ visibility: 'hidden' }}
    />
  );
}
