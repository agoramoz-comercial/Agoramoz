import { cn } from '@/lib/utils/cn';
import { Eyebrow } from './Eyebrow';

export function SectionHeading({
  eyebrow,
  title,
  lead,
  as: As = 'h2',
  id,
  align = 'left',
  className,
  max = 'measure',
}: {
  eyebrow?: string;
  title: React.ReactNode;
  lead?: React.ReactNode;
  /** `h1` apenas nos heros — há exatamente um por página. */
  as?: 'h1' | 'h2' | 'h3';
  id?: string;
  align?: 'left' | 'center';
  className?: string;
  max?: 'measure' | 'wide' | 'none';
}) {
  const size = As === 'h1' ? 'var(--text-h1)' : As === 'h2' ? 'var(--text-h2)' : 'var(--text-h3)';

  return (
    <div
      className={cn(
        align === 'center' && 'mx-auto text-center',
        max === 'measure' && 'max-w-[46rem]',
        max === 'wide' && 'max-w-[58rem]',
        className,
      )}
    >
      {eyebrow && <Eyebrow className="mb-4">{eyebrow}</Eyebrow>}
      <As id={id} className="text-[length:var(--size)]" style={{ '--size': size } as React.CSSProperties}>
        {title}
      </As>
      {lead && (
        <p className="mt-5 max-w-[42rem] text-[length:var(--text-lead)] text-[color:var(--muted)]">
          {lead}
        </p>
      )}
    </div>
  );
}
