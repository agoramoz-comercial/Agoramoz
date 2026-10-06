import Link from 'next/link';
import { AdminHeading, EmptyState, StateBadge } from '@/components/admin/primitives';
import { BarrasHorizontais, Bloco } from '@/components/admin/painel/Blocos';
import { buttonVariants } from '@/components/ui/Button';
import { dataCurta, type Oportunidade } from '@/lib/energia/leitura';
import {
  ALERTA,
  alertasDe,
  estaActiva,
  FASES,
  formatarValor,
  kpiPrincipal,
  percentagem,
  PRIORIDADE,
  scorecard,
  SCORE_MINIMO,
  textoFase,
  type MudancaFase,
} from '@/lib/energia/modelo';
import { EnergiaNav, Kpi } from './partes';

/**
 * O painel do Espaço CEnO: o scorecard do documento, os alertas que pedem
 * decisão e as próximas acções. Recebe os dados — não os vai buscar — para
 * que a pré-visualização de QA mostre exactamente o mesmo ecrã.
 */
export function PainelEnergia({
  ops,
  comDecisor,
  mudancas,
  agora,
}: {
  ops: readonly Oportunidade[];
  comDecisor: readonly string[];
  mudancas: readonly MudancaFase[];
  agora: string;
}) {
  const instante = new Date(agora);
  const decisores = new Set(comDecisor);
  const sc = scorecard(ops, decisores, mudancas, instante);
  const principal = kpiPrincipal(ops, decisores);
  const todasComAlertas = ops
    .map((o) => ({ o, alertas: alertasDe(o, instante) }))
    .filter((x) => x.alertas.length > 0);
  const comAlertas = todasComAlertas.slice(0, 12);
  const alertasForaDaLista = todasComAlertas.length - comAlertas.length;
  const proximas = ops
    .filter((o) => estaActiva(o.fase) && o.proxima_data)
    .sort((a, b) => (a.proxima_data ?? '').localeCompare(b.proxima_data ?? ''))
    .slice(0, 8);
  const porEtapa = FASES.map((f) => ({
    chave: f.chave,
    rotulo: `${f.ordem}. ${f.texto}`,
    valor: ops.filter((o) => o.fase === f.chave).length,
  }));
  const ponderado = Object.entries(sc.pipelinePonderado);

  return (
    <>
      <AdminHeading
        titulo="Espaço CEnO"
        descricao="Originação, estruturação e conversão de oportunidades. Este espaço é privado: só a sua conta o vê — nem a administração."
        accao={
          <Link href="/admin/energia/oportunidades/nova" className={buttonVariants({ size: 'sm' })}>
            Nova oportunidade
          </Link>
        }
      />
      <EnergiaNav activo="painel" />

      {ops.length === 0 ? (
        <EmptyState
          titulo="Ainda sem oportunidades registadas"
          descricao="A acção das próximas 24 horas: registar todas as oportunidades activas — organização, problema, valor, decisor, etapa, responsável, última interacção, próxima acção e data. A meta é 100 % das oportunidades conhecidas."
        />
      ) : (
        <div className="grid gap-8">
          <section aria-labelledby="kpi-principal">
            <div className="rounded-[--radius-sm] border border-[color:var(--on-surface)] bg-[color:var(--surface-raised)] p-5 md:p-6">
              <h2 id="kpi-principal" className="text-sm text-[color:var(--muted)]">
                KPI principal — prioritárias prontas para decisão
              </h2>
              <p className="mt-2 font-[family-name:var(--font-display)] text-[2.25rem] leading-none font-semibold tracking-[-0.03em] tabular-nums">
                {percentagem(principal.razao)}
              </p>
              <p className="mt-2 max-w-[70ch] text-sm text-[color:var(--muted)]">
                {principal.prioritarias === 0
                  ? 'Sem oportunidades A ou B activas: avalie o score das que tem.'
                  : `${principal.prontas} de ${principal.prioritarias} oportunidades A/B activas têm problema validado, decisor identificado, modelo económico no memo e próxima decisão registada.`}
              </p>
            </div>
          </section>

          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Scorecard">
            <li>
              <Kpi rotulo="Oportunidades activas" valor={String(sc.activas)} nota={`${sc.perdidas} perdidas · ${sc.acordos} com acordo`} />
            </li>
            <li>
              <Kpi
                rotulo="Taxa de qualificação"
                valor={percentagem(sc.taxaQualificacao)}
                nota={`${sc.qualificadas} de ${sc.analisadas} avaliadas com score ≥ ${SCORE_MINIMO}`}
              />
            </li>
            <li>
              <Kpi rotulo="Acesso a decisores" valor={percentagem(sc.acessoDecisores)} nota="Qualificadas com decisor ou sponsor ligado" />
            </li>
            <li>
              <Kpi rotulo="Higiene do pipeline" valor={percentagem(sc.higiene)} nota="Activas com responsável, próxima acção e data" />
            </li>
            <li>
              <Kpi rotulo="Paradas há mais de 14 dias" valor={String(sc.paradas)} nota="Cada uma pede decisão no comité" />
            </li>
            <li>
              <Kpi
                rotulo="Prioridade A com memo"
                valor={`${sc.prioridadeAComMemo}/${sc.prioridadeA}`}
                nota="Todas as A devem ter Opportunity Memo"
              />
            </li>
            <li>
              <Kpi rotulo="Proposta → acordo" valor={percentagem(sc.propostaParaAcordo)} nota="Acordos ÷ oportunidades que chegaram a proposta" />
            </li>
            <li>
              <Kpi
                rotulo="Pipeline ponderado"
                valor={ponderado.length === 0 ? '—' : ponderado.map(([m, v]) => formatarValor(v, m)).join(' · ')}
                nota={`Valor central × probabilidade da etapa, por moeda (sem câmbio).${sc.semValor ? ` ${sc.semValor} sem valor estimado.` : ''}`}
              />
            </li>
          </ul>

          <div className="grid gap-8 xl:grid-cols-2">
            <Bloco titulo="Alertas" subtitulo="O que pede acção ou decisão agora" id="alertas">
              {comAlertas.length === 0 ? (
                <p className="text-sm text-[color:var(--muted)]">Nada em atraso, nada parado. O pipeline está em dia.</p>
              ) : (
                <ul className="grid gap-4">
                  {comAlertas.map(({ o, alertas }) => (
                    <li key={o.id} className="grid gap-2 border-b border-[color:var(--hairline)] pb-4 last:border-b-0 last:pb-0">
                      <Link href={`/admin/energia/oportunidades/${o.id}`} className="font-medium underline">
                        {o.titulo}
                      </Link>
                      <div className="flex flex-wrap gap-2">
                        {alertas.map((a) => (
                          <StateBadge key={a} rotulo={ALERTA[a]} />
                        ))}
                      </div>
                    </li>
                  ))}
                  {alertasForaDaLista > 0 && (
                    <li>
                      <Link href="/admin/energia/oportunidades" className="text-sm underline">
                        E mais {alertasForaDaLista} com alertas — ver todas
                      </Link>
                    </li>
                  )}
                </ul>
              )}
            </Bloco>

            <Bloco titulo="Próximas acções" subtitulo="Por data, das oportunidades activas" id="proximas">
              {proximas.length === 0 ? (
                <p className="text-sm text-[color:var(--muted)]">Sem acções marcadas.</p>
              ) : (
                <ol className="grid gap-3">
                  {proximas.map((o) => (
                    <li key={o.id} className="grid grid-cols-[7rem_1fr] gap-3 text-sm">
                      <span className="tabular-nums text-[color:var(--muted)]">{dataCurta(o.proxima_data)}</span>
                      <span className="min-w-0">
                        <Link href={`/admin/energia/oportunidades/${o.id}`} className="font-medium underline">
                          {o.titulo}
                        </Link>
                        <span className="block text-[color:var(--muted)]">{o.proxima_accao}</span>
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </Bloco>
          </div>

          <Bloco titulo="Pipeline por etapa" subtitulo="Oportunidades em cada etapa, hoje" id="etapas">
            <BarrasHorizontais linhas={porEtapa} legenda="Oportunidades por etapa do pipeline" />
            <p className="mt-4 text-xs text-[color:var(--muted)]">
              Fora da escada: {ops.filter((o) => o.fase === 'perdida').length} perdidas ·{' '}
              {ops.filter((o) => o.fase === 'arquivada').length} arquivadas.
            </p>
          </Bloco>

          <Bloco titulo="Prioridades" subtitulo="Pelo score de qualificação (0–40)" id="prioridades">
            <ul className="flex flex-wrap gap-3">
              {(['A', 'B', 'incubacao', 'abandonar'] as const).map((p) => (
                <li key={p} className="flex items-center gap-2 text-sm">
                  <StateBadge rotulo={PRIORIDADE[p]} />
                  <span className="tabular-nums">{ops.filter((o) => o.prioridade === p && estaActiva(o.fase)).length}</span>
                </li>
              ))}
              <li className="flex items-center gap-2 text-sm text-[color:var(--muted)]">
                Por avaliar: {ops.filter((o) => o.prioridade === null && estaActiva(o.fase)).length}
              </li>
            </ul>
            <p className="mt-4 text-xs text-[color:var(--muted)]">
              Etapas: {FASES.length} + perdida e arquivada. {textoFase('qualificada')} exige score ≥ {SCORE_MINIMO}.
            </p>
          </Bloco>
        </div>
      )}
    </>
  );
}
