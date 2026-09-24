import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  AdminHeading,
  DataHora,
  DefinitionList,
  EmptyState,
  StateBadge,
} from '@/components/admin/primitives';
import { ESTADO_DIAGNOSTICO, FASE_OPORTUNIDADE } from '@/lib/admin/labels';
import { createSessionClient } from '@/lib/auth/client';

export const metadata = { title: 'Contacto' };

export default async function ContactoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSessionClient();

  const [contacto, consentimentos, respostas, oportunidades] = await Promise.all([
    supabase
      .from('contacts')
      .select('id, name, email, phone, role, source, created_at, organisations(id, name, domain)')
      .eq('id', id)
      .maybeSingle(),
    supabase
      .from('consent_records')
      .select('id, purpose, granted, consent_text, consent_version, captured_at')
      .eq('contact_id', id)
      .order('captured_at', { ascending: false }),
    supabase
      .from('responses')
      .select('id, submitted_at, diagnostics(id, state, tier, score)')
      .eq('contact_id', id)
      .order('submitted_at', { ascending: false }),
    supabase
      .from('deals')
      .select('id, stage, tier, score, created_at')
      .eq('contact_id', id)
      .order('created_at', { ascending: false }),
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

  return (
    <>
      <AdminHeading titulo={c.name} descricao={c.email} />

      <section className="mb-10">
        <DefinitionList
          itens={[
            { termo: 'Telefone', valor: c.phone ?? '—' },
            { termo: 'Papel declarado', valor: c.role ?? '—' },
            { termo: 'Origem', valor: c.source ?? '—' },
            {
              termo: 'Organização',
              valor: c.organisations ? (
                <Link href={`/admin/organizacoes/${c.organisations.id}`} className="underline">
                  {c.organisations.name}
                </Link>
              ) : (
                'Sem organização associada'
              ),
            },
            { termo: 'Criado', valor: <DataHora valor={c.created_at} /> },
          ]}
        />
      </section>

      <section aria-labelledby="consentimento" className="mb-10">
        <h2 id="consentimento" className="mb-2 text-[length:var(--text-h3)] tracking-[-0.02em]">
          Consentimento
        </h2>
        <p className="mb-4 max-w-[70ch] text-sm text-[color:var(--muted)]">
          O texto guardado é o que esta pessoa leu, não um resumo. É isto que prova o que foi
          consentido, quando, e em que versão.
        </p>

        {(consentimentos.data ?? []).length === 0 ? (
          <EmptyState titulo="Sem registos de consentimento." />
        ) : (
          <ul className="flex flex-col gap-4">
            {(consentimentos.data ?? []).map((r) => (
              <li key={r.id as string} className="border border-[color:var(--border)] p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="text-sm font-medium">{r.purpose as string}</span>
                  <span className="font-[family-name:var(--font-chakra)] text-xs text-[color:var(--muted)]">
                    {r.consent_version as string} · <DataHora valor={r.captured_at as string} />
                  </span>
                </div>
                <blockquote className="mt-3 border-l-2 border-[color:var(--border)] pl-4 text-sm">
                  {r.consent_text as string}
                </blockquote>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="respostas" className="mb-10">
        <h2 id="respostas" className="mb-4 text-[length:var(--text-h3)] tracking-[-0.02em]">
          Respostas
        </h2>
        {(respostas.data ?? []).length === 0 ? (
          <EmptyState titulo="Sem respostas." />
        ) : (
          <ul className="flex flex-col gap-2">
            {(respostas.data ?? []).map((r) => {
              const d = (r.diagnostics as unknown as { id: string; state: string }[] | null)?.[0];
              return (
                <li
                  key={r.id as string}
                  className="flex flex-wrap items-center gap-3 border border-[color:var(--border)] px-4 py-3 text-sm"
                >
                  <DataHora valor={r.submitted_at as string} />
                  {d ? (
                    <>
                      <StateBadge
                        rotulo={ESTADO_DIAGNOSTICO[d.state as keyof typeof ESTADO_DIAGNOSTICO]}
                      />
                      <Link href={`/admin/diagnosticos/${d.id}`} className="underline">
                        Abrir diagnóstico
                      </Link>
                    </>
                  ) : null}
                </li>
              );
            })}
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
            {(oportunidades.data ?? []).map((o) => (
              <li
                key={o.id as string}
                className="flex flex-wrap items-center gap-3 border border-[color:var(--border)] px-4 py-3 text-sm"
              >
                <StateBadge rotulo={FASE_OPORTUNIDADE[o.stage as keyof typeof FASE_OPORTUNIDADE]} />
                <span>
                  {o.tier as string} · {o.score as number} pontos
                </span>
                <Link href={`/admin/oportunidades/${o.id}`} className="underline">
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
