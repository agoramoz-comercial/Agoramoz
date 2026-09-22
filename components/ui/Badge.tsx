import { cn } from '@/lib/utils/cn';

/**
 * `conceptual` marca demonstrações. É texto, nunca só cor — e nunca é
 * animado, atrasado ou escondido: é uma obrigação de integridade, não
 * decoração.
 */
export function Badge({
  children,
  variant = 'neutral',
  className,
}: {
  children: React.ReactNode;
  variant?: 'neutral' | 'conceptual' | 'accent';
  className?: string;
}) {
  return (
    <span
      className={cn(
        'rule-label inline-flex shrink-0 items-center gap-1.5 px-2.5 py-1',
        variant === 'neutral' && 'border border-[color:var(--border)] text-[color:var(--muted)]',
        variant === 'accent' && 'bg-[color:var(--color-signal-600)] text-white',
        variant === 'conceptual' &&
          'bg-[color:var(--color-energy-500)] text-[color:var(--color-ink-950)]',
        className,
      )}
    >
      {children}
    </span>
  );
}
