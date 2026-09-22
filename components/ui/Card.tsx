import { cn } from '@/lib/utils/cn';

/**
 * Célula editorial: régua no topo em vez de caixa fechada. A estrutura vem da
 * grelha, não de contornos — é o que separa um sistema editorial de um
 * mosaico de cartões.
 */
export function Card({
  className,
  children,
  as: As = 'div',
  interactive = false,
  boxed = false,
  ...rest
}: {
  className?: string;
  children: React.ReactNode;
  as?: 'div' | 'li' | 'article';
  interactive?: boolean;
  /** Caixa fechada, para quando o cartão é mesmo um painel (oferta, formulário). */
  boxed?: boolean;
} & React.HTMLAttributes<HTMLElement>) {
  return (
    <As
      className={cn(
        'relative',
        boxed
          ? 'border border-[color:var(--border)] bg-[color:var(--surface-raised)] p-7 md:p-9'
          : 'border-t border-[color:var(--hairline)] pt-6',
        interactive &&
          'transition-colors duration-300 hover:border-[color:var(--accent)]',
        className,
      )}
      {...rest}
    >
      {children}
    </As>
  );
}
