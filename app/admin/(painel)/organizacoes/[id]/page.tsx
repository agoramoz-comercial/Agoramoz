import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  AdminHeading,
  DataHora,
  DefinitionList,
  EmptyState,
  StateBadge,
} from '@/components/admin/primitives';
import { SECTOR_LABELS } from '@/content/registry';
import { FASE_OPORTUNIDADE } from '@/lib/admin/labels';
import { createSessionClient } from '@/lib/auth/client';

export const metadata = { title: 'Organização' };

export default async function OrganizacaoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSessionClient();

  const [org, contactos, oportunidades] = await Promise.all([
    supabase
      .from('organisations')
      .select('id, name, domain, normalized_domain, country_code, sector, size_band, created_at')
      .eq('id', id)
      .maybeSingle(),
    supabase
      .from('contacts')
      .select('id, name, email, created_at')
      .eq('organisation_id', id)
      .order('created_at', { ascending: false }),
    supabase
      .from('deals')
      .select('id, stage, tier, score')
      .eq('organisation_id', id)
      .order('created_at', { ascending: false }),
  ]);

  if (!org.data) notFound();
  const o = org.data as unknown as {
    id: string;
    name: string;
    domain: string | null;
    normalized_domain: string | null;
    country_code: string | null;
    sector: string | null;
    size_band: string | null;
    created_at: string;
  };

  return (
    <>
      <AdminHeading titulo={o.name} descricao={o.domain ?? undefined} />

      <section className="mb-10">
        <DefinitionList
          itens={[
            { termo: 'Domínio normalizado', valor: o.normalized_domain ?? '—' },
            {
              termo: 'Setor',
              valor: o.sector
                ? (SECTOR_LABELS[o.sector as keyof typeof SECTOR_LABELS] ?? o.sector)
                : '—',
            },
            { termo: 'País', valor: (o.country_code ?? '—').toUpperCase() },
            { termo: 'Dimensão', valor: o.size_band ?? '—' },
            { termo: 'Criada', valor: <DataHora valor={o.created_at} /> },
          ]}
        />
      </section>

      <section aria-labelledby="contactos" className="mb-10">
        <h2 id="contactos" className="mb-4 text-[length:var(--text-h3)] tracking-[-0.02em]">
          Contactos
        </h2>
        {(contactos.data ?? []).length === 0 ? (
          <EmptyState titulo="Sem contactos associados." />
        ) : (
          <ul className="flex flex-col gap-2">
            {(contactos.data ?? []).map((c) => (
              <li
                key={c.id as string}
                className="flex flex-wrap items-center gap-3 border border-[color:var(--border)] px-4 py-3 text-sm"
              >
                <Link href={`/admin/contactos/${c.id}`} className="underline">
                  {c.name as string}
                </Link>
                <span className="text-[color:var(--muted)]">{c.email as string}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="oportunidades">
        <h2 id="oportunidades" className="mb-4 text-[length:var(--text-h3)] tracking-[-0.02em]">
          Oportunidades
        </h2>
        {(oportunidades.data ?? []).length === 0 ? (
          <EmptyState titulo="Sem oportunidades." />
        ) : (
          <ul className="flex flex-col gap-2">
            {(oportunidades.data ?? []).map((d) => (
              <li
                key={d.id as string}
                className="flex flex-wrap items-center gap-3 border border-[color:var(--border)] px-4 py-3 text-sm"
              >
                <StateBadge rotulo={FASE_OPORTUNIDADE[d.stage as keyof typeof FASE_OPORTUNIDADE]} />
                <Link href={`/admin/oportunidades/${d.id}`} className="underline">
                  Abrir
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
