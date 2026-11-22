'use client';

import { useRef } from 'react';
import { gsap, useGSAP } from '@/lib/motion/register';
import { COM_MOVIMENTO } from './util';

const CHAVE = 'agoramoz:v3:intro';

/**
 * Cortina de entrada (inspirada no loader do melon): um painel de tinta cobre
 * o ecrã e sobe, uma vez por sessão. Sem contador de percentagem: não medimos
 * o carregamento real, e um número inventado seria teatro.
 *
 * Guarda de LCP: o painel nasce escondido no HTML do servidor (sem JS, nunca
 * tapa nada) e só aparece no cliente se ainda não correu nesta sessão. Sobe
 * de imediato, sem esperar por fontes nem imagens: em ≤ 900 ms a página está
 * descoberta. Com movimento reduzido nunca aparece.
 */
export function Intro() {
  const painel = useRef<HTMLDivElement>(null);
  const fio = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    let jaCorreu = false;
    try {
      jaCorreu = window.sessionStorage.getItem(CHAVE) === '1';
      window.sessionStorage.setItem(CHAVE, '1');
    } catch {
      jaCorreu = false;
    }
    if (jaCorreu) return;

    const mm = gsap.matchMedia();
    mm.add(COM_MOVIMENTO, () => {
      const tl = gsap.timeline();
      tl.set(painel.current, { autoAlpha: 1, yPercent: 0 })
        .fromTo(fio.current, { scaleX: 0 }, { scaleX: 1, duration: 0.35, ease: 'power2.inOut' })
        .to(painel.current, { yPercent: -100, duration: 0.55, ease: 'power4.inOut' }, '+=0.05')
        .set(painel.current, { autoAlpha: 0 });
      return () => {
        tl.kill();
        gsap.set(painel.current, { autoAlpha: 0 });
      };
    });
    return () => mm.revert();
  }, []);

  return (
    <div
      ref={painel}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[200] flex items-end bg-[#0b0a09]"
      style={{ visibility: 'hidden' }}
    >
      <div ref={fio} className="h-px w-full origin-left bg-[#efe8da]/70 rtl:origin-right" />
    </div>
  );
}
