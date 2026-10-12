import Link from 'next/link';
import { AdminHeading, EmptyState, StateBadge } from '@/components/admin/primitives';
import { CAMPO, ROTULO } from '@/components/admin/crm/partes';
import { FASE_OPORTUNIDADE, type FaseOportunidade } from '@/lib/admin/labels';
import { createSessionClient } from '@/lib/auth/client';
import { requireStaff } from '@/lib/auth/session';
import { pesquisar } from '@/lib/crm/pesquisa';
import { limparTermo, MIN_TERMO, totalDe } from '@/lib/crm/pesquisa-modelo';
import { cn } from '@/lib/utils/cn';

export const metadata = { title: 'Pesquisa' };

/**
 * A pesquisa global numa página: o mesmo resultado da paleta (⌘K), mas com
 * endereço próprio — funciona sem JavaScript e pode ser partilhada.
 */
export default async function PesquisaPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  await requireStaff();
  const termo = limparTermo(q);
  const r = termo ? await pesquisar(await createSessionClient(), termo) : null;

  return (
    <>
      <AdminHeading titulo="Pesquisa" descricao="Contactos, organizações e oportunidades por nome, email, telefone ou domínio. Atalho: ⌘K ou /." />
      <form method="get" role="search" className="mb-8 flex flex-wrap items-end gap-3">
        <label className="flex min-w-0 flex-1 flex-col gap-1">
          <span className={ROTULO}>Procurar</span>
          <input type="search" name="q" defaultValue={termo ?? q ?? ''} minLength={MIN_TERMO} maxLength={80} required className={cn(CAMPO, 'max-w-xl')} />
        </label>
        <button type="submit" className="min-h-11 border border-[color:var(--border)] px-4 text-sm hover:bg-[color:var(--surface-raised)]">
          Pesquisar
        </button>
      </form>

      {!termo ? (
        <p className="text-sm text-[color:var(--muted)]">Escreva pelo menos {MIN_TERMO} letras.</p>
      ) : r === null ? (
        <p role="alert" className="text-sm">
          A pesquisa falhou. Tente de novo.
        </p>
      ) : totalDe(r) === 0 ? (
        <EmptyState titulo={`Sem resultados para «${termo}».`} descricao="Experimente parte do nome, o domínio do email ou o nome da empresa." />
      ) : (
        <div className="grid gap-8 lg:grid-cols-3">
          <Grupo titulo="Oportunidades" n={r.oportunidades.length}>
            {r.oportunidades.map((o) => (
              <li key={o.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <span className="min-w-0">
                  <Link href={`/admin/oportunidades/${o.id}`} data-atalho-linha className="font-medium underline-offset-4 hover:underline">
                    {o.contacto}
                  </Link>
                  {o.organizacao ? <span className="block truncate text-xs text-[color:var(--muted)]">{o.organizacao}</span> : null}
                </span>
                <StateBadge rotulo={FASE_OPORTUNIDADE[o.fase as FaseOportunidade]} />
              </li>
            ))}
          </Grupo>
          <Grupo titulo="Contactos" n={r.contactos.length}>
            {r.contactos.map((c) => (
              <li key={c.id} className="px-4 py-3">
                <Link href={`/admin/contactos/${c.id}`} data-atalho-linha className="font-medium underline-offset-4 hover:underline">
                  {c.nome}
                </Link>
                {c.email ? <span className="block truncate text-xs text-[color:var(--muted)]">{c.email}</span> : null}
              </li>
            ))}
          </Grupo>
          <Grupo titulo="Organizações" n={r.organizacoes.length}>
            {r.organizacoes.map((o) => (
              <li key={o.id} className="px-4 py-3">
                <Link href={`/admin/organizacoes/${o.id}`} data-atalho-linha className="font-medium underline-offset-4 hover:underline">
                  {o.nome}
                </Link>
                {o.dominio ? <span className="block truncate text-xs text-[color:var(--muted)]">{o.dominio}</span> : null}
              </li>
            ))}
          </Grupo>
        </div>
      )}
    </>
  );
}

function Grupo({ titulo, n, children }: { titulo: string; n: number; children: React.ReactNode }) {
  return (
    <section aria-label={titulo}>
      <h2 className="mb-2 flex items-baseline gap-2 text-sm font-medium">
        {titulo} <span className="tabular-nums text-[color:var(--muted)]">{n}</span>
      </h2>
      {n === 0 ? (
        <p className="border border-dashed border-[color:var(--border)] px-4 py-5 text-sm text-[color:var(--muted)]">Nenhum.</p>
      ) : (
        <ul role="list" className="divide-y divide-[color:var(--hairline)] border border-[color:var(--border)] bg-[color:var(--surface-raised)]">
          {children}
        </ul>
      )}
    </section>
  );
}
