import Link from 'next/link';
import { FiltrosPilula } from '@/components/admin/FiltrosPilula';
import { MemoriaLista } from '@/components/admin/MemoriaLista';
import {
  AdminHeading,
  DataHora,
  DataTable,
  EmptyState,
  Pagination,
  StateBadge,
} from '@/components/admin/primitives';
import { DIAGNOSTIC_STATES } from '@/lib/diagnostic/types';
import { CLASSIFICACAO, ESTADO_DIAGNOSTICO, ESTADOS_POR_REVER, POR_REVER } from '@/lib/admin/labels';
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
  // «por-rever» é a fila de decisão: calculados e já enviados para revisão.
  // É o mesmo critério que o painel conta em «Por rever», para o número e a
  // lista nunca divergirem.
  const porRever = estado === POR_REVER;
  const filtro = porRever ? POR_REVER : DIAGNOSTIC_STATES.includes(estado as never) ? estado : undefined;

  const supabase = await createSessionClient();
  let consulta = supabase
    .from('diagnostics')
    .select('id, state, score, tier, created_at, responses(contacts(name, email))')
    .order('created_at', { ascending: false })
    .range(de, ate);

  if (porRever) consulta = consulta.in('state', [...ESTADOS_POR_REVER]);
  else if (filtro) consulta = consulta.eq('state', filtro);

  // LIST-PIL-01: as contagens das pílulas, contadas na base (cabeça, sem linhas).
  const contar = async (f?: (q: ReturnType<typeof base>) => ReturnType<typeof base>) => {
    const { count, error } = await (f ? f(base()) : base());
    return error ? null : (count ?? 0);
  };
  const base = () => supabase.from('diagnostics').select('id', { count: 'exact', head: true });
  const [{ data }, todos, porReverN, ...porEstado] = await Promise.all([
    consulta,
    contar(),
    contar((q) => q.in('state', [...ESTADOS_POR_REVER])),
    ...DIAGNOSTIC_STATES.map((e) => contar((q) => q.eq('state', e))),
  ]);
  const contagens = {
    todos,
    porRever: porReverN,
    estados: Object.fromEntries(DIAGNOSTIC_STATES.map((e, i) => [e, porEstado[i] ?? null])) as Record<string, number | null>,
  };
  const { linhas, haMais } = fatiar(data as unknown as Linha[] | null);

  return (
    <>
      <MemoriaLista chave="diagnosticos" />
      <AdminHeading
        titulo="Diagnósticos"
        descricao="Cada submissão produz um diagnóstico. Nenhum segue sem decisão humana."
      />

      <FiltrosPilula
        rotulo="Filtrar por estado"
        itens={[
          { rotulo: 'Todos', href: '/admin/diagnosticos', contagem: contagens.todos, activa: !filtro },
          {
            rotulo: 'Por rever',
            href: `/admin/diagnosticos?estado=${POR_REVER}`,
            contagem: contagens.porRever,
            activa: filtro === POR_REVER,
          },
          ...DIAGNOSTIC_STATES.filter((e) => e === filtro || (contagens.estados[e] ?? 0) > 0).map((e) => ({
            rotulo: ESTADO_DIAGNOSTICO[e].texto,
            href: `/admin/diagnosticos?estado=${e}`,
            contagem: contagens.estados[e] ?? null,
            activa: filtro === e,
          })),
        ]}
      />

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
