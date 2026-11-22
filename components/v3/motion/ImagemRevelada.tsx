'use client';

import { useRef } from 'react';
import { gsap, useGSAP } from '@/lib/motion/register';
import { cn } from '@/lib/utils/cn';
import { COM_MOVIMENTO } from './util';

/**
 * Imagem que se descobre ao entrar: a moldura abre por `clip-path: inset()`
 * de baixo para cima e o conteúdo desce de 1,12 para 1 de escala. Corre uma
 * vez. Sem movimento: moldura aberta e escala 1 (o HTML do servidor já é isso).
 */
export function ImagemRevelada({ className, children }: { className?: string; children: React.ReactNode }) {
  const moldura = useRef<HTMLDivElement>(null);
  const dentro = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = moldura.current;
      if (!el) return;
      const mm = gsap.matchMedia();
      mm.add(COM_MOVIMENTO, () => {
        const tl = gsap.timeline({ scrollTrigger: { trigger: el, start: 'top 85%', once: true } });
        tl.fromTo(
          el,
          { clipPath: 'inset(100% 0% 0% 0%)' },
          { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.1, ease: 'power4.inOut' },
        ).fromTo(dentro.current, { scale: 1.12 }, { scale: 1, duration: 1.4, ease: 'power3.out' }, 0);
        return () => {
          tl.scrollTrigger?.kill();
          tl.kill();
          gsap.set([el, dentro.current], { clearProps: 'clipPath,transform' });
        };
      });
      return () => mm.revert();
    },
    { scope: moldura },
  );

  return (
    <div ref={moldura} className={cn('relative overflow-hidden', className)}>
      <div ref={dentro} className="h-full w-full will-change-transform">
        {children}
      </div>
    </div>
  );
}
