import Link from 'next/link';
import { ArrowRight, ArrowUpRight, Plus } from 'lucide-react';
import { BotaoEnviar } from '@/components/admin/BotaoEnviar';
import { StateBadge } from '@/components/admin/primitives';
import { atribuirAMim } from '@/lib/admin/crm-actions';
import { CANAL, ESTADO_DIAGNOSTICO, FASE_OPORTUNIDADE, type FaseOportunidade } from '@/lib/admin/labels';
import type { Canal } from '@/lib/attribution/types';
import { formatarQuando } from '@/lib/crm/cronologia';
import { dataPorExtenso, saudacao, type ResumoHoje } from '@/lib/crm/hoje';
import type { PorRever, ReuniaoProxima } from '@/lib/crm/leitura';
import { diasNaFase, type Fila } from '@/lib/crm/modelo';
import type { OportunidadePipeline } from '@/lib/crm/pipeline';
import { cn } from '@/lib/utils/cn';
import { Dias, PorActivar, ProximaAccao, quandoCurto, Valor } from './partes';

/**
 * «Hoje»: o ecrã de entrada do admin. Responde primeiro a «o que tenho de
 * fazer agora?» — as minhas acções por urgência — e depois ao que é de toda a
 * equipa: leads sem dono (por ordem de triagem), diagnósticos por rever e
 * reuniões da semana. Cada número leva à lista exacta que o explica.
 */

export interface DadosHoje {
  readonly nome: string;
  readonly agora: Date;
  readonly eu: string;
  readonly escreve: boolean;
  readonly activo: boolean;
  readonly fila: Fila<OportunidadePipeline>;
  readonly triagem: readonly OportunidadePipeline[];
  readonly porRever: { itens: readonly PorRever[]; total: number } | null;
  readonly reunioes: readonly ReuniaoProxima[];
  readonly resumo: ResumoHoje;
  readonly falhou: boolean;
  /**
   * HOJE-01 — O funil dos últimos 30 dias, das mesmas contas do painel. `null`
   * quando não há dados (por activar ou erro): o bloco não aparece, nunca com
   * zeros inventados.
   */
  readonly funil?: readonly { rotulo: string; valor: number }[] | null;
  /** HOJE-02 — «Criar rápido»: os mesmos destinos do «Criar» da paleta, já filtrados por papel. */
  readonly criar?: readonly { texto: string; href: string }[];
}


const CAIXA = 'overflow-hidden rounded-[20px] border border-[color:var(--border)] bg-[color:var(--surface-raised)]';

