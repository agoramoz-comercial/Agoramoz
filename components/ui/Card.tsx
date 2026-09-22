import { cn } from '@/lib/utils/cn';

export function Card({
  className,
  children,
  as: As = 'div',
  interactive = false,
  ...rest
}: {
  className?: string;
  children: React.ReactNode;
  as?: 'div' | 'li' | 'article';
  interactive?: boolean;
} & React.HTMLAttributes<HTMLElement>) {
  return (
    <As
      className={cn(
        'rounded-[--radius-lg] border border-[color:var(--border)]',
        'bg-[color:var(--surface-raised)] p-6 md:p-7',
        interactive && 'transition-colors hover:border-[color:var(--accent)]',
        className,
      )}
      {...rest}
    >
      {children}
    </As>
  );
}
