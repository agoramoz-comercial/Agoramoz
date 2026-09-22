'use client';

import { useRef } from 'react';
import { gsap, useGSAP, SplitText, ScrollTrigger } from '@/lib/motion/register';
import { DUR, EASE, STAGGER } from '@/lib/motion/tokens';
import { cn } from '@/lib/utils/cn';

type Props = {
  children: string;
  as?: 'h1' | 'h2' | 'h3' | 'p';
  className?: string;
  id?: string;
  /** `load` anima de imediato (hero); `scroll` espera pelo viewport. */
  trigger?: 'load' | 'scroll';
  delay?: number;
};

/**
 * Revelação por linha com máscara — o efeito de "subir de trás de uma aresta".
 *
 * `autoSplit` volta a dividir quando a fonte assenta ou a largura muda, e a
 * animação é criada dentro de `onSplit` para que o re-split a sincronize em
 * vez de a deixar a apontar para nós que já não existem.
 *
 * `aria: 'auto'` põe aria-label no pai e aria-hidden nos fragmentos, senão um
 * leitor de ecrã soletra o título linha a linha.
 */
export function SplitHeading({
  children,
  as: As = 'h2',
  className,
  id,
  trigger = 'scroll',
  delay = 0,
}: Props) {
  const ref = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;

      const mm = gsap.matchMedia();

      /**
       * Dividir texto custa. Medido com throttling de CPU 4x, dividir todos os
       * cabeçalhos produzia tarefas longas de ~300 ms e empurrava o LCP móvel
       * para 2,48 s. Abaixo de 1024px o efeito passa a fade simples: o mesmo
       * vocabulário, sem o custo — e o mercado principal é mobile.
       */
      mm.add('(prefers-reduced-motion: reduce), (max-width: 1023px)', () => {
        if (trigger === 'load') {
          gsap.fromTo(el, { autoAlpha: 0 }, { autoAlpha: 1, duration: DUR.sm, delay });
        } else {
          gsap.fromTo(
            el,
            { autoAlpha: 0 },
            {
              autoAlpha: 1,
              duration: DUR.sm,
              scrollTrigger: { trigger: el, start: 'top 90%', once: true },
            },
          );
        }
      });

      mm.add('(min-width: 1024px) and (prefers-reduced-motion: no-preference)', () => {
        const split = SplitText.create(el, {
          type: 'lines',
          mask: 'lines',
          autoSplit: true,
          aria: 'auto',
          onSplit(self) {
            gsap.set(el, { autoAlpha: 1 });
            return gsap.from(self.lines, {
              yPercent: 115,
              duration: DUR.lg,
              ease: 'power4.out',
              stagger: STAGGER.base,
              delay: trigger === 'load' ? delay : 0,
              ...(trigger === 'scroll'
                ? {
                    scrollTrigger: { trigger: el, start: 'top 88%', once: true },
                  }
                : {}),
            });
          },
        });

        return () => split.revert();
      });

      return () => mm.revert();
    },
    { scope: ref },
  );

  return (
    <As
      // @ts-expect-error — ref polimórfico sobre um conjunto fechado de tags
      ref={ref}
      id={id}
      data-split
      className={cn('opacity-0', className)}
    >
      {children}
    </As>
  );
}

/** Reexportado para módulos de secção que precisem de forçar um recálculo. */
export { ScrollTrigger, EASE };