export function HojeVista(d: DadosHoje) {
  const r = d.resumo;
  const minhas = r.atrasadas + r.hoje + r.semana + (d.activo ? r.paradas : 0);

  return (
    <>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[clamp(2.25rem,1.5rem+2.6vw,3.75rem)] leading-[1] font-medium tracking-[-0.04em]">
            {saudacao(d.agora)}, {d.nome.split(/\s+/)[0]}
          </h1>
          <p className="mt-3 text-sm text-[color:var(--muted)]">
            <span className="first-letter:uppercase">{dataPorExtenso(d.agora)}</span> · o que precisa de si agora
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/admin/painel"
            className="inline-flex min-h-11 items-center rounded-full border border-[color:var(--border)] bg-[color:var(--surface-raised)] px-5 text-sm hover:border-[#0b0a09]/40"
          >
            Ver painel completo
          </Link>
          <Link
            href="/admin/oportunidades"
            className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#0b0a09] px-5 text-sm font-medium text-[#efe8da]"
          >
            Abrir o pipeline <ArrowRight aria-hidden className="size-4" />
          </Link>
        </div>
      </div>

      {d.falhou ? (
        <p role="alert" className="mb-6 rounded-[24px] border border-[color:var(--color-signal-700)] px-4 py-3 text-sm">
          Não foi possível ler as oportunidades. Recarregue a página; se persistir, veja o estado da base.
        </p>
      ) : null}
      {!d.activo ? <PorActivar o="Próximas acções escritas à mão e oportunidades paradas" /> : null}

      <nav aria-label="Resumo do dia" className="mb-6">
        <ul role="list" className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          <Indicador valor={r.atrasadas} texto="Atrasadas" nota="as minhas" href={`/admin/oportunidades?vista=atrasadas&dono=${d.eu}`} alerta={r.atrasadas > 0} />
          <Indicador valor={r.hoje} texto="Para hoje" nota="próximas acções" href="#para-hoje" />
          <Indicador valor={r.semana} texto="Esta semana" nota="próximas acções" href="#esta-semana" />
          <Indicador valor={d.activo ? r.paradas : null} texto="Paradas" nota="sem actividade" href={`/admin/oportunidades?vista=paradas&dono=${d.eu}`} />
          <Indicador valor={r.semDono} texto="Sem dono" nota="por atribuir" href="/admin/oportunidades?vista=sem-dono" />
          <Indicador valor={d.porRever ? r.porRever : null} texto="Por rever" nota="diagnósticos" href="/admin/diagnosticos?estado=por-rever" />
          <Indicador valor={r.reunioes} texto="Reuniões" nota="próximos 7 dias" href="#reunioes" />
        </ul>
      </nav>

      {(d.funil && d.funil.length > 0) || (d.criar && d.criar.length > 0) ? (
        <div className="mb-8 grid gap-3 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          {d.funil && d.funil.length > 0 ? <Funil etapas={d.funil} /> : <div aria-hidden className="hidden lg:block" />}
          {d.criar && d.criar.length > 0 ? <CriarRapido itens={d.criar} /> : null}
        </div>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
        <div data-surface="dark" className="flex min-w-0 flex-col gap-6 rounded-[28px] bg-[#0b0a09] p-4 text-[#efe8da] sm:p-6">
          <h2 className="text-xl font-medium tracking-[-0.02em]">A minha fila</h2>
          {minhas === 0 ? (
            <div className="rounded-[20px] border border-dashed border-[color:var(--border)] px-6 py-10 text-center">
              <p className="text-[length:var(--text-lead)]">Nada atrasado nem para hoje.</p>
              <p className="mt-2 text-sm text-[color:var(--muted)]">
                As oportunidades que forem suas e tiverem próxima acção aparecem aqui por urgência.{' '}
                <Link href="/admin/oportunidades?vista=minhas" className="underline">
                  Ver as minhas no pipeline
                </Link>
              </p>
            </div>
          ) : null}
          <Seccao id="atrasadas" titulo="Atrasadas" n={r.atrasadas} oculta={r.atrasadas === 0}>
            {d.fila.atrasadas.map((o) => (
              <LinhaAccao key={o.id} o={o} agora={d.agora} />
            ))}
          </Seccao>
          <Seccao id="para-hoje" titulo="Para hoje" n={r.hoje} oculta={r.hoje === 0}>
            {d.fila.hoje.map((o) => (
              <LinhaAccao key={o.id} o={o} agora={d.agora} />
            ))}
          </Seccao>
          <Seccao id="esta-semana" titulo="Esta semana" n={r.semana} oculta={r.semana === 0}>
            {d.fila.semana.map((o) => (
              <LinhaAccao key={o.id} o={o} agora={d.agora} />
            ))}
          </Seccao>
          {d.activo ? (
            <Seccao
              id="paradas"
              titulo="Paradas há mais de 14 dias"
              n={r.paradas}
              oculta={r.paradas === 0}
              nota="Suas, sem próxima acção para esta semana e sem actividade recente."
            >
              {d.fila.paradas.map((o) => (
                <LinhaAccao key={o.id} o={o} agora={d.agora} parada />
              ))}
            </Seccao>
          ) : null}
        </div>

        <div className="flex min-w-0 flex-col gap-8">
          <h2 className="text-xl font-medium tracking-[-0.02em]">Da equipa</h2>
          <Seccao id="sem-dono" titulo="Sem dono" n={r.semDono} nota="Pela ordem em que vale a pena pegar: classificação, depois o mais recente." vazio="Todos os leads têm dono.">
            {d.triagem.map((o) => (
              <LinhaTriagem key={o.id} o={o} agora={d.agora} escreve={d.escreve} />
            ))}
          </Seccao>
          <Seccao
            id="por-rever"
            titulo="Diagnósticos por rever"
            n={d.porRever?.total ?? null}
            vazio={d.porRever ? 'Nenhum à espera de decisão.' : 'Não foi possível ler os diagnósticos.'}
            mais={d.porRever && d.porRever.total > d.porRever.itens.length ? { href: '/admin/diagnosticos?estado=por-rever', texto: `Ver os ${d.porRever.total}` } : undefined}
          >
            {(d.porRever?.itens ?? []).map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                <span>
                  <Link href={`/admin/diagnosticos/${p.id}`} data-atalho-linha className="font-medium underline-offset-4 hover:underline">
                    {p.contacto ?? 'Sem nome'}
                  </Link>
                  <span className="block text-xs text-[color:var(--muted)]">
                    {p.tier} · {p.score} pontos · entrou {quandoCurto(p.criado)}
                  </span>
                </span>
                <StateBadge rotulo={ESTADO_DIAGNOSTICO[p.estado as keyof typeof ESTADO_DIAGNOSTICO]} />
              </li>
            ))}
          </Seccao>
          <Seccao id="reunioes" titulo="Reuniões nos próximos 7 dias" n={r.reunioes} vazio="Nenhuma reunião marcada.">
            {d.reunioes.map((m) => (
              <li key={m.id} className="px-4 py-3">
                <p className="text-sm font-medium tabular-nums">{formatarQuando(m.inicio)}</p>
                <p className="text-sm">
                  {m.oportunidade ? (
                    <Link href={`/admin/oportunidades/${m.oportunidade.id}`} className="underline-offset-4 hover:underline">
                      {m.oportunidade.nome}
                    </Link>
                  ) : (
                    'Sem oportunidade ligada'
                  )}
                </p>
                {m.tipo ? <p className="text-xs text-[color:var(--muted)]">{m.tipo}</p> : null}
              </li>
            ))}
          </Seccao>
        </div>
      </div>
    </>
  );
}

