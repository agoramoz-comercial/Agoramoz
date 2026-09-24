import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  AdminHeading,
  DataHora,
  DefinitionList,
  EmptyState,
  StateBadge,
} from '@/components/admin/primitives';
import { Button } from '@/components/ui/Button';
import { atribuirOportunidade, mudarFase, registarNota } from '@/lib/admin/actions';
import { CANAL, CLASSIFICACAO, FASES_OPORTUNIDADE, FASE_OPORTUNIDADE } from '@/lib/admin/labels';
import type { Canal } from '@/lib/attribution/types';
import { createSessionClient } from '@/lib/auth/client';
import { podeEscrever, requireStaff } from '@/lib/auth/session';

export const metadata = { title: 'Oportunidade' };

interface Actividade {
  id: number;
  activity_type: string;
  body: string | null;
  occurred_at: string;
  actor_type: string;
  metadata: Record<string, unknown>;
}

export default async function OportunidadePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string; ok?: string }>;
}) {
  const { id } = await params;
  const { erro, ok } = await searchParams;
  const sessao = await requireStaff();
  const supabase = await createSessionClient();

  const [negocio, actividades, equipa] = await Promise.all([
    supabase
      .from('deals')
      .select(
        'id, stage, tier, score, owner_id, next_action_at, created_at, acquisition_channel, acquisition_campaign, contacts(id, name, email), organisations(id, name), source_response_id',
      )
      .eq('id', id)
      .maybeSingle(),
    supabase
      .from('activities')
      .select('id, activity_type, body, occurred_at, actor_type, metadata')
      .eq('deal_id', id)
      .order('occurred_at', { ascending: false })
      .limit(50),
    supabase.from('profiles').select('id, display_name').eq('active', true).order('display_name'),
  ]);

  if (!negocio.data) notFound();
  const d = negocio.data as unknown as {
    id: string;
    stage: string;
    tier: string | null;
    score: number | null;
    owner_id: string | null;
    created_at: string;
    contacts: { id: string; name: string; email: string } | null;
    organisations: { id: string; name: string } | null;
    acquisition_channel: string;
    acquisition_campaign: string | null;
    source_response_id: string | null;
  };

  /**
   * O detalhe da origem vive em `response_attribution` e lê-se por junção.
   * Só o canal e a campanha estão projectados em `deals` — são os dois que a
   * lista filtra, e é a lista que se abre dezenas de vezes por dia.
   *
   * Consulta separada e não dentro do `Promise.all` acima porque depende do
   * `source_response_id`, que só se conhece depois da primeira.
   */
  const atribuicao = d.source_response_id
    ? (
        await supabase
          .from('response_attribution')
          .select(
            'utm_source, utm_medium, utm_campaign, utm_content, landing_page, referrer_host, first_touch_at, last_touch_at, channel',
          )
          .eq('response_id', d.source_response_id)
          .maybeSingle()
      ).data
    : null;

  const escreve = podeEscrever(sessao.papel);
  const linhas = (actividades.data ?? []) as unknown as Actividade[];
  const pessoas = (equipa.data ?? []) as unknown as { id: string; display_name: string }[];

  return (
    <>
      <AdminHeading
        titulo={d.contacts?.name ?? 'Oportunidade'}
        descricao={d.organisations?.name}
        accao={<StateBadge rotulo={FASE_OPORTUNIDADE[d.stage as keyof typeof FASE_OPORTUNIDADE]} />}
      />

      {erro ? (
        <p
          role="alert"
          className="mb-6 border border-[color:var(--color-signal-600)] px-4 py-3 text-sm text-[color:var(--color-signal-600)]"
        >
          {erro}
        </p>
      ) : null}
      {ok ? (
        <p role="status" className="mb-6 border border-[color:var(--border)] px-4 py-3 text-sm">
          Registado.
        </p>
      ) : null}

      <section className="mb-10">
        <DefinitionList
          itens={[
            {
              termo: 'Contacto',
              valor: d.contacts ? (
                <Link href={`/admin/contactos/${d.contacts.id}`} className="underline">
                  {d.contacts.name} · {d.contacts.email}
                </Link>
              ) : (
                '—'
              ),
            },
            {
              termo: 'Classificação',
              valor: d.tier
                ? `${d.tier} — ${CLASSIFICACAO[d.tier] ?? ''} (${d.score} pontos)`
                : '—',
            },
            {
              termo: 'Responsável',
              valor: pessoas.find((p) => p.id === d.owner_id)?.display_name ?? 'Por atribuir',
            },
            { termo: 'Criada', valor: <DataHora valor={d.created_at} /> },
          ]}
        />
      </section>

      <section aria-labelledby="origem" className="mb-10">
        <h2 id="origem" className="mb-4 text-sm font-medium">
          Origem
        </h2>
        <DefinitionList
          itens={[
            {
              termo: 'Canal',
              valor: <StateBadge rotulo={CANAL[d.acquisition_channel as Canal]} />,
            },
            { termo: 'Campanha', valor: d.acquisition_campaign ?? '—' },
            { termo: 'Fonte', valor: atribuicao?.utm_source ?? '—' },
            { termo: 'Meio', valor: atribuicao?.utm_medium ?? '—' },
            { termo: 'Conteúdo', valor: atribuicao?.utm_content ?? '—' },
            { termo: 'Página de entrada', valor: atribuicao?.landing_page ?? '—' },
            { termo: 'Veio de', valor: atribuicao?.referrer_host ?? '—' },
            {
              termo: 'Primeiro contacto',
              valor: atribuicao?.first_touch_at ? <DataHora valor={atribuicao.first_touch_at} /> : '—',
            },
            {
              termo: 'Submeteu',
              valor: atribuicao?.last_touch_at ? <DataHora valor={atribuicao.last_touch_at} /> : '—',
            },
          ]}
        />
      </section>

      {escreve ? (
        <section aria-labelledby="accoes" className="mb-10 grid gap-8 lg:grid-cols-2">
          <h2 id="accoes" className="sr-only">
            Acções
          </h2>

          <form action={mudarFase} className="border border-[color:var(--border)] p-5">
            <input type="hidden" name="id" value={d.id} />
            <h3 className="text-sm font-medium">Mudar de fase</h3>
            <label htmlFor="fase" className="sr-only">
              Nova fase
            </label>
            <select
              id="fase"
              name="fase"
              defaultValue={d.stage}
              className="mt-3 min-h-11 w-full rounded-[--radius-sm] border border-[color:var(--border)] bg-[color:var(--surface)] px-3"
            >
              {FASES_OPORTUNIDADE.map((f) => (
                <option key={f} value={f}>
                  {FASE_OPORTUNIDADE[f].texto}
                </option>
              ))}
            </select>
            <label htmlFor="nota-fase" className="mt-3 block text-xs text-[color:var(--muted)]">
              Nota (opcional) — fica na cronologia
            </label>
            <input
              id="nota-fase"
              name="nota"
              className="mt-1 min-h-11 w-full rounded-[--radius-sm] border border-[color:var(--border)] bg-[color:var(--surface)] px-3 text-sm"
            />
            <Button type="submit" variant="outline" size="sm" className="mt-4">
              Guardar fase
            </Button>
          </form>

          <form action={atribuirOportunidade} className="border border-[color:var(--border)] p-5">
            <input type="hidden" name="id" value={d.id} />
            <h3 className="text-sm font-medium">Responsável</h3>
            <label htmlFor="owner" className="sr-only">
              Responsável
            </label>
            <select
              id="owner"
              name="owner"
              defaultValue={d.owner_id ?? ''}
              className="mt-3 min-h-11 w-full rounded-[--radius-sm] border border-[color:var(--border)] bg-[color:var(--surface)] px-3"
            >
              <option value="">Sem responsável</option>
              {pessoas.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.display_name}
                </option>
              ))}
            </select>
            <p className="mt-2 text-xs text-[color:var(--muted)]">
              Só perfis activos. Atribuir a quem não tem acesso é deixar a oportunidade sem dono
              efectivo.
            </p>
            <Button type="submit" variant="outline" size="sm" className="mt-4">
              Atribuir
            </Button>
          </form>

          <form
            action={registarNota}
            className="border border-[color:var(--border)] p-5 lg:col-span-2"
          >
            <input type="hidden" name="id" value={d.id} />
            <label htmlFor="corpo" className="text-sm font-medium">
              Nova nota
            </label>
            <textarea
              id="corpo"
              name="corpo"
              rows={3}
              required
              className="mt-2 w-full rounded-[--radius-sm] border border-[color:var(--border)] bg-[color:var(--surface)] p-3 text-sm"
            />
            <Button type="submit" variant="outline" size="sm" className="mt-3">
              Registar nota
            </Button>
          </form>
        </section>
      ) : (
        <p className="mb-10 text-sm text-[color:var(--muted)]">
          O seu papel é de leitura: pode consultar a oportunidade, não alterá-la.
        </p>
      )}

      <section aria-labelledby="cronologia">
        <h2 id="cronologia" className="mb-4 text-[length:var(--text-h3)] tracking-[-0.02em]">
          Cronologia
        </h2>
        {linhas.length === 0 ? (
          <EmptyState titulo="Ainda não há actividade registada." />
        ) : (
          <ol className="flex flex-col gap-3">
            {linhas.map((a) => (
              <li key={a.id} className="border-l-2 border-[color:var(--border)] py-1 pl-4">
                <p className="font-[family-name:var(--font-chakra)] text-[length:var(--text-micro)] tracking-[var(--tracking-eyebrow)] text-[color:var(--muted)] uppercase">
                  {a.activity_type} · <DataHora valor={a.occurred_at} />
                </p>
                {a.body ? <p className="mt-1 text-sm whitespace-pre-wrap">{a.body}</p> : null}
                {a.metadata && Object.keys(a.metadata).length > 0 ? (
                  <p className="mt-1 text-xs text-[color:var(--muted)]">
                    {Object.entries(a.metadata)
                      .map(([k, v]) => `${k}: ${String(v ?? '—')}`)
                      .join(' · ')}
                  </p>
                ) : null}
              </li>
            ))}
          </ol>
        )}
      </section>
    </>
  );
}
