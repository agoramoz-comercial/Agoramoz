'use client';

import { useRef } from 'react';
import { gsap, useGSAP } from '@/lib/motion/register';
import { cn } from '@/lib/utils/cn';
import { COM_MOVIMENTO } from './util';

/**
 * Deslocamento vertical ligado ao scroll. `intensidade` é a percentagem da
 * própria altura que o elemento percorre (por omissão 12 %, como a folga de
 * 6 % para cada lado das imagens do melon). Para imagens, pôr o filho com
 * altura maior que a moldura e `overflow: hidden` na moldura.
 */
export function Paralaxe({
  className,
  intensidade = 12,
  children,
}: {
  className?: string;
  intensidade?: number;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      const mm = gsap.matchMedia();
      mm.add(COM_MOVIMENTO, () => {
        gsap.fromTo(
          el,
          { yPercent: -intensidade / 2 },
          {
            yPercent: intensidade / 2,
            ease: 'none',
            scrollTrigger: { trigger: el.parentElement ?? el, start: 'top bottom', end: 'bottom top', scrub: true },
          },
        );
      });
      return () => mm.revert();
    },
    { scope: ref, dependencies: [intensidade] },
  );

  return (
    <div ref={ref} className={cn('will-change-transform', className)}>
      {children}
    </div>
  );
}