function Indicador({
  valor,
  texto,
  nota,
  href,
  alerta,
}: {
  valor: number | null;
  texto: string;
  nota: string;
  href: string;
  alerta?: boolean;
}) {
  return (
    <li>
      <Link
        href={href}
        className={cn(
          'flex h-full min-h-32 flex-col justify-between gap-2 rounded-[24px] border bg-[color:var(--surface-raised)] p-4 hover:border-[#0b0a09]/40',
          alerta ? 'border-[#e9a35c] shadow-[inset_0_0_0_1px_#e9a35c]' : 'border-[color:var(--border)]',
        )}
      >
        <span className="text-sm text-[color:var(--muted)]">{texto}</span>
        <span className="text-[2rem] leading-none font-medium tracking-[-0.03em] tabular-nums">
          {valor ?? '—'}
          {valor === null ? <span className="sr-only"> (por activar)</span> : null}
        </span>
        <span className="text-xs text-[color:var(--muted)]">{nota}</span>
      </Link>
    </li>
  );
}

function Funil({ etapas }: { etapas: readonly { rotulo: string; valor: number }[] }) {
  const max = Math.max(1, ...etapas.map((e) => e.valor));
  return (
    <section aria-labelledby="t-funil" className="rounded-[24px] border border-[color:var(--border)] bg-[color:var(--surface-raised)] p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id="t-funil" className="text-lg font-medium tracking-[-0.02em]">
            Funil de aquisição
          </h2>
          <p className="text-xs text-[color:var(--muted)]">Do primeiro passo ao negócio ganho, nos últimos 30 dias</p>
        </div>
        <Link
          href="/admin/painel"
          aria-label="Abrir o painel completo"
          className="flex size-10 shrink-0 items-center justify-center rounded-full border border-[color:var(--border)] hover:border-[#0b0a09]/40"
        >
          <ArrowUpRight aria-hidden className="size-4" />
        </Link>
      </div>
      <ul role="list" className="mt-5 grid gap-3">
        {etapas.map((e) => (
          <li key={e.rotulo} className="grid grid-cols-[minmax(8rem,11rem)_1fr_auto] items-center gap-3 text-sm">
            <span>{e.rotulo}</span>
            <span aria-hidden className="h-2.5 overflow-hidden rounded-full bg-[color:var(--border)]">
              <span className="admin-listras block h-full rounded-full" style={{ width: `${(e.valor / max) * 100}%` }} />
            </span>
            <span className="w-10 text-right font-medium tabular-nums">{e.valor.toLocaleString('pt-PT')}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function CriarRapido({ itens }: { itens: readonly { texto: string; href: string }[] }) {
  return (
    <section id="criar" aria-labelledby="t-criar" className="scroll-mt-24 rounded-[24px] border border-[color:var(--border)] bg-[color:var(--surface-raised)] p-5 sm:p-6">
      <h2 id="t-criar" className="text-lg font-medium tracking-[-0.02em]">
        Criar rápido
      </h2>
      <ul role="list" className="mt-4 grid gap-2 sm:grid-cols-2">
        {itens.map((c, i) => (
          <li key={c.href}>
            <Link
              href={c.href}
              className={cn(
                'flex min-h-16 items-center gap-2 rounded-[18px] px-4 text-sm font-medium',
                i === 0 ? 'bg-[#e9a35c] text-[#0b0a09]' : 'bg-[color:var(--surface)] hover:bg-[#0b0a09]/5',
              )}
            >
              <Plus aria-hidden className="size-4 shrink-0" />
              {c.texto}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Seccao({
  id,
  titulo,
  n,
  nota,
  vazio,
  oculta,
  mais,
  children,
}: {
  id: string;
  titulo: string;
  n: number | null;
  nota?: string;
  vazio?: string;
  oculta?: boolean;
  mais?: { href: string; texto: string };
  children: React.ReactNode;
}) {
  if (oculta) return null;
  const vazia = n === 0 || n === null;
  return (
    <section id={id} aria-labelledby={`t-${id}`} className="scroll-mt-24">
      <h3 id={`t-${id}`} className="mb-1 flex items-baseline gap-2 text-sm font-medium">
        {titulo}
        {n !== null ? <span className="tabular-nums text-[color:var(--muted)]">{n}</span> : null}
      </h3>
      {nota ? <p className="mb-2 text-xs text-[color:var(--muted)]">{nota}</p> : null}
      {vazia && vazio ? (
        <p className="rounded-[20px] border border-dashed border-[color:var(--border)] px-4 py-5 text-sm text-[color:var(--muted)]">{vazio}</p>
      ) : (
        <ul role="list" className={cn(CAIXA, 'divide-y divide-[color:var(--hairline)]')}>
          {children}
        </ul>
      )}
      {mais ? (
        <Link href={mais.href} className="mt-2 inline-block text-sm underline">
          {mais.texto}
        </Link>
      ) : null}
    </section>
  );
}

function LinhaAccao({ o, agora, parada }: { o: OportunidadePipeline; agora: Date; parada?: boolean }) {
  return (
    <li className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 px-4 py-3">
      <div className="min-w-0 flex-1">
        <Link href={`/admin/oportunidades/${o.id}`} data-atalho-linha className="font-medium underline-offset-4 hover:underline">
          {o.contacto?.nome ?? 'Sem nome'}
        </Link>
        <p className="text-xs text-[color:var(--muted)]">
          {[o.organizacao?.nome, FASE_OPORTUNIDADE[o.stage as FaseOportunidade]?.texto].filter(Boolean).join(' · ')}
        </p>
        <div className="mt-1.5">
          {parada ? (
            <span className="text-xs text-[color:var(--muted)]">
              Última actividade {o.ultima_actividade ? quandoCurto(o.ultima_actividade) : '—'}
            </span>
          ) : (
            <ProximaAccao quando={o.next_action_at} accao={o.proxima_accao} agora={agora} />
          )}
        </div>
      </div>
      <div className="flex flex-col items-end gap-1 text-sm">
        <Valor valor={o.valor} moeda={o.moeda} />
        <Link href={`/admin/oportunidades/${o.id}#proxima`} className="inline-flex min-h-10 items-center underline" aria-label={`Actualizar a próxima acção: ${o.contacto?.nome ?? 'oportunidade'}`}>
          Actualizar
        </Link>
      </div>
    </li>
  );
}

function LinhaTriagem({ o, agora, escreve }: { o: OportunidadePipeline; agora: Date; escreve: boolean }) {
  const nome = o.contacto?.nome ?? 'Sem nome';
  return (
    <li className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 px-4 py-3">
      <div className="min-w-0 flex-1">
        <Link href={`/admin/oportunidades/${o.id}`} data-atalho-linha className="font-medium underline-offset-4 hover:underline">
          {nome}
        </Link>
        <p className="text-xs text-[color:var(--muted)]">
          {o.organizacao?.nome ?? 'Sem organização'} · entrou há <Dias dias={diasNaFase(o.created_at, agora)} />
        </p>
        <p className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
          <span className="font-medium tabular-nums">{o.tier ? `${o.tier} · ${o.score ?? '—'} pontos` : 'Sem classificação'}</span>
          <StateBadge rotulo={CANAL[o.canal as Canal]} />
        </p>
      </div>
      {escreve ? (
        <form action={atribuirAMim}>
          <input type="hidden" name="id" value={o.id} />
          <input type="hidden" name="voltar" value="/admin" />
          <BotaoEnviar variant="outline" size="sm" aEnviar="A atribuir…" aria-label={`Atribuir a mim: ${nome}`}>
            Atribuir a mim
          </BotaoEnviar>
        </form>
      ) : null}
    </li>
  );
}
