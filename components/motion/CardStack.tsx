'use client';

import { useRef } from 'react';
import { gsap, useGSAP } from '@/lib/motion/register';
import { escalaCoberta } from '@/lib/motion/v2';
import { cn } from '@/lib/utils/cn';

/**
 * Efeito 05 (D-50): cartões empilhados.
 *
 * A pilha é CSS (`position: sticky` em cada `[data-cartao]`): funciona sem JS e
 * com movimento reduzido, e o scroll continua nativo. O GSAP só acrescenta a
 * profundidade: o cartão coberto encolhe e escurece um pouco, ligado ao scroll.
 * O `top` de cada cartão vem do componente que o usa (deixa espaço ao cabeçalho).
 * D-51: só abaixo de 1024px. No computador os cartões ficam numa grelha
 * desencontrada, sem pilha.
 */
export function CardStack({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const raiz = ref.current;
      if (!raiz) return;
      const cartoes = Array.from(raiz.querySelectorAll<HTMLElement>('[data-cartao]'));
      const mm = gsap.matchMedia();
      mm.add('(max-width: 1023px) and (prefers-reduced-motion: no-preference)', () => {
        const tweens = cartoes.slice(0, -1).map((c, i) =>
          gsap.to(c, {
            scale: escalaCoberta(i, cartoes.length),
            filter: 'brightness(0.92)',
            ease: 'none',
            transformOrigin: 'top center',
            scrollTrigger: { trigger: cartoes[i + 1], start: 'top 85%', end: 'top 30%', scrub: true },
          }),
        );
        return () => {
          tweens.forEach((t) => {
            t.scrollTrigger?.kill();
            t.kill();
          });
          gsap.set(cartoes, { clearProps: 'transform,filter' });
        };
      });
      return () => mm.revert();
    },
    { scope: ref },
  );

  return (
    <div ref={ref} className={cn('grid', className)}>
      {children}
    </div>
  );
}
