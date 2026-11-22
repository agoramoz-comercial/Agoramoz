'use client';

import { Children, useRef } from 'react';
import { gsap, useGSAP, ScrollTrigger } from '@/lib/motion/register';
import { cn } from '@/lib/utils/cn';
import { COM_MOVIMENTO } from './util';

/**
 * Cartões que se empilham: cada filho fica colado ao topo (CSS `sticky`, com
 * um degrau de 1,25 rem por cartão) e, quando o seguinte lhe passa por cima,
 * encolhe para 0,92 e escurece. O empilhamento em si é CSS — funciona sem JS
 * e com movimento reduzido; o GSAP só acrescenta a escala e o escurecer.
 *
 * Cada filho deve ter fundo próprio (opaco), senão vê-se o de baixo.
 */
export function CartoesEmpilhados({ className, children }: { className?: string; children: React.ReactNode[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const itens = Children.toArray(children);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      const mm = gsap.matchMedia();
      mm.add(COM_MOVIMENTO, () => {
        const cartoes = gsap.utils.toArray<HTMLElement>('[data-cartao]', el);
        const gatilhos = cartoes.slice(0, -1).map((cartao, i) => {
          const seguinte = cartoes[i + 1]!;
          const alvo = cartao.firstElementChild as HTMLElement | null;
          return ScrollTrigger.create({
            trigger: seguinte,
            start: 'top bottom',
            end: () => `top ${parseFloat(window.getComputedStyle(seguinte).top) || 0}px`,
            scrub: true,
            invalidateOnRefresh: true,
            animation: gsap.to(alvo, { scale: 0.92, filter: 'brightness(0.55)', ease: 'none' }),
          });
        });
        return () => gatilhos.forEach((g) => g.kill());
      });
      return () => mm.revert();
    },
    { scope: ref, dependencies: [itens.length] },
  );

  return (
    <div ref={ref} className={cn('relative', className)}>
      {itens.map((filho, i) => (
        <div
          key={i}
          data-cartao
          className="sticky mb-6 last:mb-0"
          style={{ top: `calc(5.5rem + ${i * 1.25}rem)`, zIndex: i + 1 }}
        >
          <div className="origin-top will-change-transform">{filho}</div>
        </div>
      ))}
    </div>
  );
}
