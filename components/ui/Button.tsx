import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils/cn';

/**
 * Nota de contraste — vinculativa, verificada com axe:
 * o fundo do CTA é `--color-signal-600` (#E22A00) em QUALQUER superfície,
 * porque carrega sempre texto branco: 4,65:1, passa AA. Usar `--accent` aqui
 * seria um erro — em superfícies escuras resolve para #FF3B10, que com branco
 * dá 3,56:1 e reprova. `--accent` é cor de texto e de traço, não de fundo.
 *
 * Cantos vivos por sistema: no registo editorial brutalista o raio é a
 * exceção, não a regra.
 */
const button = cva(
  [
    'group relative inline-flex items-center justify-center gap-3 overflow-hidden',
    'font-display font-semibold tracking-[-0.01em] whitespace-nowrap',
    'transition-colors duration-300',
    'disabled:pointer-events-none disabled:opacity-40',
    'min-h-12', // alvo de toque >= 44px
  ],
  {
    variants: {
      variant: {
        signal: 'bg-[color:var(--color-signal-600)] text-white hover:bg-[color:var(--color-signal-700)]',
        solid: 'bg-[color:var(--on-surface)] text-[color:var(--surface)] hover:opacity-90',
        outline:
          'border border-[color:var(--border)] text-[color:var(--on-surface)] hover:border-[color:var(--on-surface)]',
        ghost: 'text-[color:var(--on-surface)] hover:bg-[color:var(--surface-raised)]',
        link: 'h-auto min-h-0 p-0 text-[color:var(--accent)] underline-offset-4 hover:underline',
      },
      size: {
        sm: 'px-4 py-2.5 text-sm',
        md: 'px-6 py-3 text-[0.9375rem]',
        lg: 'px-8 py-4 text-base',
      },
    },
    defaultVariants: { variant: 'signal', size: 'md' },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof button> {
  asChild?: boolean;
}

export function Button({ className, variant, size, asChild = false, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : 'button';
  return <Comp className={cn(button({ variant, size }), className)} {...props} />;
}

export { button as buttonVariants };
