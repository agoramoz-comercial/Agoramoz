import {
  AdminHeading,
  DataHora,
  DataTable,
  EmptyState,
  StateBadge,
} from '@/components/admin/primitives';
import type { Rotulo } from '@/lib/admin/labels';
import { createSessionClient } from '@/lib/auth/client';

export const metadata = { title: 'Fila' };

const ESTADO_EVENTO: Record<string, Rotulo> = {
  pending: { texto: 'Por processar', tom: 'espera' },
  processing: { texto: 'A processar', tom: 'espera' },
  done: { texto: 'Concluído', tom: 'bom' },
  failed: { texto: 'Falhou, vai repetir', tom: 'aviso' },
  dead: { texto: 'Sem saída', tom: 'mau' },
};

interface Evento {
  id: string;
  topic: string;
  status: string;
  attempts: number;
  max_attempts: number;
  available_at: string;
  created_at: string;
  last_error_code: string | null;
}

export default async function FilaPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string }>;
}) {
  const { estado } = await searchParams;
  const filtro = estado && estado in ESTADO_EVENTO ? estado : undefined;

  const supabase = await createSessionClient();
  let consulta = supabase
    .from('outbox_events')
    .select('id, topic, status, attempts, max_attempts, available_at, created_at, last_error_code')
    .order('created_at', { ascending: false })
    .limit(50);

  if (filtro) consulta = consulta.eq('status', filtro);

  const [eventos, cartas] = await Promise.all([
    consulta,
    supabase
      .from('dead_letters')
      .select('id, reason, created_at, resolved_at')
      .is('resolved_at', null)
      .order('created_at', { ascending: false })
      .limit(20),
  ]);

  const linhas = (eventos.data ?? []) as unknown as Evento[];

  return (
    <>
      <AdminHeading
        titulo="Fila"
        descricao="A intenção de processar cada submissão é gravada na mesma transação que o lead. Se o consumidor estiver em baixo, os eventos acumulam-se aqui em vez de se perderem — e nada nesta lista está perdido enquanto não estiver «sem saída»."
      />

      <form method="get" className="mb-6 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1">
          <span className="font-[family-name:var(--font-chakra)] text-[length:var(--text-micro)] tracking-[var(--tracking-eyebrow)] text-[color:var(--muted)] uppercase">
            Estado
          </span>
          <select
            name="estado"
            defaultValue={filtro ?? ''}
            className="min-h-11 rounded-[--radius-sm] border border-[color:var(--border)] bg-[color:var(--surface)] px-3"
          >
            <option value="">Todos</option>
            {Object.entries(ESTADO_EVENTO).map(([v, r]) => (
              <option key={v} value={v}>
                {r.texto}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="min-h-11 border border-[color:var(--border)] px-4 text-sm">
          Filtrar
        </button>
      </form>

      <DataTable
        legenda="Eventos da fila, dos mais recentes para os mais antigos"
        linhas={linhas}
        chaveDe={(l) => l.id}
        vazio={<EmptyState titulo="A fila está vazia." />}
        colunas={[
          { chave: 'topico', cabecalho: 'Tópico', render: (l) => l.topic },
          {
            chave: 'estado',
            cabecalho: 'Estado',
            render: (l) => <StateBadge rotulo={ESTADO_EVENTO[l.status]} />,
          },
          {
            chave: 'tentativas',
            cabecalho: 'Tentativas',
            numerico: true,
            render: (l) => `${l.attempts}/${l.max_attempts}`,
          },
          {
            chave: 'proxima',
            cabecalho: 'Elegível a partir de',
            render: (l) => <DataHora valor={l.available_at} />,
          },
          {
            chave: 'erro',
            cabecalho: 'Último erro',
            render: (l) =>
              l.last_error_code ?? <span className="text-[color:var(--muted)]">—</span>,
          },
          {
            chave: 'criado',
            cabecalho: 'Criado',
            render: (l) => <DataHora valor={l.created_at} />,
          },
        ]}
      />

      <h2 className="mt-12 mb-4 text-[length:var(--text-h3)] tracking-[-0.02em]">Por resolver</h2>
      {(cartas.data ?? []).length === 0 ? (
        <EmptyState titulo="Nada ficou por resolver." />
      ) : (
        <ul className="flex flex-col gap-2">
          {(cartas.data ?? []).map((c) => (
            <li
              key={c.id as string}
              className="border border-[color:var(--color-signal-700)] px-4 py-3 text-sm"
            >
              <DataHora valor={c.created_at as string} />
              <p className="mt-1">{c.reason as string}</p>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
