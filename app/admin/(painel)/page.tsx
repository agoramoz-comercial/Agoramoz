import Link from 'next/link';
import {
  AdminHeading,
  DataHora,
  DataTable,
  EmptyState,
  StateBadge,
} from '@/components/admin/primitives';
import { CLASSIFICACAO, ESTADO_DIAGNOSTICO } from '@/lib/admin/labels';
import { createSessionClient } from '@/lib/auth/client';

/**
 * Painel. Responde a «o que precisa de mim agora?» e nada mais.
 *
 * As contagens são `head: true`: pedem o número sem trazer as linhas.
 */

interface LinhaRecente {
  id: string;
  submitted_at: string;
  contacts: { name: string; email: string } | null;
  diagnostics: { id: string; state: string; score: number; tier: string }[] | null;
}

type Cliente = Awaited<ReturnType<typeof createSessionClient>>;
type Consulta = ReturnType<ReturnType<Cliente['from']>['select']>;

async function contar(
  supabase: Cliente,
  tabela: string,
  filtro?: (q: Consulta) => Consulta,
): Promise<number> {
  const base = supabase.from(tabela).select('*', { count: 'exact', head: true });
  const { count } = await (filtro ? filtro(base) : base);
  return count ?? 0;
}

/**
 * O relógio fica fora do corpo do componente de propósito.
 *
 * O compilador do React recusa `Date.now()` durante a renderização, e tem
 * razão no caso geral: um componente que lê o relógio não é idempotente. Aqui
 * é um componente de servidor que corre uma vez por pedido, mas a regra não
 * distingue — e contorná-la com um comentário de supressão seria desligar o
 * aviso em vez de arrumar o código.
 */
async function janelaDe(dias: number): Promise<string> {
  return new Date(Date.now() - dias * 24 * 3600 * 1000).toISOString();
}

export default async function PainelPage() {
  const supabase = await createSessionClient();

  const seteDias = await janelaDe(7);

  const [novos, porRever, aprovados, fila, mortos, recentes] = await Promise.all([
    contar(supabase, 'responses', (q) => q.gte('submitted_at', seteDias)),
    contar(supabase, 'diagnostics', (q) => q.in('state', ['computed', 'pending_review'])),
    contar(supabase, 'diagnostics', (q) => q.eq('state', 'approved')),
    contar(supabase, 'outbox_events', (q) => q.in('status', ['pending', 'failed'])),
    contar(supabase, 'outbox_events', (q) => q.eq('status', 'dead')),
    supabase
      .from('responses')
      .select('id, submitted_at, contacts(name, email), diagnostics(id, state, score, tier)')
      .order('submitted_at', { ascending: false })
      .limit(10),
  ]);

  const linhas = (recentes.data ?? []) as unknown as LinhaRecente[];

  const cartoes = [
    { titulo: 'Submissões (7 dias)', valor: novos, href: '/admin/contactos' },
    { titulo: 'Por rever', valor: porRever, href: '/admin/diagnosticos?estado=pending_review' },
    { titulo: 'Aprovados', valor: aprovados, href: '/admin/diagnosticos?estado=approved' },
    { titulo: 'Na fila', valor: fila, href: '/admin/fila' },
    { titulo: 'Sem saída', valor: mortos, href: '/admin/fila?estado=dead' },
  ];

  return (
    <>
      <AdminHeading
        titulo="Painel"
        descricao="O que chegou, o que espera decisão e o que está parado."
      />

      <ul className="grid grid-cols-2 gap-px border border-[color:var(--border)] bg-[color:var(--border)] lg:grid-cols-5">
        {cartoes.map((c) => (
          <li key={c.titulo} className="bg-[color:var(--surface)]">
            <Link
              href={c.href}
              className="block min-h-11 px-4 py-5 hover:bg-[color:var(--surface-raised)]"
            >
              <span className="block font-[family-name:var(--font-chakra)] text-[length:var(--text-micro)] tracking-[var(--tracking-eyebrow)] text-[color:var(--muted)] uppercase">
                {c.titulo}
              </span>
              <span className="mt-2 block font-[family-name:var(--font-chakra)] text-[length:var(--text-numeral)] tabular-nums">
                {c.valor}
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <h2 className="mt-12 mb-4 text-[length:var(--text-h3)] tracking-[-0.02em]">
        Últimas submissões
      </h2>

      <DataTable
        legenda="As dez submissões mais recentes"
        linhas={linhas}
        chaveDe={(l) => l.id}
        vazio={
          <EmptyState
            titulo="Ainda não chegou nenhuma submissão."
            descricao="Assim que alguém completar o diagnóstico no site, aparece aqui."
          />
        }
        colunas={[
          {
            chave: 'quando',
            cabecalho: 'Quando',
            render: (l) => <DataHora valor={l.submitted_at} />,
          },
          {
            chave: 'quem',
            cabecalho: 'Quem',
            render: (l) => (
              <>
                <span className="block">{l.contacts?.name ?? '—'}</span>
                <span className="block text-xs text-[color:var(--muted)]">
                  {l.contacts?.email ?? ''}
                </span>
              </>
            ),
          },
          {
            chave: 'estado',
            cabecalho: 'Estado',
            render: (l) => {
              const d = l.diagnostics?.[0];
              return d ? (
                <StateBadge
                  rotulo={ESTADO_DIAGNOSTICO[d.state as keyof typeof ESTADO_DIAGNOSTICO]}
                />
              ) : (
                '—'
              );
            },
          },
          {
            chave: 'classificacao',
            cabecalho: 'Classificação',
            render: (l) => {
              const d = l.diagnostics?.[0];
              return d ? (
                <span title={CLASSIFICACAO[d.tier]}>
                  {d.tier} · {d.score}
                </span>
              ) : (
                '—'
              );
            },
          },
          {
            chave: 'accao',
            cabecalho: '',
            render: (l) => {
              const d = l.diagnostics?.[0];
              return d ? (
                <Link href={`/admin/diagnosticos/${d.id}`} className="text-sm underline">
                  Abrir
                </Link>
              ) : null;
            },
          },
        ]}
      />
    </>
  );
}
