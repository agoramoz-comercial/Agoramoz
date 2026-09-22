import { cn } from '@/lib/utils/cn';

/**
 * Célula técnica: régua tracejada no topo em vez de caixa fechada. O tracejado
 * é o contorno das referências — lê-se como um painel de instrumentação, não
 * como um cartão de marketing. A estrutura continua a vir da grelha.
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
          ? 'border border-dashed border-[color:var(--border)] bg-[color:var(--surface-raised)] p-7 md:p-9'
          : 'border-t border-dashed border-[color:var(--hairline)] pt-6',
        interactive &&
          'transition-colors duration-300 hover:border-solid hover:border-[color:var(--accent)]',
        className,
      )}
      {...rest}
    >
      {children}
    </As>
  );
}
