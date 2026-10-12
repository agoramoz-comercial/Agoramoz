import Link from 'next/link';
import { ArrowDown, ArrowUp, Columns3, List } from 'lucide-react';
import { BotaoEnviar } from '@/components/admin/BotaoEnviar';
import { EmptyState, StateBadge } from '@/components/admin/primitives';
import { atribuirAMim, moverFase } from '@/lib/admin/crm-actions';
import { CANAL, FASES_OPORTUNIDADE, FASE_OPORTUNIDADE, type FaseOportunidade } from '@/lib/admin/labels';
import { CANAIS, type Canal } from '@/lib/attribution/types';
import { diasNaFase, FASES_FECHADAS, formatarValor } from '@/lib/crm/modelo';
import {
  agruparPorFase,
  totaisPorMoeda,
  urlCom,
  VISTA,
  VISTAS,
  type Filtros,
  type OportunidadePipeline,
  type Ordem,
  type Vista,
} from '@/lib/crm/pipeline';
import { TECTO } from '@/lib/crm/leitura';
import { cn } from '@/lib/utils/cn';
import { CAMPO, Dias, PorActivar, ProximaAccao, quandoCurto, ROTULO, Valor } from './partes';

/**
 * O pipeline como consola: vistas predefinidas, lista densa ordenável e
 * quadro por fase. Tudo é uma ligação (o estado vive no URL) e cada acção
 * volta exactamente a esta vista. Componente de servidor: a página (ou a
 * pré-visualização de QA) passa os dados já lidos.
 */

export interface DadosPipeline {
  readonly filtros: Filtros;
  /** Já com a vista aplicada e ordenadas. A lista pagina; o quadro agrupa. */
  readonly itens: readonly OportunidadePipeline[];
  readonly contagens: Readonly<Record<Vista, number>>;
  readonly truncado: boolean;
  readonly activo: boolean;
  readonly escreve: boolean;
  readonly eu: string;
  readonly nomes: ReadonlyMap<string, string>;
  readonly agora: Date;
}

const POR_PAGINA = 50;
const POR_COLUNA = 30;

