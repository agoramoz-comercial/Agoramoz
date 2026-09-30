'use client';

import { useMemo, useState } from 'react';
import { tectoDoEixo } from '@/lib/admin/painel';

/**
 * Leads por dia (dias de Maputo): o período actual em verde com área, o
 * anterior em cinzento, um só eixo a partir de zero. A área só no actual é a
 * segunda codificação — a identidade não depende só da cor.
 *
 * Interacção:
 *  - rato: a cruz segue o ponteiro;
 *  - toque: tocar mostra o dia; a dica fica até outro toque ou Escape;
 *  - teclado: ← → Home End percorrem os dias, Escape fecha. Só o teclado
 *    alimenta a região `aria-live` — passar o rato não inunda o leitor de ecrã.
 * A tabela, sempre disponível, é o caminho completo e exacto.
 */

const DIA_MS = 24 * 3600 * 1000;
const dataCurta = new Intl.DateTimeFormat('pt-PT', {
  day: 'numeric',
  month: 'short',
  timeZone: 'Africa/Maputo',
});
const numero = (n: number) => new Intl.NumberFormat('pt-PT').format(n);

export function GraficoLeads({
  serie,
  serieAnterior,
  inicio,
}: {
  serie: readonly number[];
  serieAnterior: readonly number[];
  inicio: string;
}) {
  const [foco, setFoco] = useState<number | null>(null);
  const [anuncio, setAnuncio] = useState('');
  const n = serie.length;
  const base = Date.parse(inicio);

  const g = useMemo(() => {
    const teto = tectoDoEixo(Math.max(0, ...serie, ...serieAnterior));
    const x = (i: number) => (n <= 1 ? 50 : (i / (n - 1)) * 100);
    const y = (v: number) => 100 - (v / teto) * 100;
    const pontos = (s: readonly number[]) => s.map((v, i) => `${x(i)},${y(v)}`).join(' ');
    // A marca do meio só quando é um número inteiro de leads.
    const marcas = Number.isInteger(teto / 2) ? [teto, teto / 2, 0] : [teto, 0];
    return {
      x,
      y,
      marcas,
      actual: pontos(serie),
      anterior: pontos(serieAnterior),
      area: `0,100 ${pontos(serie)} 100,100`,
      totalActual: serie.reduce((a, b) => a + b, 0),
      totalAnterior: serieAnterior.reduce((a, b) => a + b, 0),
    };
  }, [serie, serieAnterior, n]);

  /** O dia `i` do período; `i − n` é o dia correspondente no período anterior. */
  const diaDe = (i: number) => dataCurta.format(new Date(base + i * DIA_MS));
  const frase = (i: number) =>
    `${diaDe(i)}: ${numero(serie[i] ?? 0)} leads; a ${diaDe(i - n)}, ${numero(serieAnterior[i] ?? 0)}.`;

  function doPonteiro(e: React.PointerEvent<HTMLDivElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    if (r.width === 0 || n === 0) return;
    const fraccao = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    setFoco(Math.round(fraccao * (n - 1)));
  }

  function doTeclado(e: React.KeyboardEvent<HTMLDivElement>) {
    if (n === 0) return;
    if (e.key === 'Escape') {
      setFoco(null);
      setAnuncio('');
      return;
    }
    // A primeira seta mostra o dia mais recente, sem saltar por cima dele.
    const proximo =
      e.key === 'Home'
        ? 0
        : e.key === 'End'
          ? n - 1
          : e.key === 'ArrowRight'
            ? foco === null
              ? n - 1
              : Math.min(n - 1, foco + 1)
            : e.key === 'ArrowLeft'
              ? foco === null
                ? n - 1
                : Math.max(0, foco - 1)
              : null;
    if (proximo === null) return;
    e.preventDefault();
    setFoco(proximo);
    setAnuncio(frase(proximo));
  }

  const rotulosX =
    n > 2
      ? [0, Math.floor((n - 1) / 2), n - 1]
      : [0, n - 1].filter((v, i, a) => a.indexOf(v) === i);

  const tabela = useMemo(
    () => (
      <table className="w-full text-left text-xs tabular-nums">
        <caption className="sr-only">Leads por dia, este período e o anterior</caption>
        <thead>
          <tr className="border-b border-[color:var(--hairline)] text-[color:var(--muted)]">
            <th scope="col" className="py-1.5 font-medium">
              Dia
            </th>
            <th scope="col" className="py-1.5 text-right font-medium">
              Leads
            </th>
            <th scope="col" className="py-1.5 pl-4 font-medium">
              Dia anterior
            </th>
            <th scope="col" className="py-1.5 text-right font-medium">
              Leads
            </th>
          </tr>
        </thead>
        <tbody>
          {serie.map((v, i) => (
            <tr key={i} className="border-b border-[color:var(--hairline)] last:border-0">
              <th scope="row" className="py-1.5 font-normal">
                {dataCurta.format(new Date(base + i * DIA_MS))}
              </th>
              <td className="py-1.5 text-right">{numero(v)}</td>
              <td className="py-1.5 pl-4 text-[color:var(--muted)]">
                {dataCurta.format(new Date(base + (i - n) * DIA_MS))}
              </td>
              <td className="py-1.5 text-right">{numero(serieAnterior[i] ?? 0)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    ),
    [serie, serieAnterior, base, n],
  );

  return (
    <div>
      <ul
        className="mb-4 flex flex-wrap gap-x-6 gap-y-2 text-xs text-[color:var(--muted)]"
        aria-label="Legenda"
      >
        <li className="flex items-center gap-2">
          <span aria-hidden className="h-2.5 w-5 rounded-sm border-t-2 border-dado bg-dado/10" />
          Últimos {n} dias ·{' '}
          <span className="font-medium text-[color:var(--on-surface)] tabular-nums">
            {numero(g.totalActual)}
          </span>
        </li>
        <li className="flex items-center gap-2">
          <span aria-hidden className="h-0.5 w-5 rounded-full bg-dado-contexto" />
          {n} dias anteriores ·{' '}
          <span className="font-medium text-[color:var(--on-surface)] tabular-nums">
            {numero(g.totalAnterior)}
          </span>
        </li>
      </ul>

      <div className="grid grid-cols-[2.25rem_1fr] gap-x-2">
        <div
          aria-hidden
          className="relative h-48 text-right text-[11px] text-[color:var(--muted)] tabular-nums md:h-56"
        >
          {g.marcas.map((m) => (
            <span
              key={m}
              className="absolute right-0 -translate-y-1/2"
              style={{ top: `${g.y(m)}%` }}
            >
              {numero(m)}
            </span>
          ))}
        </div>

        <div
          role="group"
          tabIndex={0}
          aria-label={`Leads por dia, ${n} dias. Setas para percorrer os dias, Escape para fechar.`}
          onPointerMove={(e) => e.pointerType === 'mouse' && doPonteiro(e)}
          onPointerDown={doPonteiro}
          onPointerLeave={(e) => e.pointerType === 'mouse' && setFoco(null)}
          onKeyDown={doTeclado}
          onBlur={() => setFoco(null)}
          className="relative h-48 touch-pan-y rounded-[--radius-xs] outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--on-surface)] focus-visible:ring-offset-2 md:h-56"
        >
          {g.marcas.map((m) => (
            <span
              key={m}
              aria-hidden
              className="absolute inset-x-0 h-px bg-[color:var(--hairline)]"
              style={{ top: `${g.y(m)}%` }}
            />
          ))}

          <svg
            aria-hidden
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="absolute inset-0 size-full overflow-visible"
          >
            <polygon points={g.area} className="fill-dado" fillOpacity={0.1} />
            <polyline
              points={g.anterior}
              fill="none"
              className="stroke-dado-contexto"
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
            <polyline
              points={g.actual}
              fill="none"
              className="stroke-dado"
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>

          {foco !== null && (
            <div aria-hidden>
              <span
                className="absolute inset-y-0 w-px bg-[color:var(--on-surface)]/40"
                style={{ left: `${g.x(foco)}%` }}
              />
              <span
                className="absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-dado-contexto ring-2 ring-[color:var(--surface-raised)]"
                style={{ left: `${g.x(foco)}%`, top: `${g.y(serieAnterior[foco] ?? 0)}%` }}
              />
              <span
                className="absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-dado ring-2 ring-[color:var(--surface-raised)]"
                style={{ left: `${g.x(foco)}%`, top: `${g.y(serie[foco] ?? 0)}%` }}
              />
              <div
                data-dica
                className="pointer-events-none absolute top-0 z-10 w-max max-w-[min(13rem,70%)] rounded-[--radius-xs] border border-[color:var(--border)] bg-[color:var(--surface-raised)] px-3 py-2 text-xs shadow-sm"
                style={
                  g.x(foco) > 50
                    ? { right: `calc(${100 - g.x(foco)}% + 0.5rem)` }
                    : { left: `calc(${g.x(foco)}% + 0.5rem)` }
                }
              >
                <p className="flex items-center justify-between gap-4">
                  <span className="flex items-center gap-1.5 font-medium">
                    <span className="size-2 rounded-full bg-dado" />
                    {diaDe(foco)}
                  </span>
                  <span className="font-medium tabular-nums">{numero(serie[foco] ?? 0)}</span>
                </p>
                <p className="mt-0.5 flex items-center justify-between gap-4 text-[color:var(--muted)]">
                  <span className="flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-dado-contexto" />
                    {diaDe(foco - n)}
                  </span>
                  <span className="font-medium text-[color:var(--on-surface)] tabular-nums">
                    {numero(serieAnterior[foco] ?? 0)}
                  </span>
                </p>
              </div>
            </div>
          )}
        </div>

        <span aria-hidden />
        <div aria-hidden className="relative mt-2 h-4 text-[11px] text-[color:var(--muted)]">
          {rotulosX.map((i) => (
            <span
              key={i}
              className="absolute whitespace-nowrap"
              style={
                i === 0
                  ? { left: 0 }
                  : i === n - 1
                    ? { right: 0 }
                    : { left: `${g.x(i)}%`, transform: 'translateX(-50%)' }
              }
            >
              {diaDe(i)}
            </span>
          ))}
        </div>
      </div>

      <p aria-live="polite" className="sr-only">
        {anuncio}
      </p>

      <details className="mt-4 text-sm">
        <summary className="cursor-pointer text-[color:var(--muted)] hover:text-[color:var(--on-surface)]">
          Ver em tabela
        </summary>
        <div
          role="region"
          aria-label="Tabela de leads por dia"
          tabIndex={0}
          className="mt-3 max-h-64 overflow-auto rounded-[--radius-xs] outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--on-surface)]"
        >
          {tabela}
        </div>
      </details>
    </div>
  );
}
