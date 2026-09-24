import Link from 'next/link';
import {
  AdminHeading,
  DataHora,
  DataTable,
  EmptyState,
  Pagination,
} from '@/components/admin/primitives';
import { fatiar, intervalo } from '@/lib/admin/paginacao';
import { createSessionClient } from '@/lib/auth/client';

export const metadata = { title: 'Contactos' };

interface Linha {
  id: string;
  name: string;
  email: string;
  created_at: string;
  organisations: { id: string; name: string } | null;
}

export default async function ContactosPage({
  searchParams,
}: {
  searchParams: Promise<{ pagina?: string; q?: string }>;
}) {
  const { pagina: paginaBruta, q } = await searchParams;
  const { pagina, de, ate } = intervalo(paginaBruta);
  const procura = (q ?? '').trim();

  const supabase = await createSessionClient();
  let consulta = supabase
    .from('contacts')
    .select('id, name, email, created_at, organisations(id, name)')
    .order('created_at', { ascending: false })
    .range(de, ate);

  if (procura) {
    /**
     * `%` e `,` são escapados: no PostgREST, uma vírgula separa condições
     * dentro de `or(...)`, pelo que um termo de procura com vírgula alteraria
     * a consulta em vez de ser procurado.
     */
    const termo = procura.replace(/[%,()]/g, ' ');
    consulta = consulta.or(`name.ilike.%${termo}%,email.ilike.%${termo}%`);
  }

  const { data } = await consulta;
  const { linhas, haMais } = fatiar(data as unknown as Linha[] | null);

  return (
    <>
      <AdminHeading titulo="Contactos" descricao="Quem respondeu ao diagnóstico." />

      <form method="get" className="mb-6 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1">
          <span className="font-[family-name:var(--font-chakra)] text-[length:var(--text-micro)] tracking-[var(--tracking-eyebrow)] text-[color:var(--muted)] uppercase">
            Procurar
          </span>
          <input
            type="search"
            name="q"
            defaultValue={procura}
            placeholder="Nome ou correio"
            className="min-h-11 w-64 rounded-[--radius-sm] border border-[color:var(--border)] bg-[color:var(--surface)] px-3"
          />
        </label>
        <button type="submit" className="min-h-11 border border-[color:var(--border)] px-4 text-sm">
          Procurar
        </button>
      </form>

      <DataTable
        legenda="Contactos, do mais recente para o mais antigo"
        linhas={linhas}
        chaveDe={(l) => l.id}
        vazio={<EmptyState titulo={procura ? 'Sem resultados.' : 'Ainda não há contactos.'} />}
        colunas={[
          {
            chave: 'nome',
            cabecalho: 'Nome',
            render: (l) => (
              <Link href={`/admin/contactos/${l.id}`} className="underline">
                {l.name}
              </Link>
            ),
          },
          { chave: 'email', cabecalho: 'Correio', render: (l) => l.email },
          {
            chave: 'org',
            cabecalho: 'Organização',
            render: (l) =>
              l.organisations ? (
                <Link href={`/admin/organizacoes/${l.organisations.id}`} className="underline">
                  {l.organisations.name}
                </Link>
              ) : (
                <span className="text-[color:var(--muted)]">—</span>
              ),
          },
          {
            chave: 'criado',
            cabecalho: 'Criado',
            render: (l) => <DataHora valor={l.created_at} />,
          },
        ]}
      />

      <Pagination
        base="/admin/contactos"
        pagina={pagina}
        haMais={haMais}
        parametros={{ q: procura || undefined }}
      />
    </>
  );
}
