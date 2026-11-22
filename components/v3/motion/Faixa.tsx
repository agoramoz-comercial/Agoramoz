'use client';

import { useRef } from 'react';
import { gsap, useGSAP, ScrollTrigger } from '@/lib/motion/register';
import { cn } from '@/lib/utils/cn';
import { COM_MOVIMENTO, ehRtl } from './util';

/**
 * Faixa contínua que reage ao scroll: anda sozinha e, ao rolar, acelera na
 * direcção do scroll (para cima inverte). É decoração: a faixa inteira é
 * `aria-hidden`, pelo que os itens devem existir noutro sítio da página.
 * Duas cópias para o laço sem costura (o separador é SVG, não texto). Nota
 * para a barreira de texto: `innerText` ignora `aria-hidden`, pelo que os
 * itens aparecem duas vezes na fotografia — isso é esperado. Sem movimento:
 * uma linha estática.
 */
export function Faixa({ itens, className, velocidade = 1 }: { itens: string[]; className?: string; velocidade?: number }) {
  const caixa = useRef<HTMLDivElement>(null);
  const trilho = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = caixa.current;
      const t = trilho.current;
      if (!el || !t) return;
      const mm = gsap.matchMedia();
      mm.add(COM_MOVIMENTO, () => {
        const sentido = ehRtl(el) ? 1 : -1;
        const laco = gsap.to(t, {
          xPercent: 50 * sentido,
          duration: 38 / velocidade,
          ease: 'none',
          repeat: -1,
        });
        const gatilho = ScrollTrigger.create({
          trigger: el,
          start: 'top bottom',
          end: 'bottom top',
          onUpdate(self) {
            const v = gsap.utils.clamp(-6, 6, self.getVelocity() / 300);
            const dir = self.direction === -1 ? -1 : 1;
            gsap.to(laco, { timeScale: dir * (1 + Math.abs(v)), duration: 0.3, overwrite: true });
            gsap.to(laco, { timeScale: dir, duration: 1.2, delay: 0.3, ease: 'power2.out', overwrite: false });
          },
        });
        return () => {
          gatilho.kill();
          laco.kill();
          gsap.set(t, { clearProps: 'transform' });
        };
      });
      return () => mm.revert();
    },
    { scope: caixa, dependencies: [itens.join('|'), velocidade] },
  );

  const linha = (copia: number) => (
    <div className="flex shrink-0 items-center" key={copia}>
      {itens.map((item, i) => (
        <span key={`${copia}-${i}`} className="flex items-center whitespace-nowrap">
          <span className="px-[0.45em]">{item}</span>
          <svg viewBox="0 0 16 16" className="mx-[0.45em] h-[0.42em] w-[0.42em] opacity-50">
            <path d="M8 1v14M1 8h14M3 3l10 10M13 3 3 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </span>
      ))}
    </div>
  );

  return (
    <div ref={caixa} aria-hidden className={cn('pointer-events-none select-none [overflow:clip]', className)}>
      <div ref={trilho} className="flex w-max will-change-transform">
        {linha(0)}
        {linha(1)}
      </div>
    </div>
  );
}
