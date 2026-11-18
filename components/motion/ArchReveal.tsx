'use client';

import { useRef } from 'react';
import { gsap, useGSAP } from '@/lib/motion/register';
import { ARCO } from '@/lib/motion/v2';
import { cn } from '@/lib/utils/cn';

/**
 * Efeito 06 (D-50): o arco da identidade AGORAMOZ abre-se até ocupar a secção.
 *
 * A forma é um fundo azul por trás do conteúdo. Servido aberto (secção inteira
 * azul): sem JS e com movimento reduzido, a secção está completa e legível. Com
 * movimento normal, o arco começa fechado e abre com o scroll.
 *
 * O texto é branco: fora do arco cairia sobre o papel e não se leria. Por isso
 * o conteúdo fica numa coluna central que cabe no arco fechado (64% da largura,
 * abaixo do topo) e o efeito só corre a partir de 768px. No telemóvel a coluna
 * seria estreita demais, e a secção aparece já aberta.
 */
export function ArchReveal({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const raiz = ref.current;
      if (!raiz) return;
      const forma = raiz.querySelector<HTMLElement>('[data-arco]');
      const mm = gsap.matchMedia();
      mm.add('(min-width: 768px) and (prefers-reduced-motion: no-preference)', () => {
        const tween = gsap.fromTo(
          forma,
          { clipPath: ARCO.fechado },
          {
            clipPath: ARCO.aberto,
            ease: 'none',
            scrollTrigger: { trigger: raiz, start: 'top 85%', end: 'top 15%', scrub: true },
          },
        );
        return () => {
          tween.scrollTrigger?.kill();
          tween.kill();
          gsap.set(forma, { clearProps: 'clipPath' });
        };
      });
      return () => mm.revert();
    },
    { scope: ref },
  );

  return (
    <div ref={ref} data-surface="azul" className={cn('relative isolate overflow-hidden text-[color:var(--on-surface)]', className)}>
      <div aria-hidden data-arco className="absolute inset-0 -z-10 bg-[color:var(--surface)]" />
      <div className="mx-auto w-full px-6 pb-[clamp(3rem,8vw,7rem)] pt-[clamp(5rem,14vw,12rem)] md:w-[60%] md:px-0">{children}</div>
    </div>
  );
}
