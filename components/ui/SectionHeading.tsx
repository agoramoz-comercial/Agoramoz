import { cn } from '@/lib/utils/cn';
import { SplitHeading } from '@/components/motion/SplitHeading';

/**
 * Cabeçalho editorial assimétrico: número e eyebrow numa coluna estreita à
 * esquerda, título a ocupar a largura. A régua por cima torna a grelha
 * visível — é estrutura, não ornamento.
 */
export function SectionHeading({
  eyebrow,
  number,
  title,
  lead,
  as = 'h2',
  id,
  className,
  max = 'measure',
}: {
  eyebrow?: string;
  /** Número da secção, ex. "04". Mono, ao lado do eyebrow. */
  number?: string;
  title: string;
  lead?: React.ReactNode;
  /** `h1` apenas nos heros — há exatamente um por página. */
  as?: 'h1' | 'h2' | 'h3';
  id?: string;
  className?: string;
  max?: 'measure' | 'wide' | 'none';
}) {
  const size =
    as === 'h1' ? 'var(--text-h1)' : as === 'h2' ? 'var(--text-h2)' : 'var(--text-h3)';

  return (
    <div className={cn('rule pt-6', className)}>
      <div className="grid gap-x-10 gap-y-6 md:grid-cols-12">
        {(eyebrow || number) && (
          <div className="flex items-baseline gap-4 md:col-span-3 md:flex-col md:gap-2">
            {number && <span className="rule-label text-[color:var(--muted)]">{number}</span>}
            {eyebrow && (
              <span className="rule-label text-[color:var(--accent)]">{eyebrow}</span>
            )}
          </div>
        )}

        <div
          className={cn(eyebrow || number ? 'md:col-span-9' : 'md:col-span-12')}
          style={{ '--size': size } as React.CSSProperties}
        >
          <SplitHeading
            as={as}
            id={id}
            className={cn(
              'text-[length:var(--size)] tracking-[var(--tracking-heading)]',
              max === 'measure' && 'max-w-[20ch]',
              max === 'wide' && 'max-w-[26ch]',
            )}
          >
            {title}
          </SplitHeading>

          {lead && (
            <p className="mt-6 max-w-[44ch] text-[length:var(--text-lead)] text-[color:var(--muted)]">
              {lead}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
