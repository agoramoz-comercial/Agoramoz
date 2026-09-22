import { cn } from '@/lib/utils/cn';

export function Container({
  className,
  children,
  as: As = 'div',
}: {
  className?: string;
  children: React.ReactNode;
  as?: 'div' | 'header' | 'footer' | 'section';
}) {
  return (
    <As
      className={cn('mx-auto w-full', className)}
      style={{ maxWidth: 'var(--container-max)', paddingInline: 'var(--container-gutter)' }}
    >
      {children}
    </As>
  );
}
