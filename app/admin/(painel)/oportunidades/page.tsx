import Link from 'next/link';
import {
  AdminHeading,
  DataHora,
  DataTable,
  EmptyState,
  Pagination,
  StateBadge,
} from '@/components/admin/primitives';
import { CLASSIFICACAO, FASES_OPORTUNIDADE, FASE_OPORTUNIDADE } from '@/lib/admin/labels';
import { fatiar, intervalo } from '@/lib/admin/paginacao';
import { createSessionClient } from '@/lib/auth/client';

export const metadata = { title: 'Oportunidades' };

interface Linha {
  id: string;
  stage: string;
  tier: string | null;
  score: number | null;
  created_at: string;
  contacts: { id: string; name: string } | null;
  organisations: { id: string; name: string } | null;
}

export default async function OportunidadesPage({
  searchParams,
}: {
  searchParams: Promise<{ fase?: string; pagina?: string }>;
}) {
  const { fase, pagina: paginaBruta } = await searchParams;
  const { pagina, de, ate } = intervalo(paginaBruta);
  const filtro = FASES_OPORTUNIDADE.includes(fase as never) ? fase : undefined;

  const supabase = await createSessionClient();
  let consulta = supabase
    .from('deals')
    .select('id, stage, tier, score, created_at, contacts(id, name), organisations(id, name)')
    .order('created_at', { ascending: false })
    .range(de, ate);

  if (filtro) consulta = consulta.eq('stage', filtro);

  const { data } = await consulta;
  const { linhas, haMais } = fatiar(data as unknown as Linha[] | null);

  return (
    <>
      <AdminHeading
        titulo="Oportunidades"
        descricao="Uma por submissão que a política do questionário determina. Uma repetição da mesma resposta não cria uma segunda."
      />

      <form method="get" className="mb-6 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1">
          <span className="font-[family-name:var(--font-chakra)] text-[length:var(--text-micro)] tracking-[var(--tracking-eyebrow)] text-[color:var(--muted)] uppercase">
            Fase
          </span>
          <select
            name="fase"
            defaultValue={filtro ?? ''}
            className="min-h-11 rounded-[--radius-sm] border border-[color:var(--border)] bg-[color:var(--surface)] px-3"
          >
            <option value="">Todas</option>
            {FASES_OPORTUNIDADE.map((f) => (
              <option key={f} value={f}>
                {FASE_OPORTUNIDADE[f].texto}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="min-h-11 border border-[color:var(--border)] px-4 text-sm">
          Filtrar
        </button>
        {filtro ? (
          <Link href="/admin/oportunidades" className="min-h-11 py-3 text-sm underline">
            Limpar
          </Link>
        ) : null}
      </form>

      <DataTable
        legenda="Oportunidades, da mais recente para a mais antiga"
        linhas={linhas}
        chaveDe={(l) => l.id}
        vazio={<EmptyState titulo="Ainda não há oportunidades." />}
        colunas={[
          {
            chave: 'contacto',
            cabecalho: 'Contacto',
            render: (l) => (
              <Link href={`/admin/oportunidades/${l.id}`} className="underline">
                {l.contacts?.name ?? 'Sem nome'}
              </Link>
            ),
          },
          {
            chave: 'org',
            cabecalho: 'Organização',
            render: (l) =>
              l.organisations?.name ?? <span className="text-[color:var(--muted)]">—</span>,
          },
          {
            chave: 'fase',
            cabecalho: 'Fase',
            render: (l) => (
              <StateBadge rotulo={FASE_OPORTUNIDADE[l.stage as keyof typeof FASE_OPORTUNIDADE]} />
            ),
          },
          {
            chave: 'classificacao',
            cabecalho: 'Classificação',
            render: (l) => (l.tier ? <span title={CLASSIFICACAO[l.tier]}>{l.tier}</span> : '—'),
          },
          {
            chave: 'pontuacao',
            cabecalho: 'Pontuação',
            numerico: true,
            render: (l) => l.score ?? '—',
          },
          {
            chave: 'criada',
            cabecalho: 'Criada',
            render: (l) => <DataHora valor={l.created_at} />,
          },
        ]}
      />

      <Pagination
        base="/admin/oportunidades"
        pagina={pagina}
        haMais={haMais}
        parametros={{ fase: filtro }}
      />
    </>
  );
}
