import { cn } from '@/lib/utils/cn';
import { Container } from './Container';
import { ContourField } from './ContourField';

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
  /** Rótulo curto para o rail de índice. Registar só as secções da home. */
  index?: string;
  /** Desenha as colunas verticais ténues da grelha no fundo. */
  lines?: boolean;
  /** Desenha a malha de contorno topográfica no fundo. */
  contour?: boolean;
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
  index,
  lines = false,
  contour = false,
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
      data-section-index={index}
      className={cn(
        'relative isolate bg-[color:var(--surface)] text-[color:var(--on-surface)]',
        lines && 'grid-lines',
        className,
      )}
      style={{ paddingBlock: pad }}
      {...aria}
    >
      {contour && <ContourField />}

      {bleed ? (
        <div className="relative z-[1]">{children}</div>
      ) : (
        <Container className={cn('relative z-[1]', innerClassName)}>{children}</Container>
      )}
    </As>
  );
}
