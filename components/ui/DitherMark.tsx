import { cn } from '@/lib/utils/cn';

/**
 * Quadriculado 8×8 — a marca de dither das duas referências. Pinta-se com um
 * gradiente cónico repetido: nenhum pedido de rede, nenhum nó extra no SVG.
 * É decoração pura, logo `aria-hidden` sempre.
 */
export function DitherMark({
  className,
  size = 'md',
}: {
  className?: string;
  /** `sm` marca um rótulo; `md` marca o canto de um cartão. */
  size?: 'sm' | 'md';
}) {
  return (
    <span
      aria-hidden
      className={cn('dither block shrink-0', size === 'sm' ? 'size-3' : 'size-6', className)}
    />
  );
}
