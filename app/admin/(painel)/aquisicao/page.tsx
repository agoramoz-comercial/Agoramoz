import Link from 'next/link';
import { AdminHeading, DataTable, EmptyState, StateBadge } from '@/components/admin/primitives';
import { CANAL } from '@/lib/admin/labels';
import type { Canal } from '@/lib/attribution/types';
import { createSessionClient } from '@/lib/auth/client';

export const metadata = { title: 'Aquisição' };

/**
 * O funil por canal: perfil → website → diagnóstico → oportunidade → ganho.
 *
 * É a resposta à única pergunta que decide onde se gasta esforço comercial:
 * que canal traz negócios, e não apenas visitas. Um canal com muitas visitas e
 * zero ganhos custa dinheiro; um com poucas visitas e ganhos consistentes é
 * onde se investe a seguir.
 */

const MESES_POR_OMISSAO = 6;

interface Linha {
  canal: string;
  vistas: number;
  iniciados: number;
  submissoes: number;
  oportunidades: number;
  ganhos: number;
}

function agregarPorCanal(linhas: readonly (Linha & { mes: string })[]): Linha[] {
  const por = new Map<string, Linha>();
  for (const l of linhas) {
    const actual = por.get(l.canal) ?? {
      canal: l.canal,
      vistas: 0,
      iniciados: 0,
      submissoes: 0,
      oportunidades: 0,
      ganhos: 0,
    };
    actual.vistas += Number(l.vistas);
    actual.iniciados += Number(l.iniciados);
    actual.submissoes += Number(l.submissoes);
    actual.oportunidades += Number(l.oportunidades);
    actual.ganhos += Number(l.ganhos);
    por.set(l.canal, actual);
  }
  return [...por.values()].sort((a, b) => b.submissoes - a.submissoes || b.vistas - a.vistas);
}

export default async function AquisicaoPage({
  searchParams,
}: {
  searchParams: Promise<{ meses?: string }>;
}) {
  const { meses: mesesBruto } = await searchParams;
  const meses = Math.min(Math.max(Number(mesesBruto) || MESES_POR_OMISSAO, 1), 36);

  const desde = new Date();
  desde.setMonth(desde.getMonth() - (meses - 1));
  desde.setDate(1);

  const supabase = await createSessionClient();
  const { data } = await supabase
    .from('funil_aquisicao')
    .select('canal, mes, vistas, iniciados, submissoes, oportunidades, ganhos')
    .gte('mes', desde.toISOString().slice(0, 10));

  const linhas = agregarPorCanal((data ?? []) as unknown as (Linha & { mes: string })[]);

  const total = linhas.reduce<Linha>(
    (acc, l) => ({
      canal: 'Total',
      vistas: acc.vistas + l.vistas,
      iniciados: acc.iniciados + l.iniciados,
      submissoes: acc.submissoes + l.submissoes,
      oportunidades: acc.oportunidades + l.oportunidades,
      ganhos: acc.ganhos + l.ganhos,
    }),
    { canal: 'Total', vistas: 0, iniciados: 0, submissoes: 0, oportunidades: 0, ganhos: 0 },
  );

  return (
    <>
      <AdminHeading
        titulo="Aquisição"
        descricao={`Do canal ao negócio fechado, nos últimos ${meses} meses.`}
      />

      <form method="get" className="mb-6 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1">
          <span className="font-[family-name:var(--font-chakra)] text-[length:var(--text-micro)] tracking-[var(--tracking-eyebrow)] text-[color:var(--muted)] uppercase">
            Período
          </span>
          <select
            name="meses"
            defaultValue={String(meses)}
            className="min-h-11 rounded-[--radius-sm] border border-[color:var(--border)] bg-[color:var(--surface)] px-3"
          >
            {[3, 6, 12, 24].map((m) => (
              <option key={m} value={m}>
                {m} meses
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="min-h-11 border border-[color:var(--border)] px-4 text-sm">
          Ver
        </button>
      </form>

      <DataTable
        legenda="Funil por canal de aquisição"
        linhas={linhas.length > 0 ? [...linhas, total] : []}
        chaveDe={(l) => l.canal}
        vazio={
          <EmptyState
            titulo="Ainda não há dados de aquisição."
            descricao="Aparecem aqui assim que a primeira visita com origem conhecida chegar ao formulário."
          />
        }
        colunas={[
          {
            chave: 'canal',
            cabecalho: 'Canal',
            render: (l) =>
              l.canal === 'Total' ? (
                <strong>Total</strong>
              ) : (
                <Link href={`/admin/oportunidades?canal=${l.canal}`} className="underline">
                  <StateBadge rotulo={CANAL[l.canal as Canal]} />
                </Link>
              ),
          },
          { chave: 'vistas', cabecalho: 'Vistas do perfil', numerico: true, render: (l) => l.vistas },
          { chave: 'iniciados', cabecalho: 'Diagnósticos iniciados', numerico: true, render: (l) => l.iniciados },
          { chave: 'submissoes', cabecalho: 'Submissões', numerico: true, render: (l) => l.submissoes },
          { chave: 'oportunidades', cabecalho: 'Oportunidades', numerico: true, render: (l) => l.oportunidades },
          { chave: 'ganhos', cabecalho: 'Ganhos', numerico: true, render: (l) => l.ganhos },
        ]}
      />

      <p className="mt-6 max-w-[48rem] text-sm text-[color:var(--muted)]">
        As três últimas colunas vêm da base de dados e são exactas. As duas primeiras dependem de
        JavaScript no browser de quem visita, e por isso ficam subcontadas — um visitante com
        bloqueador ou sem JavaScript submete o formulário e aparece em «Submissões», mas nunca em
        «Vistas». A diferença entre as colunas é informação, não erro: mede a parte do tráfego que
        não se deixa medir.
      </p>
    </>
  );
}
