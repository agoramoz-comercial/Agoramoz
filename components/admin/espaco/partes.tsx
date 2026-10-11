import Link from 'next/link';
import { inputClass } from '@/components/form/Field';
import { cn } from '@/lib/utils/cn';

/**
 * Peças comuns aos espaços privados do admin (Espaço CEnO, Gabinete).
 * Componentes de servidor: os espaços funcionam sem JavaScript, e os
 * formulários são formulários (POST para Server Actions).
 */

export const ROTULO = 'text-sm font-medium';
export const AJUDA = 'text-sm text-[color:var(--muted)]';
export const CAIXA = 'grid gap-5 border border-[color:var(--border)] bg-[color:var(--surface)] p-5';
export const H2 = 'text-[length:var(--text-h3)] tracking-[-0.02em]';
export const AREA = `${inputClass} min-h-24`;

export interface SeccaoEspaco {
  readonly href: string;
  readonly texto: string;
  readonly chave: string;
}

/** As secções de um espaço, com a actual marcada. */
export function NavEspaco({
  seccoes,
  activo,
  rotulo,
}: {
  seccoes: readonly SeccaoEspaco[];
  activo: string;
  rotulo: string;
}) {
  return (
    <nav aria-label={rotulo} className="mb-8 flex flex-wrap gap-2">
      {seccoes.map((s) => (
        <Link
          key={s.chave}
          href={s.href}
          aria-current={s.chave === activo ? 'page' : undefined}
          className={cn(
            'inline-flex min-h-11 items-center rounded-[--radius-xs] border px-4 text-sm',
            s.chave === activo
              ? 'border-[color:var(--on-surface)] bg-[color:var(--on-surface)] font-medium text-[color:var(--surface)]'
              : 'border-[color:var(--border)] text-[color:var(--muted)] hover:text-[color:var(--on-surface)]',
          )}
        >
          {s.texto}
        </Link>
      ))}
    </nav>
  );
}

/** O resultado da última acção: erro (alerta) ou sucesso (estado). */
export function Mensagens({
  erro,
  ok,
  textos,
}: {
  erro?: string;
  ok?: string;
  textos: Readonly<Record<string, string>>;
}) {
  return (
    <>
      {erro && (
        <p
          role="alert"
          className="mb-6 border border-[color:var(--color-signal-600)] px-4 py-3 text-sm text-[color:var(--color-signal-700)]"
        >
          {erro.slice(0, 300)}
        </p>
      )}
      {ok && Object.hasOwn(textos, ok) && (
        <p role="status" className="mb-6 border border-[color:var(--border)] px-4 py-3 text-sm">
          {textos[ok]}
        </p>
      )}
    </>
  );
}

/** Uma leitura falhou: dizê-lo, em vez de mostrar zeros ou listas vazias como se fossem reais. */
export function ErroLeitura({ texto = 'Não foi possível ler os dados agora. Recarregue dentro de instantes.' }: { texto?: string }) {
  return (
    <p role="alert" className="border border-[color:var(--color-signal-600)] px-4 py-3 text-sm text-[color:var(--color-signal-700)]">
      {texto}
    </p>
  );
}

/** Um número de painel: rótulo, valor, e a definição por baixo. */
export function Kpi({ rotulo, valor, nota }: { rotulo: string; valor: string; nota?: string }) {
  return (
    <div className="h-full rounded-[--radius-sm] border border-[color:var(--border)] bg-[color:var(--surface-raised)] p-5">
      <p className="text-sm text-[color:var(--muted)]">{rotulo}</p>
      <p className="mt-2 font-[family-name:var(--font-display)] text-[1.75rem] leading-none font-semibold tracking-[-0.03em] tabular-nums">
        {valor}
      </p>
      {nota && <p className="mt-2 text-xs text-[color:var(--muted)]">{nota}</p>}
    </div>
  );
}

export function Opcoes({ valores }: { valores: Readonly<Record<string, string>> }) {
  return (
    <>
      {Object.entries(valores).map(([v, t]) => (
        <option key={v} value={v}>
          {t}
        </option>
      ))}
    </>
  );
}

/** Rótulo + controlo + ajuda (a ajuda tem id `<id>-ajuda` para `aria-describedby`). */
export function Campo({
  id,
  rotulo,
  ajuda,
  children,
}: {
  id: string;
  rotulo: string;
  ajuda?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-2">
      <label htmlFor={id} className={ROTULO}>
        {rotulo}
      </label>
      {children}
      {ajuda && (
        <p id={`${id}-ajuda`} className={AJUDA}>
          {ajuda}
        </p>
      )}
    </div>
  );
}

/** Tabela larga: rola sozinha no telemóvel e o teclado chega lá (foco + nome). */
export function Rolavel({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <div role="region" aria-label={rotulo} tabIndex={0} className="overflow-x-auto focus-visible:outline-2">
      {children}
    </div>
  );
}
