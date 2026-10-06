import Link from 'next/link';
import { EnergiaNav } from '@/components/admin/energia/partes';
import { AdminHeading, DataTable, EmptyState, StateBadge } from '@/components/admin/primitives';
import { inputClass } from '@/components/form/Field';
import { buttonVariants } from '@/components/ui/Button';
import { requireModulo } from '@/lib/auth/modulos';
import { createSessionClient } from '@/lib/auth/client';
import { COLUNAS_OPORTUNIDADE, dataCurta, oportunidadeDe, type Oportunidade } from '@/lib/energia/leitura';
import {
  ALERTA,
  alertasDe,
  FASES,
  PRIORIDADE,
  SECTORES,
  textoFase,
  TODAS_AS_FASES,
  type Prioridade,
} from '@/lib/energia/modelo';

export const metadata = { title: 'Oportunidades — Espaço CEnO' };

const PRIORIDADES: readonly Prioridade[] = ['A', 'B', 'incubacao', 'abandonar'];

export default async function OportunidadesCenoPage({
  searchParams,
}: {
  searchParams: Promise<{ fase?: string; prioridade?: string; sector?: string; vista?: string }>;
}) {
  await requireModulo('energia');
  const p = await searchParams;
  const fase = TODAS_AS_FASES.includes(p.fase as never) ? p.fase : undefined;
  const prioridade = PRIORIDADES.includes(p.prioridade as Prioridade) ? p.prioridade : undefined;
  const sector = p.sector && p.sector in SECTORES ? p.sector : undefined;
  const todas = p.vista === 'todas';

  const supabase = await createSessionClient();
  let consulta = supabase.from('ceno_oportunidades').select(COLUNAS_OPORTUNIDADE).order('proxima_data', { ascending: true, nullsFirst: false }).limit(300);
  if (fase) consulta = consulta.eq('fase', fase);
  else if (!todas) consulta = consulta.not('fase', 'in', '(perdida,arquivada)');
  if (prioridade) consulta = consulta.eq('prioridade', prioridade);
  if (sector) consulta = consulta.eq('sector', sector);
  const { data, error } = await consulta;
  const ops = (data ?? []).map((r) => oportunidadeDe(r as unknown as Record<string, unknown>));
  const agora = new Date();

  return (
    <>
      <AdminHeading
        titulo="Oportunidades"
        descricao="O radar (etapa 0) e o pipeline (1–11) numa só lista. Nenhuma oportunidade activa sem responsável, próxima acção e data."
        accao={
          <Link href="/admin/energia/oportunidades/nova" className={buttonVariants({ size: 'sm' })}>
            Nova oportunidade
          </Link>
        }
      />
      <EnergiaNav activo="oportunidades" />

      <form method="get" className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto] lg:items-end">
        <div className="grid gap-2">
          <label htmlFor="f-fase" className="text-sm font-medium">
            Etapa
          </label>
          <select id="f-fase" name="fase" defaultValue={fase ?? ''} className={inputClass}>
            <option value="">Activas</option>
            {FASES.map((f) => (
              <option key={f.chave} value={f.chave}>
                {f.ordem}. {f.texto}
              </option>
            ))}
            <option value="perdida">Perdidas</option>
            <option value="arquivada">Arquivadas</option>
          </select>
        </div>
        <div className="grid gap-2">
          <label htmlFor="f-prioridade" className="text-sm font-medium">
            Prioridade
          </label>
          <select id="f-prioridade" name="prioridade" defaultValue={prioridade ?? ''} className={inputClass}>
            <option value="">Todas</option>
            {PRIORIDADES.map((x) => (
              <option key={x} value={x}>
                {PRIORIDADE[x].texto}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-2">
          <label htmlFor="f-sector" className="text-sm font-medium">
            Sector
          </label>
          <select id="f-sector" name="sector" defaultValue={sector ?? ''} className={inputClass}>
            <option value="">Todos</option>
            {Object.entries(SECTORES).map(([v, t]) => (
              <option key={v} value={v}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className={buttonVariants({ size: 'sm', variant: 'outline' })}>
          Filtrar
        </button>
      </form>

      {error ? (
        <p role="alert" className="border border-[color:var(--color-signal-600)] px-4 py-3 text-sm text-[color:var(--color-signal-700)]">
          Não foi possível ler as oportunidades agora.
        </p>
      ) : (
        <DataTable<Oportunidade>
          legenda="Oportunidades do Espaço CEnO"
          linhas={ops}
          chaveDe={(o) => o.id}
          vazio={
            <EmptyState
              titulo={fase || prioridade || sector ? 'Nenhuma oportunidade com estes filtros' : 'Ainda sem oportunidades'}
              descricao="Registe cada sinal de mercado como oportunidade na etapa 0 — o radar e o pipeline são a mesma lista."
            />
          }
          colunas={[
            {
              chave: 'titulo',
              cabecalho: 'Oportunidade',
              render: (o) => (
                <span className="grid gap-1">
                  <Link href={`/admin/energia/oportunidades/${o.id}`} className="font-medium underline">
                    {o.titulo}
                  </Link>
                  <span className="text-xs text-[color:var(--muted)]">
                    {[o.organizacao, SECTORES[o.sector as keyof typeof SECTORES]].filter(Boolean).join(' · ')}
                  </span>
                </span>
              ),
            },
            { chave: 'fase', cabecalho: 'Etapa', render: (o) => textoFase(o.fase) },
            {
              chave: 'prioridade',
              cabecalho: 'Prioridade',
              render: (o) =>
                o.prioridade ? (
                  <span className="flex items-center gap-2">
                    <StateBadge rotulo={PRIORIDADE[o.prioridade]} />
                    <span className="tabular-nums text-[color:var(--muted)]">{o.score_total}</span>
                  </span>
                ) : (
                  <span className="text-[color:var(--muted)]">Por avaliar</span>
                ),
            },
            {
              chave: 'accao',
              cabecalho: 'Próxima acção',
              render: (o) => (
                <span className="grid gap-1">
                  <span>{o.proxima_accao ?? '—'}</span>
                  <span className="text-xs text-[color:var(--muted)]">
                    {dataCurta(o.proxima_data)}
                    {o.responsavel ? ` · ${o.responsavel}` : ''}
                  </span>
                </span>
              ),
            },
            {
              chave: 'alertas',
              cabecalho: 'Alertas',
              render: (o) => {
                const a = alertasDe(o, agora);
                return a.length === 0 ? (
                  <span className="text-[color:var(--muted)]">—</span>
                ) : (
                  <span className="flex flex-wrap gap-1">
                    {a.map((x) => (
                      <StateBadge key={x} rotulo={ALERTA[x]} />
                    ))}
                  </span>
                );
              },
            },
          ]}
        />
      )}
      {!fase && (
        <p className="mt-4 text-sm">
          {todas ? (
            <Link href="/admin/energia/oportunidades" className="underline">
              Mostrar só as activas
            </Link>
          ) : (
            <Link href="/admin/energia/oportunidades?vista=todas" className="underline">
              Mostrar também perdidas e arquivadas
            </Link>
          )}
        </p>
      )}
    </>
  );
}
