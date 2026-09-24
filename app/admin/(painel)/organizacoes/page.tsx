import Link from 'next/link';
import {
  AdminHeading,
  DataHora,
  DataTable,
  EmptyState,
  Pagination,
} from '@/components/admin/primitives';
import { SECTOR_LABELS } from '@/content/registry';
import { fatiar, intervalo } from '@/lib/admin/paginacao';
import { createSessionClient } from '@/lib/auth/client';

export const metadata = { title: 'Organizações' };

interface Linha {
  id: string;
  name: string;
  domain: string | null;
  country_code: string | null;
  sector: string | null;
  created_at: string;
}

export default async function OrganizacoesPage({
  searchParams,
}: {
  searchParams: Promise<{ pagina?: string }>;
}) {
  const { pagina: paginaBruta } = await searchParams;
  const { pagina, de, ate } = intervalo(paginaBruta);

  const supabase = await createSessionClient();
  const { data } = await supabase
    .from('organisations')
    .select('id, name, domain, country_code, sector, created_at')
    .order('created_at', { ascending: false })
    .range(de, ate);

  const { linhas, haMais } = fatiar(data as unknown as Linha[] | null);

  return (
    <>
      <AdminHeading
        titulo="Organizações"
        descricao="Criadas a partir do domínio do correio de trabalho. Domínios de correio pessoal não criam organização — senão «gmail.com» tornava-se uma empresa com dezenas de contactos sem relação nenhuma."
      />

      <DataTable
        legenda="Organizações conhecidas"
        linhas={linhas}
        chaveDe={(l) => l.id}
        vazio={<EmptyState titulo="Ainda não há organizações." />}
        colunas={[
          {
            chave: 'nome',
            cabecalho: 'Nome',
            render: (l) => (
              <Link href={`/admin/organizacoes/${l.id}`} className="underline">
                {l.name}
              </Link>
            ),
          },
          {
            chave: 'dominio',
            cabecalho: 'Domínio',
            render: (l) => l.domain ?? <span className="text-[color:var(--muted)]">—</span>,
          },
          {
            chave: 'setor',
            cabecalho: 'Setor',
            render: (l) =>
              l.sector ? (SECTOR_LABELS[l.sector as keyof typeof SECTOR_LABELS] ?? l.sector) : '—',
          },
          {
            chave: 'pais',
            cabecalho: 'País',
            render: (l) => (l.country_code ?? '—').toUpperCase(),
          },
          {
            chave: 'criada',
            cabecalho: 'Criada',
            render: (l) => <DataHora valor={l.created_at} />,
          },
        ]}
      />

      <Pagination base="/admin/organizacoes" pagina={pagina} haMais={haMais} />
    </>
  );
}
