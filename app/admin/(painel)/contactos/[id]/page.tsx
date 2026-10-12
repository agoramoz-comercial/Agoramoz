import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AdminHeading, DataHora, DefinitionList } from '@/components/admin/primitives';
import { VoltarLista } from '@/components/admin/MemoriaLista';
import { Trilho } from '@/components/admin/Trilho';
import { Consentimento, LinhaTemporal, OportunidadesLigadas, Resumo360 } from '@/components/admin/crm/Ficha360';
import { createSessionClient } from '@/lib/auth/client';
import { requireStaff } from '@/lib/auth/session';
import { crmOperacional } from '@/lib/crm/activacao';
import { estadoConsentimento, linhaTemporal, type RegistoConsentimento } from '@/lib/crm/ficha360';
import { lerEquipa } from '@/lib/crm/leitura';
import { lerFontes, lerOportunidadesDe } from '@/lib/crm/leitura360';

export const metadata = { title: 'Contacto' };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function agora(): Promise<Date> {
  return new Date(Date.now());
}

/**
 * O contacto a 360°: quem é, a que empresa pertence, o estado do seu
 * consentimento, as oportunidades (com dono e próximo passo) e uma só linha
 * temporal com tudo — respostas, actividades, reuniões, consentimentos.
 */
export default async function ContactoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  await requireStaff();
  const sb = await createSessionClient();
  const instante = await agora();
  const activo = (await crmOperacional(sb)) === true;

  const [contacto, consentimentos, oportunidades, equipa] = await Promise.all([
    sb
      .from('contacts')
      .select('id, name, email, phone, role, source, created_at, organisations(id, name, domain)')
      .eq('id', id)
      .maybeSingle(),
    sb
      .from('consent_records')
      .select('id, purpose, granted, consent_text, consent_version, captured_at, withdrawn_at')
      .eq('contact_id', id)
      .order('captured_at', { ascending: false }),
    lerOportunidadesDe(sb, 'contact_id', id, activo),
    lerEquipa(sb),
  ]);

  if (!contacto.data) notFound();
  const c = contacto.data as unknown as {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    role: string | null;
    source: string | null;
    created_at: string;
    organisations: { id: string; name: string; domain: string | null } | null;
  };
  const registos = (consentimentos.data ?? []) as RegistoConsentimento[];
  const nomes = new Map((equipa ?? []).map((e) => [e.id, e.nome]));
  const fontes = await lerFontes(sb, oportunidades, [{ id: c.id, nome: c.name }]);
  const eventos = linhaTemporal({ ...fontes, consentimentos: registos }, nomes);
  const ultima = fontes.actividades[0]?.occurred_at ?? null;

  return (
    <>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <Trilho itens={[{ texto: 'Contactos', href: '/admin/contactos' }, { texto: c.name }]} />
        <VoltarLista chave="contactos" lista="/admin/contactos" texto="Voltar à lista" />
      </div>
      <AdminHeading titulo={c.name} descricao={[c.role, c.organisations?.name].filter(Boolean).join(' · ') || c.email} />

      <Resumo360 oportunidades={oportunidades} ultima={ultima} activo={activo} />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <aside aria-label="Propriedades" className="flex flex-col gap-4 lg:col-start-2 lg:row-start-1">
          <section aria-labelledby="dados" className="border border-[color:var(--border)] p-4">
            <h2 id="dados" className="mb-3 text-sm font-medium">
              Dados
            </h2>
            <DefinitionList
              itens={[
                { termo: 'Email', valor: c.email },
                { termo: 'Telefone', valor: c.phone ?? '—' },
                { termo: 'Papel declarado', valor: c.role ?? '—' },
                {
                  termo: 'Organização',
                  valor: c.organisations ? (
                    <Link href={`/admin/organizacoes/${c.organisations.id}`} className="underline">
                      {c.organisations.name}
                    </Link>
                  ) : (
                    'Sem organização'
                  ),
                },
                { termo: 'Origem', valor: c.source ?? '—' },
                { termo: 'Criado', valor: <DataHora valor={c.created_at} /> },
              ]}
            />
          </section>
          <Consentimento actuais={estadoConsentimento(registos)} registos={registos} />
        </aside>

        <div className="flex min-w-0 flex-col gap-8 lg:col-start-1 lg:row-start-1">
          <OportunidadesLigadas itens={oportunidades} nomes={nomes} agora={instante} activo={activo} />
          <LinhaTemporal eventos={eventos} />
        </div>
      </div>
    </>
  );
}
