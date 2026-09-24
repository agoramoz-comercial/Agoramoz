import Link from 'next/link';
import { cn } from '@/lib/utils/cn';
import type { Rotulo, Tom } from '@/lib/admin/labels';

/**
 * Primitivos da área administrativa.
 *
 * Todos renderizam no servidor e nenhum tem estado de cliente: ordenação,
 * filtros e paginação viajam em parâmetros de URL. Duas consequências que
 * valem mais do que a conveniência de um `useState`: o admin carrega
 * praticamente sem JavaScript, e **qualquer vista é uma ligação** — uma pessoa
 * pode enviar a outra o ecrã exacto que está a ver.
 *
 * As cores vêm dos tokens semânticos de `globals.css` para que o admin não
 * abra um segundo sistema visual a manter em paralelo com o site.
 */

export function AdminHeading({
  titulo,
  descricao,
  accao,
}: {
  titulo: string;
  descricao?: string;
  accao?: React.ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-[color:var(--border)] pb-5">
      <div>
        <h1 className="text-[length:var(--text-h3)] tracking-[-0.02em]">{titulo}</h1>
        {descricao ? (
          <p className="mt-2 max-w-[60ch] text-sm text-[color:var(--muted)]">{descricao}</p>
        ) : null}
      </div>
      {accao}
    </div>
  );
}

const TOM_CLASSE: Record<Tom, string> = {
  neutro: 'border-[color:var(--border)] text-[color:var(--muted)]',
  espera: 'border-[color:var(--border)] text-[color:var(--on-surface)]',
  bom: 'border-[color:var(--color-growth-500)] text-[color:var(--color-growth-500)]',
  aviso: 'border-[color:var(--color-signal-600)] text-[color:var(--color-signal-600)]',
  mau: 'border-[color:var(--color-signal-700)] text-[color:var(--color-signal-700)]',
};

export function StateBadge({ rotulo }: { rotulo: Rotulo | undefined }) {
  if (!rotulo) return <span className="text-[color:var(--muted)]">—</span>;

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-[--radius-xs] border px-2 py-1 font-[family-name:var(--font-chakra)] text-[length:var(--text-micro)] tracking-[var(--tracking-eyebrow)] uppercase',
        TOM_CLASSE[rotulo.tom],
      )}
    >
      {rotulo.texto}
    </span>
  );
}

export interface Coluna<T> {
  readonly chave: string;
  readonly cabecalho: string;
  readonly render: (linha: T) => React.ReactNode;
  readonly numerico?: boolean;
}

export function DataTable<T>({
  legenda,
  colunas,
  linhas,
  chaveDe,
  vazio,
}: {
  legenda: string;
  colunas: readonly Coluna<T>[];
  linhas: readonly T[];
  chaveDe: (linha: T) => string;
  vazio: React.ReactNode;
}) {
  if (linhas.length === 0) return <>{vazio}</>;

  return (
    <div className="overflow-x-auto border border-[color:var(--border)]">
      <table className="w-full border-collapse text-sm">
        {/* A legenda existe para quem navega por leitor de ecrã e salta de
            tabela em tabela; é invisível para os restantes. */}
        <caption className="sr-only">{legenda}</caption>
        <thead>
          <tr className="border-b border-[color:var(--border)] bg-[color:var(--surface-raised)]">
            {colunas.map((c) => (
              <th
                key={c.chave}
                scope="col"
                className={cn(
                  'px-4 py-3 text-left font-[family-name:var(--font-chakra)] text-[length:var(--text-micro)] tracking-[var(--tracking-eyebrow)] text-[color:var(--muted)] uppercase',
                  c.numerico && 'text-right',
                )}
              >
                {c.cabecalho}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {linhas.map((linha) => (
            <tr
              key={chaveDe(linha)}
              className="border-b border-[color:var(--hairline)] last:border-b-0 hover:bg-[color:var(--surface-raised)]"
            >
              {colunas.map((c) => (
                <td
                  key={c.chave}
                  className={cn('px-4 py-3 align-top', c.numerico && 'text-right tabular-nums')}
                >
                  {c.render(linha)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function EmptyState({ titulo, descricao }: { titulo: string; descricao?: string }) {
  return (
    <div className="border border-dashed border-[color:var(--border)] px-6 py-14 text-center">
      <p className="text-[length:var(--text-lead)]">{titulo}</p>
      {descricao ? (
        <p className="mx-auto mt-2 max-w-[48ch] text-sm text-[color:var(--muted)]">{descricao}</p>
      ) : null}
    </div>
  );
}

export function DefinitionList({
  itens,
}: {
  itens: readonly { termo: string; valor: React.ReactNode }[];
}) {
  return (
    <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-[minmax(10rem,auto)_1fr]">
      {itens.map((i) => (
        <div key={i.termo} className="contents">
          <dt className="font-[family-name:var(--font-chakra)] text-[length:var(--text-micro)] tracking-[var(--tracking-eyebrow)] text-[color:var(--muted)] uppercase">
            {i.termo}
          </dt>
          <dd className="text-sm break-words">{i.valor}</dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * Paginação por URL. Sem contagem total de propósito: um `count` exacto numa
 * tabela grande custa uma varredura completa a cada página, e ninguém precisa
 * de saber que há 4 812 contactos para ver os próximos vinte. Pede-se um
 * registo a mais do que cabe, e a existência desse registo é o que diz se há
 * página seguinte.
 */
export function Pagination({
  base,
  pagina,
  haMais,
  parametros,
}: {
  base: string;
  pagina: number;
  haMais: boolean;
  parametros?: Record<string, string | undefined>;
}) {
  const href = (p: number) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(parametros ?? {})) if (v) sp.set(k, v);
    if (p > 1) sp.set('pagina', String(p));
    const q = sp.toString();
    return q ? `${base}?${q}` : base;
  };

  if (pagina === 1 && !haMais) return null;

  return (
    <nav className="mt-6 flex items-center justify-between" aria-label="Paginação">
      {pagina > 1 ? (
        <Link href={href(pagina - 1)} className="min-h-11 py-3 text-sm underline">
          ← Página anterior
        </Link>
      ) : (
        <span />
      )}
      <span className="font-[family-name:var(--font-chakra)] text-[length:var(--text-micro)] tracking-[var(--tracking-eyebrow)] text-[color:var(--muted)] uppercase">
        Página {pagina}
      </span>
      {haMais ? (
        <Link href={href(pagina + 1)} className="min-h-11 py-3 text-sm underline">
          Página seguinte →
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}

/** Datas sempre no mesmo formato, e sempre com hora: num CRM, «ontem» não chega. */
export function DataHora({ valor }: { valor: string | null | undefined }) {
  if (!valor) return <span className="text-[color:var(--muted)]">—</span>;
  const d = new Date(valor);
  return (
    <time dateTime={d.toISOString()} className="tabular-nums">
      {d.toLocaleString('pt-PT', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Africa/Maputo',
      })}
    </time>
  );
}
