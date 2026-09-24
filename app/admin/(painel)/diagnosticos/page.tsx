import Link from 'next/link';
import {
  AdminHeading,
  DataHora,
  DataTable,
  EmptyState,
  Pagination,
  StateBadge,
} from '@/components/admin/primitives';
import { DIAGNOSTIC_STATES } from '@/lib/diagnostic/types';
import { CLASSIFICACAO, ESTADO_DIAGNOSTICO } from '@/lib/admin/labels';
import { fatiar, intervalo } from '@/lib/admin/paginacao';
import { createSessionClient } from '@/lib/auth/client';

export const metadata = { title: 'Diagnósticos' };

interface Linha {
  id: string;
  state: string;
  score: number;
  tier: string;
  created_at: string;
  responses: { contacts: { name: string; email: string } | null } | null;
}

export default async function DiagnosticosPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string; pagina?: string }>;
}) {
  const { estado, pagina: paginaBruta } = await searchParams;
  const { pagina, de, ate } = intervalo(paginaBruta);

  // Só um valor do enum passa. Um parâmetro de URL é entrada não confiável, e
  // isto evita mandar texto arbitrário para o filtro.
  const filtro = DIAGNOSTIC_STATES.includes(estado as never) ? estado : undefined;

  const supabase = await createSessionClient();
  let consulta = supabase
    .from('diagnostics')
    .select('id, state, score, tier, created_at, responses(contacts(name, email))')
    .order('created_at', { ascending: false })
    .range(de, ate);

  if (filtro) consulta = consulta.eq('state', filtro);

  const { data } = await consulta;
  const { linhas, haMais } = fatiar(data as unknown as Linha[] | null);

  return (
    <>
      <AdminHeading
        titulo="Diagnósticos"
        descricao="Cada submissão produz um diagnóstico. Nenhum segue sem decisão humana."
      />

      {/* Filtro como formulário GET: o estado da vista vive no URL, o que a
          torna partilhável e dispensa JavaScript. */}
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
            {DIAGNOSTIC_STATES.map((e) => (
              <option key={e} value={e}>
                {ESTADO_DIAGNOSTICO[e].texto}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="min-h-11 border border-[color:var(--border)] px-4 text-sm">
          Filtrar
        </button>
        {filtro ? (
          <Link href="/admin/diagnosticos" className="min-h-11 py-3 text-sm underline">
            Limpar
          </Link>
        ) : null}
      </form>

      <DataTable
        legenda="Diagnósticos, do mais recente para o mais antigo"
        linhas={linhas}
        chaveDe={(l) => l.id}
        vazio={
          <EmptyState
            titulo={filtro ? 'Nenhum diagnóstico neste estado.' : 'Ainda não há diagnósticos.'}
          />
        }
        colunas={[
          {
            chave: 'quando',
            cabecalho: 'Criado',
            render: (l) => <DataHora valor={l.created_at} />,
          },
          {
            chave: 'quem',
            cabecalho: 'Contacto',
            render: (l) => (
              <>
                <span className="block">{l.responses?.contacts?.name ?? '—'}</span>
                <span className="block text-xs text-[color:var(--muted)]">
                  {l.responses?.contacts?.email ?? ''}
                </span>
              </>
            ),
          },
          {
            chave: 'estado',
            cabecalho: 'Estado',
            render: (l) => (
              <StateBadge rotulo={ESTADO_DIAGNOSTICO[l.state as keyof typeof ESTADO_DIAGNOSTICO]} />
            ),
          },
          {
            chave: 'classificacao',
            cabecalho: 'Classificação',
            render: (l) => <span title={CLASSIFICACAO[l.tier]}>{l.tier}</span>,
          },
          { chave: 'pontuacao', cabecalho: 'Pontuação', numerico: true, render: (l) => l.score },
          {
            chave: 'accao',
            cabecalho: '',
            render: (l) => (
              <Link href={`/admin/diagnosticos/${l.id}`} className="text-sm underline">
                Rever
              </Link>
            ),
          },
        ]}
      />

      <Pagination
        base="/admin/diagnosticos"
        pagina={pagina}
        haMais={haMais}
        parametros={{ estado: filtro }}
      />
    </>
  );
}
