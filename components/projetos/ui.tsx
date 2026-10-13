import { cn } from '@/lib/utils/cn';

/**
 * Peças pequenas da demo, no vocabulário do site: rótulos techno, traço fino,
 * cantos vivos. O estado ativo usa o sinal da marca — é a regra de cor.
 */

export const ROTULO = 'rule-label text-[color:var(--muted)]';

/** Botão de alternância (`aria-pressed`) ou de opção num grupo. */
export function Alternar({
  ativo,
  onClick,
  children,
  className,
  ...resto
}: {
  ativo: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onClick' | 'children' | 'className'>) {
  return (
    <button
      type="button"
      aria-pressed={ativo}
      onClick={onClick}
      className={cn(
        'inline-flex min-h-11 items-center gap-2 border px-3 text-sm transition-colors duration-200',
        ativo
          ? 'border-[color:var(--color-signal-500)] text-[color:var(--on-surface)]'
          : 'border-[color:var(--border)] text-[color:var(--muted)] hover:border-[color:var(--on-surface)] hover:text-[color:var(--on-surface)]',
        className,
      )}
      {...resto}
    >
      {children}
    </button>
  );
}

/** Um número grande com rótulo, para faixas de indicadores. */
export function Indicador({ rotulo, valor, nota }: { rotulo: string; valor: React.ReactNode; nota?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5 border-t border-[color:var(--hairline)] pt-3">
      <dt className={ROTULO}>{rotulo}</dt>
      <dd className="font-display text-[length:var(--text-h3)] leading-tight font-semibold tabular-nums">{valor}</dd>
      {nota ? <dd className="text-xs text-[color:var(--muted)]">{nota}</dd> : null}
    </div>
  );
}

/** Rótulo «fictício» ao lado de um valor. Curto, sempre visível. */
export function Ficticio() {
  return <span className="ml-1.5 align-middle text-[0.6875rem] font-normal tracking-normal text-[color:var(--muted)]">(fictício)</span>;
}

/**
 * Barra de progresso com o valor também em texto. `decorativa` dentro de um
 * botão: aí o papel `progressbar` perde-se e o rótulo só repetiria o nome —
 * a barra fica escondida e o «45 %» visível entra no nome do botão.
 */
export function Progresso({ valor, rotulo, decorativa = false }: { valor: number; rotulo: string; decorativa?: boolean }) {
  const v = Math.max(0, Math.min(100, valor));
  return (
    <div className="flex items-center gap-3">
      <div
        {...(decorativa
          ? { 'aria-hidden': true }
          : { role: 'progressbar', 'aria-valuenow': Math.round(v), 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-label': rotulo })}
        className="h-1.5 flex-1 bg-[color:var(--hairline)]"
      >
        <div className="h-full bg-[color:var(--on-surface)]" style={{ width: `${v}%` }} />
      </div>
      <span className="w-11 text-right text-xs tabular-nums">{Math.round(v)} %</span>
    </div>
  );
}
