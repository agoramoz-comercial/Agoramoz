import { cn } from '@/lib/utils/cn';
import { Container } from './Container';

export type Surface = 'light' | 'tint' | 'dark' | 'deep';

type SectionProps = {
  /** Religa os tokens semânticos. Os filhos nunca precisam de variantes dark:. */
  surface?: Surface;
  spacing?: 'default' | 'tight' | 'none';
  id?: string;
  className?: string;
  innerClassName?: string;
  children: React.ReactNode;
  as?: 'section' | 'div' | 'footer' | 'aside';
  /** Desliga o Container quando a secção precisa de sangrar até à margem. */
  bleed?: boolean;
  'aria-labelledby'?: string;
  'aria-label'?: string;
};

export function Section({
  surface = 'light',
  spacing = 'default',
  id,
  className,
  innerClassName,
  children,
  as: As = 'section',
  bleed = false,
  ...aria
}: SectionProps) {
  const pad =
    spacing === 'none'
      ? undefined
      : spacing === 'tight'
        ? 'var(--space-section-tight)'
        : 'var(--space-section)';

  return (
    <As
      id={id}
      data-surface={surface}
      className={cn(
        'relative isolate bg-[color:var(--surface)] text-[color:var(--on-surface)]',
        className,
      )}
      style={{ paddingBlock: pad }}
      {...aria}
    >
      {bleed ? children : <Container className={innerClassName}>{children}</Container>}
    </As>
  );
}
