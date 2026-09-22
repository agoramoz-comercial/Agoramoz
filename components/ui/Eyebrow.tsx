import { cn } from '@/lib/utils/cn';

export function Eyebrow({
  children,
  className,
  ...rest
}: { children: React.ReactNode; className?: string } & React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn(
        'font-mono text-[color:var(--accent)] uppercase',
        'text-[length:var(--text-micro)] tracking-[var(--tracking-eyebrow)]',
        className,
      )}
      {...rest}
    >
      {children}
    </p>
  );
}