export function PipelineVista(d: DadosPipeline) {
  const { filtros: f } = d;
  const aqui = urlCom(f, {});
  const totais = totaisPorMoeda(d.itens);
  const n = d.itens.length;

  return (
    <>
      <nav aria-label="Vistas do pipeline" className="relative mb-5 overflow-x-auto">
        <ul role="list" className="flex min-w-max gap-1 border-b border-[color:var(--border)]">
          {VISTAS.map((v) => {
            const actual = f.vista === v;
            return (
              <li key={v}>
                <Link
                  href={urlCom(f, { vista: v, pagina: 1 })}
                  aria-current={actual ? 'page' : undefined}
                  className={cn(
                    '-mb-px flex min-h-11 items-center gap-2 border-b-2 px-3 text-sm whitespace-nowrap',
                    actual
                      ? 'border-[color:var(--on-surface)] font-medium'
                      : 'border-transparent text-[color:var(--muted)] hover:text-[color:var(--on-surface)]',
                  )}
                >
                  {VISTA[v]}
                  <span className="tabular-nums text-[length:var(--text-micro)] text-[color:var(--muted)]">{d.contagens[v]}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <Filtro f={f} />
        <div role="group" aria-label="Modo de visualização" className="flex">
          <Modo href={urlCom(f, { modo: 'lista', pagina: 1 })} actual={f.modo === 'lista'} Icone={List} texto="Lista" />
          <Modo href={urlCom(f, { modo: 'quadro', pagina: 1 })} actual={f.modo === 'quadro'} Icone={Columns3} texto="Quadro" />
        </div>
      </div>

      {!d.activo ? <PorActivar o="Próxima acção, valor e última actividade" /> : null}
      {d.truncado ? (
        <p role="note" className="mb-4 text-sm text-[color:var(--muted)]">
          Mostram-se as {TECTO} oportunidades mais recentes com estes filtros. Restrinja por fase, canal ou campanha para ver as
          restantes.
        </p>
      ) : null}

      <p className="mb-4 flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm" aria-live="polite">
        <span>
          <strong className="tabular-nums">{n}</strong> {n === 1 ? 'oportunidade' : 'oportunidades'}
        </span>
        {totais.length > 0 ? (
          <span className="text-[color:var(--muted)]">
            Valor registado:{' '}
            {totais.map((t, i) => (
              <span key={t.moeda} className="tabular-nums text-[color:var(--on-surface)]">
                {i > 0 ? ' · ' : ''}
                {formatarValor(t.total, t.moeda)}
              </span>
            ))}
            <span className="sr-only"> (sem câmbio: cada moeda somada à parte)</span>
          </span>
        ) : null}
      </p>

      {n === 0 ? (
        <EmptyState
          titulo="Nenhuma oportunidade nesta vista."
          descricao={f.vista === 'abertas' ? undefined : 'Experimente a vista «Abertas» ou limpe os filtros.'}
        />
      ) : f.modo === 'quadro' ? (
        <Quadro d={d} aqui={aqui} />
      ) : (
        <Lista d={d} aqui={aqui} />
      )}
    </>
  );
}

function Modo({ href, actual, Icone, texto }: { href: string; actual: boolean; Icone: typeof List; texto: string }) {
  return (
    <Link
      href={href}
      aria-current={actual ? 'page' : undefined}
      className={cn(
        'flex min-h-11 items-center gap-2 border border-[color:var(--border)] px-3 text-sm first:rounded-l-[--radius-xs] last:rounded-r-[--radius-xs]',
        actual ? 'bg-[color:var(--on-surface)] text-[color:var(--surface)]' : 'hover:bg-[color:var(--surface-raised)]',
      )}
    >
      <Icone aria-hidden className="size-4" />
      {texto}
    </Link>
  );
}

function Filtro({ f }: { f: Filtros }) {
  const algum = f.fase || f.canal || f.campanha;
  return (
    <form method="get" action="/admin/oportunidades" className="flex flex-wrap items-end gap-3">
      {f.vista !== 'abertas' ? <input type="hidden" name="vista" value={f.vista} /> : null}
      {f.modo !== 'lista' ? <input type="hidden" name="modo" value={f.modo} /> : null}
      {f.ordem !== 'proxima' ? <input type="hidden" name="ordem" value={f.ordem} /> : null}
      {f.sentido !== 'asc' ? <input type="hidden" name="sentido" value={f.sentido} /> : null}
      <label className="flex flex-col gap-1">
        <span className={ROTULO}>Fase</span>
        <select name="fase" defaultValue={f.fase ?? ''} className={cn(CAMPO, 'w-auto')}>
          <option value="">Todas</option>
          {FASES_OPORTUNIDADE.map((x) => (
            <option key={x} value={x}>
              {FASE_OPORTUNIDADE[x].texto}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <span className={ROTULO}>Canal</span>
        <select name="canal" defaultValue={f.canal ?? ''} className={cn(CAMPO, 'w-auto')}>
          <option value="">Todos</option>
          {CANAIS.map((c) => (
            <option key={c} value={c}>
              {CANAL[c].texto}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <span className={ROTULO}>Campanha</span>
        <input type="search" name="campanha" defaultValue={f.campanha ?? ''} placeholder="gbp" className={cn(CAMPO, 'w-40')} />
      </label>
      <button type="submit" className="min-h-11 border border-[color:var(--border)] px-4 text-sm hover:bg-[color:var(--surface-raised)]">
        Filtrar
      </button>
      {algum ? (
        <Link href={urlCom(f, { fase: undefined, canal: undefined, campanha: undefined, pagina: 1 })} className="min-h-11 py-3 text-sm underline">
          Limpar filtros
        </Link>
      ) : null}
    </form>
  );
}

function Ordenavel({ f, ordem, texto, numerico }: { f: Filtros; ordem: Ordem; texto: string; numerico?: boolean }) {
  const actual = f.ordem === ordem;
  const proximo = actual && f.sentido === 'asc' ? 'desc' : 'asc';
  const Seta = f.sentido === 'asc' ? ArrowUp : ArrowDown;
  return (
    <th
      scope="col"
      aria-sort={actual ? (f.sentido === 'asc' ? 'ascending' : 'descending') : 'none'}
      className={cn('px-3 py-2 text-left', numerico && 'text-right')}
    >
      <Link
        href={urlCom(f, { ordem, sentido: proximo, pagina: 1 })}
        className={cn(ROTULO, 'inline-flex min-h-8 items-center gap-1 hover:text-[color:var(--on-surface)]', actual && 'text-[color:var(--on-surface)]')}
      >
        {texto}
        {actual ? <Seta aria-hidden className="size-3" /> : null}
        <span className="sr-only">{actual ? `, ordenado ${f.sentido === 'asc' ? 'ascendente' : 'descendente'}` : ', ordenar'}</span>
      </Link>
    </th>
  );
}

function Lista({ d, aqui }: { d: DadosPipeline; aqui: string }) {
  const { filtros: f } = d;
  const de = (f.pagina - 1) * POR_PAGINA;
  const pagina = d.itens.slice(de, de + POR_PAGINA);
  const haMais = d.itens.length > de + POR_PAGINA;
  const th = (texto: string) => (
    <th scope="col" className={cn(ROTULO, 'px-3 py-2 text-left')}>
      {texto}
    </th>
  );

  return (
    <>
      {/* `relative`: os textos sr-only (posição absoluta) ficam presos ao contentor
          com scroll, em vez de alargarem a página inteira. */}
      <div className="relative overflow-x-auto border border-[color:var(--border)]">
        <table className="w-full min-w-[60rem] border-collapse text-sm">
          <caption className="sr-only">Oportunidades da vista «{VISTA[f.vista]}». Os cabeçalhos com seta ordenam.</caption>
          <thead>
            <tr className="border-b border-[color:var(--border)] bg-[color:var(--surface-raised)]">
              {th('Oportunidade')}
              {th('Fase')}
              <Ordenavel f={f} ordem="fase" texto="Na fase" />
              {th('Responsável')}
              <Ordenavel f={f} ordem="proxima" texto="Próxima acção" />
              <Ordenavel f={f} ordem="valor" texto="Valor" numerico />
              <Ordenavel f={f} ordem="actividade" texto="Última actividade" />
              {th('Origem')}
            </tr>
          </thead>
          <tbody>
            {pagina.map((o) => (
              <tr key={o.id} className="border-b border-[color:var(--hairline)] last:border-b-0 hover:bg-[color:var(--surface-raised)]">
                <td className="px-3 py-2.5 align-top">
                  <Link href={`/admin/oportunidades/${o.id}`} data-atalho-linha className="font-medium underline-offset-4 hover:underline">
                    {o.contacto?.nome ?? 'Sem nome'}
                  </Link>
                  {o.organizacao ? <span className="block text-xs text-[color:var(--muted)]">{o.organizacao.nome}</span> : null}
                </td>
                <td className="px-3 py-2.5 align-top">
                  <StateBadge rotulo={FASE_OPORTUNIDADE[o.stage as FaseOportunidade]} />
                </td>
                <td className="px-3 py-2.5 align-top">
                  <Dias dias={diasNaFase(o.fase_desde, d.agora)} />
                </td>
                <td className="px-3 py-2.5 align-top">
                  <Responsavel o={o} d={d} aqui={aqui} />
                </td>
                <td className="px-3 py-2.5 align-top">
                  {d.activo ? <ProximaAccao quando={o.next_action_at} accao={o.proxima_accao} agora={d.agora} /> : <span className="text-[color:var(--muted)]">—</span>}
                </td>
                <td className="px-3 py-2.5 text-right align-top">
                  <Valor valor={o.valor} moeda={o.moeda} />
                </td>
                <td className="px-3 py-2.5 align-top">
                  {o.ultima_actividade ? (
                    <time dateTime={o.ultima_actividade} className="tabular-nums">
                      {quandoCurto(o.ultima_actividade)}
                    </time>
                  ) : (
                    <span className="text-[color:var(--muted)]">—</span>
                  )}
                </td>
                <td className="px-3 py-2.5 align-top">
                  <StateBadge rotulo={CANAL[o.canal as Canal]} />
                  {o.campanha ? <span className="mt-1 block text-xs text-[color:var(--muted)]">{o.campanha}</span> : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {f.pagina > 1 || haMais ? (
        <nav className="mt-6 flex items-center justify-between" aria-label="Paginação">
          {f.pagina > 1 ? (
            <Link href={urlCom(f, { pagina: f.pagina - 1 })} className="min-h-11 py-3 text-sm underline">
              ← Página anterior
            </Link>
          ) : (
            <span />
          )}
          <span className={ROTULO}>Página {f.pagina}</span>
          {haMais ? (
            <Link href={urlCom(f, { pagina: f.pagina + 1 })} className="min-h-11 py-3 text-sm underline">
              Página seguinte →
            </Link>
          ) : (
            <span />
          )}
        </nav>
      ) : null}
    </>
  );
}

/** O dono por nome; sem dono, quem pode escrever fica com ela num clique. */
function Responsavel({ o, d, aqui }: { o: OportunidadePipeline; d: DadosPipeline; aqui: string }) {
  if (o.owner_id) {
    const nome = d.nomes.get(o.owner_id) ?? '(perfil removido)';
    return <span>{o.owner_id === d.eu ? `${nome} (eu)` : nome}</span>;
  }
  if (!d.escreve) return <span className="text-[color:var(--muted)]">Sem dono</span>;
  return (
    <form action={atribuirAMim} className="flex flex-col items-start gap-1">
      <input type="hidden" name="id" value={o.id} />
      <input type="hidden" name="voltar" value={aqui} />
      <span className="text-xs text-[color:var(--muted)]">Sem dono</span>
      <BotaoEnviar variant="outline" size="sm" aEnviar="A atribuir…" aria-label={`Atribuir a mim: ${o.contacto?.nome ?? 'oportunidade'}`}>
        Atribuir a mim
      </BotaoEnviar>
    </form>
  );
}

function Quadro({ d, aqui }: { d: DadosPipeline; aqui: string }) {
  const { filtros: f } = d;
  const fases = f.fase
    ? [f.fase]
    : f.vista === 'todas'
      ? [...FASES_OPORTUNIDADE]
      : FASES_OPORTUNIDADE.filter((x) => !(FASES_FECHADAS as readonly string[]).includes(x));
  const grupos = agruparPorFase(d.itens).filter((g) => fases.includes(g.fase as FaseOportunidade));

  return (
    <div className="relative overflow-x-auto pb-2">
      <ol role="list" aria-label="Quadro por fase" className="grid min-w-max auto-cols-[17rem] grid-flow-col gap-3">
        {grupos.map((g) => {
          const rotulo = FASE_OPORTUNIDADE[g.fase as FaseOportunidade];
          const totais = totaisPorMoeda(g.itens);
          const titulo = `fase-${g.fase}`;
          return (
            <li key={g.fase} aria-labelledby={titulo} className="flex flex-col border border-[color:var(--border)] bg-[color:var(--surface-raised)]">
              <div className="border-b border-[color:var(--border)] px-3 py-2.5">
                <h2 id={titulo} className="flex items-center justify-between gap-2 text-sm font-medium">
                  {rotulo.texto}
                  <span className="tabular-nums text-[color:var(--muted)]">
                    {g.itens.length}
                    <span className="sr-only"> {g.itens.length === 1 ? 'oportunidade' : 'oportunidades'}</span>
                  </span>
                </h2>
                {totais.length > 0 ? (
                  <p className="mt-0.5 text-xs text-[color:var(--muted)] tabular-nums">
                    {totais.map((t) => formatarValor(t.total, t.moeda)).join(' · ')}
                  </p>
                ) : null}
              </div>
              {g.itens.length === 0 ? (
                <p className="px-3 py-6 text-center text-xs text-[color:var(--muted)]">Vazia</p>
              ) : (
                <ul role="list" className="flex flex-col gap-2 p-2">
                  {g.itens.slice(0, POR_COLUNA).map((o) => (
                    <Cartao key={o.id} o={o} d={d} aqui={aqui} />
                  ))}
                </ul>
              )}
              {g.itens.length > POR_COLUNA ? (
                <Link href={urlCom(f, { modo: 'lista', fase: g.fase, pagina: 1 })} className="px-3 pb-3 text-xs underline">
                  Mais {g.itens.length - POR_COLUNA} — ver na lista
                </Link>
              ) : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function Cartao({ o, d, aqui }: { o: OportunidadePipeline; d: DadosPipeline; aqui: string }) {
  const nome = o.contacto?.nome ?? 'Sem nome';
  const idSel = `mover-${o.id}`;
  return (
    <li className="flex flex-col gap-2 border border-[color:var(--border)] bg-[color:var(--surface)] p-3 text-sm">
      <div>
        <Link href={`/admin/oportunidades/${o.id}`} data-atalho-linha className="font-medium underline-offset-4 hover:underline">
          {nome}
        </Link>
        {o.organizacao ? <span className="block text-xs text-[color:var(--muted)]">{o.organizacao.nome}</span> : null}
      </div>
      {d.activo ? <ProximaAccao quando={o.next_action_at} accao={o.proxima_accao} agora={d.agora} /> : null}
      <dl className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs">
        <dt className="text-[color:var(--muted)]">Valor</dt>
        <dd className="text-right">
          <Valor valor={o.valor} moeda={o.moeda} />
        </dd>
        <dt className="text-[color:var(--muted)]">Na fase</dt>
        <dd className="text-right">
          <Dias dias={diasNaFase(o.fase_desde, d.agora)} />
        </dd>
        <dt className="text-[color:var(--muted)]">Responsável</dt>
        <dd className="truncate text-right">{o.owner_id ? (d.nomes.get(o.owner_id) ?? '(perfil removido)') : 'Sem dono'}</dd>
      </dl>
      {d.escreve ? (
        <form action={moverFase} className="flex items-end gap-2 border-t border-[color:var(--hairline)] pt-2">
          <input type="hidden" name="id" value={o.id} />
          <input type="hidden" name="voltar" value={aqui} />
          <label htmlFor={idSel} className="sr-only">
            Mover {nome} para a fase
          </label>
          <select id={idSel} name="fase" defaultValue={o.stage} className={cn(CAMPO, 'min-h-9 flex-1 text-xs')}>
            {FASES_OPORTUNIDADE.map((x) => (
              <option key={x} value={x}>
                {FASE_OPORTUNIDADE[x].texto}
              </option>
            ))}
          </select>
          <BotaoEnviar variant="outline" size="sm" aEnviar="…" aria-label={`Mover ${nome}`}>
            Mover
          </BotaoEnviar>
        </form>
      ) : null}
    </li>
  );
}
