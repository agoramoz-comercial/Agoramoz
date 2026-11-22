'use client';

import { useRef } from 'react';
import { gsap, useGSAP } from '@/lib/motion/register';
import { cn } from '@/lib/utils/cn';
import { COM_MOVIMENTO, ehRtl } from './util';

/**
 * Pista horizontal presa ao scroll (a «pista de projectos» do melon). A partir
 * de 1024 px, a secção fica presa e o scroll vertical desloca a pista na
 * horizontal; em RTL desloca para o outro lado. Abaixo de 1024 px ou com
 * movimento reduzido, os filhos são uma lista vertical normal.
 *
 * `overflow: clip` no contentor: a pista nunca alarga o documento.
 * Os filhos dão a largura de cada painel (ex.: `w-[34rem] shrink-0`).
 */
export function PinHorizontal({ className, children }: { className?: string; children: React.ReactNode }) {
  const caixa = useRef<HTMLDivElement>(null);
  const pista = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = caixa.current;
      const p = pista.current;
      if (!el || !p) return;
      const mm = gsap.matchMedia();
      mm.add(`(min-width: 1024px) and ${COM_MOVIMENTO}`, () => {
        const rtl = ehRtl(el);
        const distancia = () => Math.max(0, p.scrollWidth - el.clientWidth);
        // A linha só existe com JS e movimento: sem eles, a lista vertical
        // mostra tudo (uma linha cortada sem pin esconderia painéis).
        gsap.set(p, { flexDirection: 'row', flexWrap: 'nowrap', width: 'max-content' });
        const tween = gsap.to(p, {
          x: () => (rtl ? distancia() : -distancia()),
          ease: 'none',
          scrollTrigger: {
            trigger: el,
            start: 'top top',
            end: () => `+=${distancia()}`,
            pin: true,
            scrub: 0.6,
            invalidateOnRefresh: true,
            anticipatePin: 1,
          },
        });
        return () => {
          tween.scrollTrigger?.kill();
          tween.kill();
          gsap.set(p, { clearProps: 'transform,flexDirection,flexWrap,width' });
        };
      });
      return () => mm.revert();
    },
    { scope: caixa },
  );

  return (
    <div ref={caixa} className={cn('relative [overflow:clip]', className)}>
      <div
        ref={pista}
        className="flex flex-col gap-6"
      >
        {children}
      </div>
    </div>
  );
}
