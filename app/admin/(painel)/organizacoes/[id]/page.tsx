import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AdminHeading, DataHora, DefinitionList, EmptyState } from '@/components/admin/primitives';
import { VoltarLista } from '@/components/admin/MemoriaLista';
import { Trilho } from '@/components/admin/Trilho';
import { LinhaTemporal, OportunidadesLigadas, Resumo360 } from '@/components/admin/crm/Ficha360';
import { createSessionClient } from '@/lib/auth/client';
import { requireStaff } from '@/lib/auth/session';
import { crmOperacional } from '@/lib/crm/activacao';
import { linhaTemporal } from '@/lib/crm/ficha360';
import { lerEquipa } from '@/lib/crm/leitura';
import { lerFontes, lerOportunidadesDe } from '@/lib/crm/leitura360';
import { rotuloDoSetor } from '@/lib/diagnostic/mercado';

export const metadata = { title: 'Organização' };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function agora(): Promise<Date> {
  return new Date(Date.now());
}

/**
 * A organização a 360°: as pessoas, as oportunidades (com o valor em aberto
 * por moeda) e uma linha temporal que junta o que aconteceu com todas elas,
 * com o nome de quem em cada entrada.
 */
export default async function OrganizacaoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  await requireStaff();
  const sb = await createSessionClient();
  const instante = await agora();
  const activo = (await crmOperacional(sb)) === true;

  const [org, contactos, oportunidades, equipa] = await Promise.all([
    sb
      .from('organisations')
      .select('id, name, domain, normalized_domain, country_code, sector, size_band, created_at')
      .eq('id', id)
      .maybeSingle(),
    sb.from('contacts').select('id, name, email, role, created_at').eq('organisation_id', id).order('created_at', { ascending: false }).limit(100),
    lerOportunidadesDe(sb, 'organisation_id', id, activo),
    lerEquipa(sb),
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
  const pessoas = (contactos.data ?? []) as { id: string; name: string; email: string; role: string | null; created_at: string }[];
  const nomes = new Map((equipa ?? []).map((e) => [e.id, e.nome]));
  const fontes = await lerFontes(sb, oportunidades, pessoas.map((p) => ({ id: p.id, nome: p.name })));
  const eventos = linhaTemporal({ ...fontes, consentimentos: [] }, nomes);

  return (
    <>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <Trilho itens={[{ texto: 'Organizações', href: '/admin/organizacoes' }, { texto: o.name }]} />
        <VoltarLista chave="organizacoes" lista="/admin/organizacoes" texto="Voltar à lista" />
      </div>
      <AdminHeading titulo={o.name} descricao={o.domain ?? undefined} />

      <Resumo360 oportunidades={oportunidades} ultima={fontes.actividades[0]?.occurred_at ?? null} activo={activo} />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <aside aria-label="Propriedades" className="flex flex-col gap-4 lg:col-start-2 lg:row-start-1">
          <section aria-labelledby="dados" className="border border-[color:var(--border)] p-4">
            <h2 id="dados" className="mb-3 text-sm font-medium">
              Dados
            </h2>
            <DefinitionList
              itens={[
                { termo: 'Domínio', valor: o.normalized_domain ?? '—' },
                { termo: 'Setor', valor: o.sector ? rotuloDoSetor(o.country_code, o.sector) : '—' },
                { termo: 'País', valor: (o.country_code ?? '—').toUpperCase() },
                { termo: 'Dimensão', valor: o.size_band ?? '—' },
                { termo: 'Criada', valor: <DataHora valor={o.created_at} /> },
              ]}
            />
          </section>
          <section aria-labelledby="pessoas" className="border border-[color:var(--border)] p-4">
            <h2 id="pessoas" className="mb-3 text-sm font-medium">
              Pessoas <span className="tabular-nums text-[color:var(--muted)]">{pessoas.length}</span>
            </h2>
            {pessoas.length === 0 ? (
              <EmptyState titulo="Sem contactos." />
            ) : (
              <ul role="list" className="flex flex-col gap-2 text-sm">
                {pessoas.map((p) => (
                  <li key={p.id}>
                    <Link href={`/admin/contactos/${p.id}`} className="underline-offset-4 hover:underline">
                      {p.name}
                    </Link>
                    <span className="block truncate text-xs text-[color:var(--muted)]">{[p.role, p.email].filter(Boolean).join(' · ')}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>

        <div className="flex min-w-0 flex-col gap-8 lg:col-start-1 lg:row-start-1">
          <OportunidadesLigadas itens={oportunidades} nomes={nomes} agora={instante} activo={activo} mostrarContacto />
          <LinhaTemporal eventos={eventos} />
        </div>
      </div>
    </>
  );
}
