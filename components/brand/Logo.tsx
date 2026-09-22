import Link from 'next/link';
import { cn } from '@/lib/utils/cn';
import { Mark } from './Mark';

/**
 * O wordmark é o único texto crómio permanente do site — é ele que carrega a
 * assinatura metálica em todas as páginas. A marca ao lado mantém as cores da
 * identidade: o contraste entre as duas é deliberado.
 */
type LogoProps = {
  /** `full` mostra marca + wordmark; `mark` só o símbolo. */
  variant?: 'full' | 'mark';
  className?: string;
  /** Envolve num link para a raiz. Desligar no footer se já houver um. */
  href?: string | null;
};

export function Logo({ variant = 'full', className, href = '/' }: LogoProps) {
  const content = (
    <span className={cn('inline-flex items-center gap-2.5 text-[color:var(--on-surface)]', className)}>
      <Mark className="h-6 w-auto shrink-0" />
      {variant === 'full' && (
        <span className="chrome-text chrome-loop font-techno text-[1.0625rem] leading-none font-semibold tracking-[0.06em]">
          AGORAMOZ
        </span>
      )}
    </span>
  );

  if (!href) return content;

  return (
    <Link href={href} aria-label="AGORAMOZ — página inicial" className="inline-flex rounded-xs">
      {content}
    </Link>
  );
}
