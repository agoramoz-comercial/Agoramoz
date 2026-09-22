import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils/cn';

/**
 * Nota de contraste — vinculativa, verificada com axe:
 * o fundo do CTA é `--color-cta` (#E22A00) em QUALQUER superfície, porque
 * carrega sempre texto branco: 4.65:1, passa AA. Usar `--accent` aqui seria
 * um erro — em superfícies escuras resolve para #FF3B10, que com branco dá
 * 3.56:1 e reprova. `--accent` é cor de texto e de traço, não de fundo.
 */
const button = cva(
  [
    'inline-flex items-center justify-center gap-2 rounded-[--radius-sm]',
    'font-medium whitespace-nowrap transition-[background-color,color,border-color,transform]',
    'duration-200 will-change-transform active:translate-y-px',
    'disabled:pointer-events-none disabled:opacity-50',
    'min-h-11', // alvo de toque >= 44px
  ],
  {
    variants: {
      variant: {
        signal:
          'bg-[color:var(--color-cta)] text-white hover:bg-[color:var(--color-cta-hover)] shadow-[var(--shadow-1)]',
        solid:
          'bg-[color:var(--on-surface)] text-[color:var(--surface)] hover:opacity-90',
        outline:
          'border border-[color:var(--border)] bg-transparent text-[color:var(--on-surface)] hover:border-[color:var(--accent)] hover:text-[color:var(--accent)]',
        ghost: 'bg-transparent text-[color:var(--on-surface)] hover:bg-[color:var(--surface-raised)]',
        link: 'h-auto min-h-0 p-0 text-[color:var(--accent)] underline-offset-4 hover:underline',
      },
      size: {
        sm: 'px-3.5 py-2 text-sm',
        md: 'px-5 py-3 text-[0.9375rem]',
        lg: 'px-6 py-3.5 text-base',
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
