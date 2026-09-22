'use client';

import { useRef } from 'react';
import { usePathname } from 'next/navigation';
import { gsap, useGSAP } from '@/lib/motion/register';
import { DUR, EASE } from '@/lib/motion/tokens';

/**
 * Transição de rota.
 *
 * Três decisões deliberadas:
 *
 * 1. **Só a metade de saída.** Cobrir o ecrã ANTES de navegar significa
 *    atrasar a navegação pelo tempo da animação. Com o prefetch do App Router
 *    as navegações são quase instantâneas, pelo que o painel entra já revelado
 *    e sai — lê-se como uma transição completa sem custar um milissegundo ao
 *    utilizador.
 * 2. **Um único elemento, só `transform`.** Nada de envolver a árvore da
 *    página: um wrapper transformado partiria `position: fixed` e a
 *    restauração de scroll — foi exatamente por isso que este projeto usa
 *    Lenis em vez do ScrollSmoother.
 * 3. **Sem texto.** O painel é geometria pura. Texto transitório e
 *    `aria-hidden` contaminaria a prova de copy e não acrescentaria nada.
 *
 * Na primeira montagem não corre: o carregamento inicial já tem a sua própria
 * coreografia no hero, e um painel a varrer só atrasaria o LCP.
 */
export function PageTransition() {
  const pathname = usePathname();
  const panel = useRef<HTMLDivElement>(null);
  const edge = useRef<HTMLDivElement>(null);
  const first = useRef(true);

  useGSAP(
    () => {
      if (first.current) {
        first.current = false;
        return;
      }

      const mm = gsap.matchMedia();

      mm.add('(prefers-reduced-motion: no-preference)', () => {
        // Origem em baixo: a aresta de cima do painel desce e descobre a
        // página de cima para baixo. O fio acompanha essa aresta.
        const tl = gsap.timeline();
        tl.set(panel.current, { scaleY: 1, transformOrigin: 'bottom center' })
          .set(edge.current, { scaleX: 1, autoAlpha: 1, y: 0 })
          .to(
            panel.current,
            { scaleY: 0, duration: DUR.md + 0.1, ease: EASE.inOut },
            0,
          )
          .to(
            edge.current,
            { y: () => window.innerHeight, duration: DUR.md + 0.1, ease: EASE.inOut },
            0,
          )
          .to(edge.current, { autoAlpha: 0, duration: DUR.xs }, '-=0.2');

        return () => {
          tl.kill();
          gsap.set(panel.current, { scaleY: 0 });
          gsap.set(edge.current, { autoAlpha: 0, y: 0 });
        };
      });

      return () => mm.revert();
    },
    { dependencies: [pathname] },
  );

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[90]">
      <div
        ref={panel}
        className="absolute inset-0 origin-bottom scale-y-0 bg-[color:var(--color-ink-950)]"
      />
      {/* Fio de crómio no bordo do painel: é o que faz a transição parecer
          metal a deslizar em vez de uma cortina preta. */}
      <div
        ref={edge}
        className="absolute inset-x-0 top-0 h-px scale-x-0 opacity-0"
        style={{
          background: 'linear-gradient(90deg, transparent, #ffffff, #9ea0a8, #ffffff, transparent)',
        }}
      />
    </div>
  );
}
