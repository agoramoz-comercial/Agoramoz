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
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1',
        'font-mono text-[length:var(--text-micro)] tracking-[0.04em] uppercase',
        variant === 'neutral' &&
          'border border-[color:var(--border)] text-[color:var(--muted)]',
        variant === 'accent' && 'bg-[color:var(--color-cta)] text-white',
        variant === 'conceptual' &&
          'border border-[color:var(--color-energy-500)] bg-[color:var(--color-energy-500)] text-[color:var(--color-ink)]',
        className,
      )}
    >
      {children}
    </span>
  );
}
