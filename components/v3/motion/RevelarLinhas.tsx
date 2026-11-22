'use client';

import { useRef } from 'react';
import { gsap, useGSAP, SplitText } from '@/lib/motion/register';
import { COM_MOVIMENTO } from './util';

/**
 * Título que entra linha a linha, a subir de dentro de uma máscara (o padrão
 * `.mask > .up` do melon). Corre uma vez, quando o título entra no ecrã.
 *
 * `autoSplit` volta a partir as linhas quando a fonte assenta ou a largura
 * muda. No servidor e com movimento reduzido, o texto está no sítio final.
 * Não usar no H1 do primeiro ecrã em telemóvel: o hero trata do seu LCP.
 */
export function RevelarLinhas({
  id,
  as: Tag = 'h2',
  className,
  children,
  atraso = 0,
}: {
  as?: 'p' | 'h1' | 'h2' | 'h3' | 'span';
  id?: string;
  className?: string;
  children: string;
  atraso?: number;
}) {
  const ref = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      const mm = gsap.matchMedia();
      mm.add(COM_MOVIMENTO, () => {
        const split = SplitText.create(el, {
          type: 'lines',
          mask: 'lines',
          autoSplit: true,
          aria: 'auto',
          onSplit(self) {
            return gsap.from(self.lines, {
              yPercent: 110,
              duration: 0.9,
              delay: atraso,
              stagger: 0.08,
              ease: 'power4.out',
              scrollTrigger: { trigger: el, start: 'top 88%', once: true },
            });
          },
        });
        return () => split.revert();
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
