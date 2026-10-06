import Link from 'next/link';
import { EnergiaNav } from '@/components/admin/energia/partes';
import { AdminHeading, DataTable, EmptyState } from '@/components/admin/primitives';
import { inputClass } from '@/components/form/Field';
import { buttonVariants } from '@/components/ui/Button';
import { requireModulo } from '@/lib/auth/modulos';
import { createSessionClient } from '@/lib/auth/client';
import { COLUNAS_STAKEHOLDER, dataCurta, stakeholderDe, type Stakeholder } from '@/lib/energia/leitura';
import { RELACOES, TIPOS_STAKEHOLDER } from '@/lib/energia/modelo';

export const metadata = { title: 'Stakeholders — Espaço CEnO' };

/** Caracteres com significado nos filtros do PostgREST: retirados da pesquisa. */
const RESERVADOS = /[%_,().*\\"]/g;

export default async function StakeholdersCenoPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[]; tipo?: string | string[]; inactivos?: string | string[] }>;
}) {
  await requireModulo('energia');
  const p = await searchParams;
  // `?q=a&q=b` chega como lista: fica o primeiro.
  const um = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? '';
  const q = um(p.q).replace(RESERVADOS, ' ').trim().slice(0, 80);
  const tipoPedido = um(p.tipo);
  const tipo = tipoPedido && Object.hasOwn(TIPOS_STAKEHOLDER, tipoPedido) ? tipoPedido : undefined;
  const inactivos = um(p.inactivos) === '1';

  const supabase = await createSessionClient();
  let consulta = supabase.from('ceno_stakeholders').select(COLUNAS_STAKEHOLDER).order('organizacao').limit(300);
  if (!inactivos) consulta = consulta.eq('activo', true);
  if (tipo) consulta = consulta.eq('tipo', tipo);
  if (q) consulta = consulta.or(`organizacao.ilike.%${q}%,pessoa.ilike.%${q}%`);
  const { data, error } = await consulta;
  const linhas = (data ?? []).map((r) => stakeholderDe(r as unknown as Record<string, unknown>));

  return (
    <>
      <AdminHeading
        titulo="Stakeholders"
        descricao="A base única de relacionamento: empresas, promotores, investidores, bancos, reguladores e decisores. Nenhum contacto activo sem próxima acção."
        accao={
          <Link href="/admin/energia/stakeholders/novo" className={buttonVariants({ size: 'sm' })}>
            Novo stakeholder
          </Link>
        }
      />
      <EnergiaNav activo="stakeholders" />

      <form method="get" className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto_auto] lg:items-end">
        <div className="grid gap-2">
          <label htmlFor="f-q" className="text-sm font-medium">
            Pesquisar
          </label>
          <input id="f-q" name="q" type="search" defaultValue={q} maxLength={80} className={inputClass} />
        </div>
        <div className="grid gap-2">
          <label htmlFor="f-tipo" className="text-sm font-medium">
            Tipo
          </label>
          <select id="f-tipo" name="tipo" defaultValue={tipo ?? ''} className={inputClass}>
            <option value="">Todos</option>
            {Object.entries(TIPOS_STAKEHOLDER).map(([v, t]) => (
              <option key={v} value={v}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <label className="flex min-h-11 items-center gap-3 text-sm">
          <input type="checkbox" name="inactivos" value="1" defaultChecked={inactivos} className="size-5" />
          Incluir inactivos
        </label>
        <button type="submit" className={buttonVariants({ size: 'sm', variant: 'outline' })}>
          Filtrar
        </button>
      </form>

      {error ? (
        <p role="alert" className="border border-[color:var(--color-signal-600)] px-4 py-3 text-sm text-[color:var(--color-signal-700)]">
          Não foi possível ler os stakeholders agora.
        </p>
      ) : (
        <DataTable<Stakeholder>
          legenda="Stakeholders do Espaço CEnO"
          linhas={linhas}
          chaveDe={(s) => s.id}
          vazio={
            <EmptyState
              titulo={q || tipo ? 'Nenhum stakeholder com estes filtros' : 'Ainda sem stakeholders'}
              descricao="Registe cada empresa, investidor ou decisor uma única vez e ligue-o às oportunidades."
            />
          }
          colunas={[
            {
              chave: 'organizacao',
              cabecalho: 'Organização',
              render: (s) => (
                <span className="grid gap-1">
                  <Link href={`/admin/energia/stakeholders/${s.id}`} className="font-medium underline">
                    {s.organizacao}
                  </Link>
                  <span className="text-xs text-[color:var(--muted)]">
                    {[s.pessoa, s.cargo].filter(Boolean).join(' · ') || '—'}
                  </span>
                </span>
              ),
            },
            { chave: 'tipo', cabecalho: 'Tipo', render: (s) => TIPOS_STAKEHOLDER[s.tipo as keyof typeof TIPOS_STAKEHOLDER] ?? s.tipo },
            {
              chave: 'poder',
              cabecalho: 'Decisão',
              render: (s) => (s.poder_decisao === null ? <span className="text-[color:var(--muted)]">—</span> : `${s.poder_decisao} de 5`),
            },
            { chave: 'relacao', cabecalho: 'Relação', render: (s) => RELACOES[s.relacao as keyof typeof RELACOES] ?? s.relacao },
            {
              chave: 'accao',
              cabecalho: 'Próxima acção',
              render: (s) => (
                <span className="grid gap-1">
                  <span>{s.proxima_accao ?? '—'}</span>
                  <span className="text-xs text-[color:var(--muted)]">{dataCurta(s.proxima_data)}</span>
                </span>
              ),
            },
          ]}
        />
      )}
    </>
  );
}
