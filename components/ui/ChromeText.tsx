import { cn } from '@/lib/utils/cn';

/**
 * Texto em crómio — a assinatura das duas referências.
 *
 * Toda a mecânica vive em `.chrome-text` no globals.css: gradiente
 * multi-paragem recortado ao texto, varrido por uma propriedade registada.
 * Não há JavaScript nenhum aqui, e por isso não há custo nenhum na thread
 * principal — o que permite usá-lo no H1 do hero, que é o elemento de LCP.
 *
 * A rampa está limitada por contraste em cada superfície (ver a regra
 * vinculativa no globals.css). Não a alargar a partir daqui.
 */
export function ChromeText({
  children,
  className,
  as: As = 'span',
  ...rest
}: {
  children: React.ReactNode;
  className?: string;
  as?: 'span' | 'strong' | 'em';
} & React.HTMLAttributes<HTMLElement>) {
  return (
    <As className={cn('chrome-text', className)} {...rest}>
      {children}
    </As>
  );
}
