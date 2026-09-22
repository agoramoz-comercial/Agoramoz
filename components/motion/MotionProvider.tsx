'use client';

import { useRef } from 'react';
import Lenis from 'lenis';
import { gsap, useGSAP, ScrollTrigger } from '@/lib/motion/register';
import { applyMotionDefaults } from '@/lib/motion/tokens';
import { registerMotionEffects, registerReducedMotionEffects } from '@/lib/motion/effects';

/**
 * Boot único do sistema de movimento.
 *
 * Decisão de arquitetura: Lenis em vez de ScrollSmoother. O ScrollSmoother
 * transforma um wrapper, o que parte `position: fixed` — e este site tem três
 * elementos fixos (header, barra de CTA mobile, botão de WhatsApp) além de
 * precisar que o Tab leve o foco a elementos fora do ecrã. Lenis conduz a
 * posição de scroll real, pelo que âncoras, foco por teclado e localizar-na-
 * página continuam nativos. O custo aceite é escrever o parallax à mão.
 *
 * Em `prefers-reduced-motion: reduce` o Lenis nunca chega a ser criado.
 */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  const lenisRef = useRef<Lenis | null>(null);

  useGSAP(() => {
    applyMotionDefaults();

    // Referência para o harness de QA verificar fugas de ScrollTrigger entre
    // navegações. Só existe quando NEXT_PUBLIC_MOTION_DEBUG está ativo.
    if (process.env.NEXT_PUBLIC_MOTION_DEBUG === '1') {
      (window as unknown as Record<string, unknown>).__AGORAMOZ_ST__ = ScrollTrigger;
    }

    const mm = gsap.matchMedia();

    mm.add('(prefers-reduced-motion: reduce)', () => {
      registerReducedMotionEffects();
      // Sem movimento narrativo: tudo o que estava escondido pela guarda
      // anti-FOUC é revelado de imediato.
      gsap.set('[data-animate]', { autoAlpha: 1, clearProps: 'transform' });
    });

    mm.add('(prefers-reduced-motion: no-preference)', () => {
      registerMotionEffects();

      const lenis = new Lenis({ duration: 1.05, smoothWheel: true });
      lenisRef.current = lenis;

      const raf = (time: number) => lenis.raf(time * 1000);
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(raf);
      gsap.ticker.lagSmoothing(0);

      // Fontes alteram a altura do texto: recalcular depois de assentarem.
      void document.fonts?.ready.then(() => ScrollTrigger.refresh());

      return () => {
        gsap.ticker.remove(raf);
        gsap.ticker.lagSmoothing(500, 33);
        lenis.destroy();
        lenisRef.current = null;
      };
    });

    return () => mm.revert();
  }, []);

  return <>{children}</>;
}
