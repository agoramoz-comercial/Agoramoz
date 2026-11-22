'use client';

import { useRef } from 'react';
import { gsap, useGSAP, SplitText } from '@/lib/motion/register';
import { COM_MOVIMENTO } from './util';

/**
 * Manifesto que se acende palavra a palavra com o scroll (scrub): cada palavra
 * vai de 0,15 a 1 de opacidade à medida que o bloco atravessa o ecrã.
 *
 * O SplitText só embrulha as palavras que já estão nos `children` — não cria
 * texto novo — e `aria: 'auto'` mantém a leitura de ecrã como uma frase.
 * No servidor e com movimento reduzido, o texto está inteiro e opaco.
 */
export function RevelarPalavras({
  id,
  as: Tag = 'p',
  className,
  children,
}: {
  as?: 'p' | 'h2' | 'h3';
  id?: string;
  className?: string;
  children: string;
}) {
  const ref = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      const mm = gsap.matchMedia();
      mm.add(COM_MOVIMENTO, () => {
        const split = SplitText.create(el, { type: 'words', aria: 'auto' });
        const tween = gsap.fromTo(
          split.words,
          { opacity: 0.15 },
          {
            opacity: 1,
            ease: 'none',
            stagger: 0.1,
            scrollTrigger: { trigger: el, start: 'top 85%', end: 'bottom 40%', scrub: true },
          },
        );
        return () => {
          tween.scrollTrigger?.kill();
          tween.kill();
          split.revert();
        };
      });
      return () => mm.revert();
    },
    { scope: ref, dependencies: [children] },
  );

  return (
    <Tag ref={ref as never} id={id} className={className}>
      {children}
    </Tag>
  );
}
