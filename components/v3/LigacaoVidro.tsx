'use client';

import { LiquidGlassButton, type LiquidGlassButtonProps } from '@/components/ui/apple-tahoe-liquid-glass-button';

/**
 * Uma ligação externa com vidro líquido, para usar a partir de componentes de
 * servidor. O `asChild` do LiquidGlassButton clona o filho com
 * `React.isValidElement`; um elemento criado no servidor chega ao cliente como
 * referência preguiçosa e falha essa verificação — o vidro rendia então um
 * `<button>` com a ligação lá dentro (interactivo dentro de interactivo).
 * Aqui o `<a>` nasce no cliente, e o clone funciona.
 */
export function LigacaoVidro({
  href,
  rotulo,
  children,
  className,
  externa = false,
  ...vidro
}: Omit<LiquidGlassButtonProps, 'asChild' | 'children'> & {
  href: string;
  rotulo?: string;
  children: React.ReactNode;
  externa?: boolean;
}) {
  return (
    <LiquidGlassButton asChild interactive className={className} {...vidro}>
      <a
        href={href}
        aria-label={rotulo}
        {...(externa ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      >
        {children}
      </a>
    </LiquidGlassButton>
  );
}
