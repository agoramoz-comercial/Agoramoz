'use client';

import Link from 'next/link';
import { LiquidGlassButton } from '@/components/ui/apple-tahoe-liquid-glass-button';
import { cn } from '@/lib/utils/cn';

function Seta({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden className={cn('h-3.5 w-3.5 rtl:-scale-x-100', className)}>
      <path d="M2 8h11M9 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * Botão em pílula de vidro líquido (LiquidGlassButton, de
 * `components/ui/apple-tahoe-liquid-glass-button`), com a seta num círculo.
 *
 * - `claro`: vidro escuro fosco, texto papel — sobre a fotografia e o fundo
 *   noite. O material «regular» leva um véu de 65 % que segura o contraste
 *   do texto seja qual for a imagem por trás.
 * - `escuro`: vidro claro fosco, texto tinta — sobre as secções papel.
 *
 * A física de mola do vidro (aperto, brilho que segue o ponteiro) substitui o
 * íman anterior: os dois mexiam no mesmo eixo. Em Chromium o vidro refracta;
 * nos outros motores fica fosco. Com movimento reduzido, não há mola.
 * No hover, a seta sai e uma cópia entra (o «roll» do melon); em RTL vira.
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
  const claro = variante === 'claro';
  return (
    <LiquidGlassButton
      asChild
      interactive
      material="regular"
      appearance={claro ? 'dark' : 'light'}
      refraction={10}
      size="sm"
      tint={claro ? undefined : '#efe8da'}
      className={cn(
        'group min-h-12 gap-4 py-1.5 ps-6 pe-1.5 text-[0.95rem] font-medium tracking-[-0.01em] normal-case',
        claro
          ? 'bg-[#0b0a09]/45! text-[#efe8da] ring-1 ring-[#efe8da]/30'
          : 'bg-[#efe8da]/50! text-[#0b0a09] ring-1 ring-[#0b0a09]/15',
        'focus-visible:ring-2 focus-visible:ring-[var(--v3-ambar)]',
        className,
      )}
    >
      <Link href={href}>
        <span>{children}</span>
        <span
          aria-hidden
          className={cn(
            'relative grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full',
            claro ? 'bg-[#efe8da] text-[#0b0a09]' : 'bg-[#0b0a09] text-[#efe8da]',
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
    </LiquidGlassButton>
  );
}
