'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { gsap, useGSAP } from '@/lib/motion/register';
import { cn } from '@/lib/utils/cn';
import { PONTEIRO_FINO } from './util';

function Seta({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden className={cn('h-3.5 w-3.5 rtl:-scale-x-100', className)}>
      <path d="M2 8h11M9 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * Botão em pílula com a seta num círculo (o «Get started» da referência).
 * No hover, a seta sai pela direita e uma cópia (geometria `aria-hidden`, sem
 * texto) entra pela esquerda — o «roll» do melon sem duplicar o rótulo. Com
 * ponteiro fino, o botão é atraído pelo cursor (íman). Em RTL a seta vira e
 * desliza para o outro lado (CSS lógico).
 */
export function BotaoPilula({
  href,
  children,
  variante = 'claro',
  className,
}: {
  href: string;
  children: React.ReactNode;
  variante?: 'claro' | 'escuro';
  className?: string;
}) {
  const ref = useRef<HTMLAnchorElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      const mm = gsap.matchMedia();
      mm.add(PONTEIRO_FINO, () => {
        const xTo = gsap.quickTo(el, 'x', { duration: 0.5, ease: 'power3.out' });
        const yTo = gsap.quickTo(el, 'y', { duration: 0.5, ease: 'power3.out' });
        const mover = (e: PointerEvent) => {
          const r = el.getBoundingClientRect();
          xTo((e.clientX - (r.left + r.width / 2)) * 0.22);
          yTo((e.clientY - (r.top + r.height / 2)) * 0.3);
        };
        const sair = () => {
          xTo(0);
          yTo(0);
        };
        el.addEventListener('pointermove', mover);
        el.addEventListener('pointerleave', sair);
        return () => {
          el.removeEventListener('pointermove', mover);
          el.removeEventListener('pointerleave', sair);
          gsap.set(el, { x: 0, y: 0 });
        };
      });
      return () => mm.revert();
    },
    { scope: ref },
  );

  const claro = variante === 'claro';
  return (
    <Link
      ref={ref}
      href={href}
      className={cn(
        'group inline-flex min-h-12 items-center gap-4 rounded-full py-1.5 ps-6 pe-1.5 text-[0.95rem] font-medium tracking-[-0.01em] transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-offset-4',
        claro
          ? 'bg-[#efe8da] text-[#0b0a09] hover:bg-white focus-visible:outline-[#efe8da]'
          : 'bg-[#0b0a09] text-[#efe8da] ring-1 ring-[#efe8da]/25 hover:bg-[#1a1816] focus-visible:outline-[#0b0a09]',
        className,
      )}
    >
      <span>{children}</span>
      <span
        aria-hidden
        className={cn(
          'relative grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full',
          claro ? 'bg-[#0b0a09] text-[#efe8da]' : 'bg-[#efe8da] text-[#0b0a09]',
        )}
      >
        <span className="col-start-1 row-start-1 transition-transform duration-500 ease-[cubic-bezier(.2,.7,.2,1)] group-hover:translate-x-[180%] motion-reduce:transition-none rtl:group-hover:-translate-x-[180%]">
          <Seta />
        </span>
        <span className="col-start-1 row-start-1 -translate-x-[180%] transition-transform duration-500 ease-[cubic-bezier(.2,.7,.2,1)] group-hover:translate-x-0 motion-reduce:transition-none rtl:translate-x-[180%] rtl:group-hover:translate-x-0">
          <Seta />
        </span>
      </span>
    </Link>
  );
}
