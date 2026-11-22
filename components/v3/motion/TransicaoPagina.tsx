'use client';

import { useRef } from 'react';
import { usePathname } from 'next/navigation';
import { gsap, useGSAP } from '@/lib/motion/register';
import { COM_MOVIMENTO } from './util';

/**
 * Transição entre páginas internas: uma cortina de tinta que sobe DEPOIS da
 * navegação (só a metade de saída). Não atrasa a rota: o App Router já mudou
 * de página quando a cortina começa a descobri-la.
 *
 * Porque não a «burn» do melon (WebGL + View Transitions): envolver o
 * `router.push` num `document.startViewTransition` ainda não é estável no
 * App Router e partiria o prefetch e a restauração de scroll; e o WebGL a
 * cada clique custaria CPU no telemóvel. Na primeira montagem não corre (a
 * entrada é do `Intro`). Sem movimento: nunca aparece.
 */
export function TransicaoPagina() {
  const pathname = usePathname();
  const painel = useRef<HTMLDivElement>(null);
  const primeira = useRef(true);

  useGSAP(
    () => {
      if (primeira.current) {
        primeira.current = false;
        return;
      }
      // Com View Transitions, a «abertura» (TransicaoVista) trata da mudança:
      // a cortina é só a alternativa para browsers sem a API.
      if (typeof document !== 'undefined' && 'startViewTransition' in document) return;
      const mm = gsap.matchMedia();
      mm.add(COM_MOVIMENTO, () => {
        const tl = gsap
          .timeline()
          .set(painel.current, { autoAlpha: 1, yPercent: 0 })
          .to(painel.current, { yPercent: -100, duration: 0.7, ease: 'power4.inOut' })
          .set(painel.current, { autoAlpha: 0 });
        return () => {
          tl.kill();
          gsap.set(painel.current, { autoAlpha: 0 });
        };
      });
      return () => mm.revert();
    },
    { dependencies: [pathname] },
  );

  return (
    <div
      ref={painel}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[190] rounded-b-[2rem] bg-[#0b0a09]"
      style={{ visibility: 'hidden' }}
    />
  );
}
