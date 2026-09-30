import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { ArrowDownRight, ArrowUpRight, CircleDashed, Minus, TriangleAlert } from 'lucide-react';
import type { Fonte } from '@/lib/admin/painel-dados';
import { PERIODOS, type Periodo } from '@/lib/admin/painel';
import { cn } from '@/lib/utils/cn';

/**
 * As peças do painel de comando. Componentes de servidor: sem JavaScript no
 * browser, o número está sempre escrito, e a cor nunca é o único código.
 */

export const numero = (n: number) => new Intl.NumberFormat('pt-PT').format(n);

/** Um cartão do painel. Título sempre; o conteúdo depende do estado da fonte. */
export function Bloco({
  titulo,
  subtitulo,
  id,
  className,
  accao,
  children,
}: {
  titulo: string;
  subtitulo?: string;
  id: string;
  className?: string;
  accao?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section
      aria-labelledby={id}
      className={cn(
        'min-w-0 rounded-[--radius-sm] border border-[color:var(--border)] bg-[color:var(--surface-raised)] p-5 md:p-6',
        className,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
        <div className="min-w-0">
          <h2 id={id} className="text-base font-semibold tracking-[-0.01em]">
            {titulo}
          </h2>
          {subtitulo && <p className="mt-1 text-xs text-[color:var(--muted)]">{subtitulo}</p>}
        </div>
        {accao}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

/** O que mostrar quando a fonte não tem dados: o passo que falta, ou o erro. */
export function ComFonte<T>({
  fonte,
  children,
}: {
  fonte: Fonte<T>;
  children: (dados: T) => React.ReactNode;
}) {
  if (fonte.estado === 'ok') return <>{children(fonte.dados)}</>;
  if (fonte.estado === 'por-activar') {
    return (
      <div className="flex items-start gap-3 rounded-[--radius-xs] border border-dashed border-[color:var(--hairline)] p-4 text-sm">
        <CircleDashed aria-hidden className="mt-0.5 size-4 shrink-0 text-[color:var(--muted)]" />
        <p>
          <span className="font-medium">Por activar.</span>{' '}
          <span className="text-[color:var(--muted)]">{fonte.passo}</span>
        </p>
      </div>
    );
  }
  return (
    <div
      role="status"
      className="flex items-start gap-3 rounded-[--radius-xs] border border-[color:var(--hairline)] p-4 text-sm"
    >
      <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0 text-dado-negativo" />
      <p>
        <span className="font-medium">Não foi possível ler esta fonte agora.</span>{' '}
        <span className="text-[color:var(--muted)]">Nenhum número é mostrado em vez dela.</span>
      </p>
    </div>
  );
}

/** A variação face ao período anterior: seta com cor e sinal, texto em tinta. */
export function Variacao({ pct, periodo }: { pct: number | null; periodo: Periodo }) {
  const vs = `vs ${periodo} dias antes`;
  if (pct === null) {
    return <p className="mt-2 text-xs text-[color:var(--muted)]">Sem base de comparação ({vs})</p>;
  }
  // Sem mudança, sem seta verde: 0 % não é uma subida.
  const Seta = pct < 0 ? ArrowDownRight : pct > 0 ? ArrowUpRight : Minus;
  return (
    <p className="mt-2 flex flex-wrap items-center gap-x-1.5 text-xs text-[color:var(--muted)]">
      <span className="inline-flex items-center gap-0.5 font-medium whitespace-nowrap text-[color:var(--on-surface)]">
        <Seta
          aria-hidden
          className={cn(
            'size-3.5',
            pct < 0 ? 'text-dado-negativo' : pct > 0 ? 'text-dado' : 'text-[color:var(--muted)]',
          )}
        />
        {pct > 0 ? '+' : ''}
        {pct}&nbsp;%
      </span>
      <span>{vs}</span>
    </p>
  );
}

/** Um indicador: ícone, rótulo, valor, variação. Liga à lista que o explica. */
export function Indicador<T>({
  icone: Icone,
  rotulo,
  fonte,
  valor,
  variacao,
  periodo,
  nota,
  href,
}: {
  icone: LucideIcon;
  rotulo: string;
  fonte: Fonte<T>;
  valor: (d: T) => string;
  variacao?: (d: T) => number | null;
  periodo: Periodo;
  nota?: (d: T) => string | null;
  href?: string;
}) {
  const corpo = (
    <>
      {/* Altura fixa de duas linhas: um rótulo longo não desce o número, e os
          cinco valores ficam na mesma linha de leitura. */}
      <div className="flex min-h-10 items-center gap-2 text-sm leading-tight text-[color:var(--muted)]">
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[color:var(--surface)]">
          <Icone aria-hidden className="size-4 text-[color:var(--on-surface)]" />
        </span>
        {rotulo}
      </div>
      {fonte.estado === 'ok' ? (
        <>
          <p className="mt-3 font-[family-name:var(--font-display)] text-[2rem] leading-none font-semibold tracking-[-0.03em] tabular-nums">
            {valor(fonte.dados)}
          </p>
          {variacao && <Variacao pct={variacao(fonte.dados)} periodo={periodo} />}
          {nota?.(fonte.dados) && (
            <p className="mt-1 text-xs text-[color:var(--muted)]">{nota(fonte.dados)}</p>
          )}
        </>
      ) : (
        <>
          <p className="mt-3 font-[family-name:var(--font-display)] text-[2rem] leading-none font-semibold text-[color:var(--muted)]">
            —
          </p>
          <p className="mt-2 text-xs text-[color:var(--muted)]">
            {fonte.estado === 'por-activar'
              ? `Por activar: ${fonte.passo}`
              : 'Não foi possível ler agora.'}
          </p>
        </>
      )}
    </>
  );

  const caixa =
    'block h-full rounded-[--radius-sm] border border-[color:var(--border)] bg-[color:var(--surface-raised)] p-5';
  return href ? (
    <Link
      href={href}
      className={cn(caixa, 'transition-colors hover:border-[color:var(--on-surface)]')}
    >
      {corpo}
    </Link>
  ) : (
    <div className={caixa}>{corpo}</div>
  );
}

export interface LinhaBarra {
  readonly chave: string;
  readonly rotulo: string;
  readonly valor: number;
  /** Texto à direita do valor (p. ex. «25 % da etapa anterior»). */
  readonly nota?: string;
}

/**
 * Barras horizontais de uma só série: uma cor, o valor escrito na ponta, a
 * escala a partir de zero e comum a todas as linhas. HTML e não SVG: o texto é
 * texto, selecciona-se e lê-se por leitor de ecrã sem tabela à parte.
 */
export function BarrasHorizontais({
  linhas,
  legenda,
  maximo,
}: {
  linhas: readonly LinhaBarra[];
  legenda: string;
  /** Por omissão, o maior valor. O funil passa o da primeira etapa. */
  maximo?: number;
}) {
  const topo = Math.max(maximo ?? 0, ...linhas.map((l) => l.valor), 1);
  return (
    <ul aria-label={legenda} className="grid gap-3">
      {linhas.map((l) => (
        <li
          key={l.chave}
          className="grid grid-cols-[minmax(0,9rem)_1fr] items-center gap-3 sm:grid-cols-[minmax(0,11rem)_1fr]"
        >
          <span className="truncate text-sm" title={l.rotulo}>
            {l.rotulo}
          </span>
          <span className="flex min-w-0 items-center gap-2">
            <span
              className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-[color:var(--surface)]"
              aria-hidden
            >
              <span
                className="absolute inset-y-0 left-0 rounded-full bg-dado"
                style={{ width: `${(l.valor / topo) * 100}%` }}
                title={`${l.rotulo}: ${numero(l.valor)}`}
              />
            </span>
            <span className="min-w-10 shrink-0 text-right text-sm font-medium tabular-nums">
              {numero(l.valor)}
            </span>
            {l.nota && (
              <span className="hidden w-28 shrink-0 text-xs text-[color:var(--muted)] md:inline">
                {l.nota}
              </span>
            )}
          </span>
        </li>
      ))}
    </ul>
  );
}

/** 7 · 30 · 90 dias, no URL: a vista é uma ligação que se partilha. */
export function SeletorPeriodo({
  actual,
  caminho = '/admin',
}: {
  actual: Periodo;
  caminho?: string;
}) {
  return (
    <nav
      aria-label="Período"
      className="inline-flex rounded-[--radius-sm] border border-[color:var(--border)] bg-[color:var(--surface-raised)] p-1"
    >
      {PERIODOS.map((p) => (
        <Link
          key={p}
          href={`${caminho}?periodo=${p}`}
          aria-current={p === actual ? 'page' : undefined}
          className={cn(
            'flex min-h-9 min-w-16 items-center justify-center rounded-[--radius-xs] px-3 text-sm',
            p === actual
              ? 'bg-[color:var(--on-surface)] font-medium text-[color:var(--surface)]'
              : 'text-[color:var(--muted)] hover:text-[color:var(--on-surface)]',
          )}
        >
          {p} dias
        </Link>
      ))}
    </nav>
  );
}
