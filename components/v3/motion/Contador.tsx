'use client';

import { useRef } from 'react';
import { gsap, useGSAP } from '@/lib/motion/register';
import { COM_MOVIMENTO } from './util';

/**
 * Número que conta até ao valor ao entrar no ecrã. O HTML do servidor tem o
 * número FINAL (barreira de texto e leitores de ecrã leem sempre o valor
 * verdadeiro); a contagem é só visual, no cliente, e `aria-label` fixa o
 * valor final enquanto conta. Sem movimento: o número final, parado.
 */
export function Contador({
  ate,
  sufixo = '',
  className,
  locale = 'pt-PT',
}: {
  ate: number;
  sufixo?: string;
  className?: string;
  locale?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const formatar = (n: number) => new Intl.NumberFormat(locale).format(Math.round(n)) + sufixo;

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      const mm = gsap.matchMedia();
      mm.add(COM_MOVIMENTO, () => {
        const estado = { n: 0 };
        // Só desce a 0 quando a contagem começa: até lá mostra o valor final.
        const tween = gsap.to(estado, {
          n: ate,
          duration: 1.6,
          ease: 'power2.out',
          scrollTrigger: { trigger: el, start: 'top 90%', once: true },
          onStart: () => {
            el.textContent = formatar(0);
          },
          onUpdate: () => {
            el.textContent = formatar(estado.n);
          },
          onComplete: () => {
            el.textContent = formatar(ate);
          },
        });
        return () => {
          tween.scrollTrigger?.kill();
          tween.kill();
          el.textContent = formatar(ate);
        };
      });
      return () => mm.revert();
    },
    { scope: ref, dependencies: [ate, sufixo, locale] },
  );

  return (
    <span ref={ref} aria-label={formatar(ate)} className={className} style={{ fontVariantNumeric: 'tabular-nums' }}>
      {formatar(ate)}
    </span>
  );
}
