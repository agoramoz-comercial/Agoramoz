import Link from 'next/link';
import { cn } from '@/lib/utils/cn';
import { Mark } from './Mark';

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
        <span className="font-display text-[1.0625rem] leading-none font-extrabold tracking-[-0.02em]">
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
