'use client';

import { useRef } from 'react';
import { gsap, useGSAP } from '@/lib/motion/register';
import { valorNaContagem } from '@/lib/motion/v2';

/**
 * Efeito 02 (D-50): o número conta até ao valor quando entra no ecrã.
 *
 * O HTML servido traz já o valor final: sem JS, com movimento reduzido ou num
 * leitor de ecrã, lê-se o número certo. A contagem só corre com movimento
 * normal, e uma vez. Só para números reais da AGORAMOZ (`content/types.ts`).
 */
export function CountUp({ valor, className }: { valor: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        const estado = { p: 0 };
        const tween = gsap.to(estado, {
          p: 1,
          duration: 1.6,
          ease: 'power3.out',
          paused: true,
          onUpdate: () => {
            el.textContent = String(valorNaContagem(estado.p, valor));
          },
          scrollTrigger: { trigger: el, start: 'top 88%', once: true, onEnter: () => tween.play(0) },
        });
        return () => {
          tween.kill();
          el.textContent = String(valor);
        };
      });
      return () => mm.revert();
    },
    { scope: ref, dependencies: [valor] },
  );

  return (
    <span ref={ref} className={className} style={{ fontVariantNumeric: 'tabular-nums' }}>
      {valor}
    </span>
  );
}
