import { cn } from '@/lib/utils/cn';

export function Eyebrow({
  children,
  className,
  ...rest
}: { children: React.ReactNode; className?: string } & React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn('rule-label text-[color:var(--accent)]', className)} {...rest}>
      {children}
    </p>
  );
}
