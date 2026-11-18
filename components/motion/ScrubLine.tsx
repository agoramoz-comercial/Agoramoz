'use client';

import { useRef } from 'react';
import { gsap, useGSAP } from '@/lib/motion/register';
import { passosAcesos } from '@/lib/motion/v2';
import { cn } from '@/lib/utils/cn';

export type Passo = { readonly titulo: string; readonly texto: string };

/**
 * Efeito 03 (D-50): a linha enche-se ao ritmo do scroll e acende cada passo.
 *
 * O estado servido é o final (linha cheia, todos os passos acesos): é o que se
 * vê sem JS e com movimento reduzido. Com movimento normal, o ScrollTrigger põe
 * a linha a zero e liga-a ao scroll (`scrub`), nos dois sentidos.
 */
export function ScrubLine({ passos, className }: { passos: readonly Passo[]; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const raiz = ref.current;
      if (!raiz) return;
      const linha = raiz.querySelector<HTMLElement>('[data-linha]');
      const itens = Array.from(raiz.querySelectorAll<HTMLElement>('[data-passo]'));
      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        const acender = (p: number) => {
          const n = passosAcesos(p, itens.length);
          itens.forEach((li, i) => li.setAttribute('data-aceso', String(i < n)));
        };
        acender(0);
        const tween = gsap.fromTo(
          linha,
          { scaleX: 0 },
          {
            scaleX: 1,
            ease: 'none',
            scrollTrigger: {
              trigger: raiz,
              start: 'top 75%',
              end: 'bottom 55%',
              scrub: true,
              onUpdate: (st) => acender(st.progress),
            },
          },
        );
        return () => {
          tween.scrollTrigger?.kill();
          tween.kill();
          gsap.set(linha, { clearProps: 'transform' });
          itens.forEach((li) => li.setAttribute('data-aceso', 'true'));
        };
      });
      return () => mm.revert();
    },
    { scope: ref },
  );

  return (
    <div ref={ref} className={cn('grid gap-8', className)}>
      <div aria-hidden className="relative h-1 overflow-hidden rounded-full bg-[color:var(--hairline)]">
        <div data-linha className="absolute inset-0 origin-left rounded-full bg-[color:var(--accent)]" />
      </div>
      <ol className="grid list-none grid-cols-[repeat(auto-fit,minmax(9rem,1fr))] gap-x-5 gap-y-6 p-0">
        {passos.map((p, i) => (
          <li
            key={p.titulo}
            data-passo
            data-aceso="true"
            className="transition-opacity duration-300 data-[aceso=false]:opacity-35"
          >
            <span className="text-xs font-semibold tabular-nums text-[color:var(--muted)]">
              {String(i + 1).padStart(2, '0')}
            </span>
            <span className="mt-1 block font-display text-xl font-semibold tracking-tight">{p.titulo}</span>
            <span className="mt-1 block text-sm text-[color:var(--muted)]">{p.texto}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
