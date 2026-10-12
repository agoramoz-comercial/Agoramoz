import Link from 'next/link';
import { ClipboardCheck, Mail, Phone, StickyNote, Users } from 'lucide-react';
import { BotaoEnviar } from '@/components/admin/BotaoEnviar';
import { DataHora, DefinitionList, EmptyState, StateBadge } from '@/components/admin/primitives';
import { atribuirOportunidade, mudarFase as mudarFaseLegado } from '@/lib/admin/actions';
import {
  atribuirAMim,
  definirProximaAccao,
  guardarDados,
  marcarPerdida,
  moverFase,
  registarActividade,
} from '@/lib/admin/crm-actions';
import {
  CANAL,
  CLASSIFICACAO,
  ESTADO_DIAGNOSTICO,
  FASES_OPORTUNIDADE,
  FASE_OPORTUNIDADE,
  type FaseOportunidade,
} from '@/lib/admin/labels';
import type { Canal } from '@/lib/attribution/types';
import { descrever, formatarQuando } from '@/lib/crm/cronologia';
import {
  diaDeMaputo,
  diasNaFase,
  estadoProximaAccao,
  FASES_FECHADAS,
  MOEDAS,
  MOTIVO_PERDA,
  MOTIVOS_PERDA,
  TIPO_ACTIVIDADE,
  TIPOS_ACTIVIDADE,
  type MotivoPerda,
} from '@/lib/crm/modelo';
import { cn } from '@/lib/utils/cn';
import type { LinhaAuditoria } from '@/lib/admin/auditoria';
import { Historico } from './Historico';
import { CAMPO, Dias, PorActivar, ProximaAccao, ROTULO, Valor } from './partes';

/**
 * A ficha da oportunidade como um objecto ligado (à Palantir): cabeçalho com
 * o próximo passo, propriedades editáveis à direita (uma acção de cada vez,
 * cada uma no seu formulário), e à esquerda o compositor e a cronologia em
 * frases legíveis. As ligações — contacto, organização, diagnóstico, reuniões
 * — levam aos objectos vizinhos.
 */

export interface ActividadeFicha {
  readonly id: number;
  readonly activity_type: string;
  readonly body: string | null;
  readonly occurred_at: string;
  readonly actor_type: string;
  readonly actor_id: string | null;
  readonly metadata: Record<string, unknown> | null;
}

export interface DadosFicha {
  readonly id: string;
  readonly stage: string;
  readonly tier: string | null;
  readonly score: number | null;
  readonly owner_id: string | null;
  readonly next_action_at: string | null;
  readonly proxima_accao: string | null;
  readonly fase_desde: string | null;
  readonly valor: number | null;
  readonly moeda: string | null;
  readonly data_prevista_fecho: string | null;
  readonly motivo_perda: string | null;
  readonly motivo_perda_nota: string | null;
  readonly revisao: number | null;
  readonly created_at: string;
  readonly canal: string;
  readonly campanha: string | null;
  readonly contacto: { id: string; nome: string; email: string | null } | null;
  readonly organizacao: { id: string; nome: string } | null;
  readonly atribuicao: Readonly<Record<string, string | null>> | null;
  readonly diagnostico: { id: string; estado: string; tier: string; score: number } | null;
  readonly reunioes: readonly { id: string; estado: string; tipo: string | null; inicio: string | null }[];
  readonly actividades: readonly ActividadeFicha[];
}

export interface PropsFicha {
  readonly d: DadosFicha;
  readonly activo: boolean;
  readonly escreve: boolean;
  readonly eu: string;
  readonly equipa: readonly { id: string; nome: string; activo: boolean }[];
  readonly agora: Date;
  /** Veio do quadro ou da lista com «Perdido»: abre o formulário do motivo. */
  readonly perder: boolean;
  /** O `audit_log` desta oportunidade; com `admin`, liga à auditoria completa. */
  readonly historico?: readonly LinhaAuditoria[];
  readonly admin?: boolean;
}

const ICONE_TIPO: Readonly<Record<string, typeof StickyNote>> = {
  nota: StickyNote,
  chamada: Phone,
  email: Mail,
  reuniao: Users,
};

const CAIXA = 'border border-[color:var(--border)] p-4';
const H2 = 'mb-3 text-sm font-medium';

export function FichaOportunidade({ d, activo, escreve, eu, equipa, agora, perder, historico = [], admin = false }: PropsFicha) {
  const nomes = new Map(equipa.map((p) => [p.id, p.nome]));
  const fechada = (FASES_FECHADAS as readonly string[]).includes(d.stage);

  return (
    <>
      {activo ? <ProximoPasso d={d} agora={agora} fechada={fechada} /> : <PorActivar o="Próxima acção, valor, fecho e motivo de perda" />}

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
        {/* As propriedades vêm primeiro no documento: no telemóvel, a fase e o
            próximo passo aparecem antes da cronologia; no ecrã largo, à direita. */}
        <aside aria-label="Propriedades" className="flex flex-col gap-4 lg:col-start-2 lg:row-start-1">
          <Fase d={d} activo={activo} escreve={escreve} perder={perder} agora={agora} />
          <Responsavel d={d} escreve={escreve} eu={eu} equipa={equipa} nomes={nomes} />
          {activo ? <Proxima d={d} escreve={escreve} agora={agora} fechada={fechada} /> : null}
          {activo ? <Dados d={d} escreve={escreve} /> : null}
          <Ligacoes d={d} />
        </aside>
        <div className="flex min-w-0 flex-col gap-8 lg:col-start-1 lg:row-start-1">
          {escreve ? <Compositor id={d.id} /> : (
            <p className="text-sm text-[color:var(--muted)]">O seu papel é de leitura: pode consultar a oportunidade, não alterá-la.</p>
          )}
          <Cronologia actividades={d.actividades} nomes={nomes} />
          <Origem d={d} />
          <Historico entradas={historico} nomes={nomes} auditoria={admin ? `/admin/auditoria?entidade=deal&id=${d.id}` : undefined} />
        </div>

      </div>
    </>
  );
}

function ProximoPasso({ d, agora, fechada }: { d: DadosFicha; agora: Date; fechada: boolean }) {
  if (d.stage === 'perdido') {
    const motivo = d.motivo_perda && d.motivo_perda in MOTIVO_PERDA ? MOTIVO_PERDA[d.motivo_perda as MotivoPerda] : null;
    return (
      <p className="mb-6 border-l-4 border-[color:var(--color-signal-700)] bg-[color:var(--surface-raised)] px-4 py-3 text-sm">
        Perdida{motivo ? ` — ${motivo}` : ' — sem motivo registado'}
        {d.motivo_perda_nota ? `: ${d.motivo_perda_nota}` : '.'}
      </p>
    );
  }
  if (fechada) {
    return <p className="mb-6 border-l-4 border-[color:var(--color-dado-texto)] bg-[color:var(--surface-raised)] px-4 py-3 text-sm">Ganha.</p>;
  }
  if (!d.proxima_accao) {
    return (
      <p role="note" className="mb-6 border-l-4 border-[color:var(--color-signal-700)] bg-[color:var(--surface-raised)] px-4 py-3 text-sm">
        <strong>Sem próximo passo.</strong> Uma oportunidade aberta sem data para a próxima acção é a que se esquece.{' '}
        <a href="#proxima" className="underline">
          Definir agora
        </a>
      </p>
    );
  }
  const atrasada = estadoProximaAccao(d.next_action_at, agora) === 'atrasada';
  return (
    <div
      className={cn(
        'mb-6 flex flex-wrap items-center gap-x-4 gap-y-2 border-l-4 bg-[color:var(--surface-raised)] px-4 py-3',
        atrasada ? 'border-[color:var(--color-signal-700)]' : 'border-[color:var(--on-surface)]',
      )}
    >
      <span className={ROTULO}>Próximo passo</span>
      <span className="text-sm font-medium">{d.proxima_accao}</span>
      <ProximaAccao quando={d.next_action_at} accao={null} agora={agora} />
    </div>
  );
}

function Compositor({ id }: { id: string }) {
  return (
    <form action={registarActividade} className={CAIXA}>
      <input type="hidden" name="id" value={id} />
      <fieldset>
        <legend className={H2}>Registar actividade</legend>
        <div className="flex flex-wrap gap-2">
          {TIPOS_ACTIVIDADE.map((t, i) => {
            const Icone = ICONE_TIPO[t] ?? StickyNote;
            return (
              <label
                key={t}
                className="flex min-h-10 cursor-pointer items-center gap-2 rounded-[--radius-xs] border border-[color:var(--border)] px-3 text-sm has-[:checked]:border-[color:var(--on-surface)] has-[:checked]:bg-[color:var(--on-surface)] has-[:checked]:text-[color:var(--surface)] has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2"
              >
                <input type="radio" name="tipo" value={t} defaultChecked={i === 0} className="sr-only" />
                <Icone aria-hidden className="size-4" />
                {TIPO_ACTIVIDADE[t]}
              </label>
            );
          })}
        </div>
      </fieldset>
      <label htmlFor="corpo" className="mt-3 block text-xs text-[color:var(--muted)]">
        O que aconteceu (fica na cronologia)
      </label>
      <textarea id="corpo" name="corpo" rows={3} required maxLength={4000} className={cn(CAMPO, 'mt-1 min-h-24 p-3')} />
      <BotaoEnviar variant="outline" size="sm" className="mt-3" aEnviar="A registar…">
        Registar
      </BotaoEnviar>
    </form>
  );
}

function Cronologia({ actividades, nomes }: { actividades: readonly ActividadeFicha[]; nomes: ReadonlyMap<string, string> }) {
  return (
    <section aria-labelledby="cronologia">
      <h2 id="cronologia" className="mb-4 text-[length:var(--text-h3)] tracking-[-0.02em]">
        Cronologia
      </h2>
      {actividades.length === 0 ? (
        <EmptyState titulo="Ainda não há actividade registada." />
      ) : (
        <ol role="list" className="flex flex-col">
          {actividades.map((a) => {
            const { titulo, detalhe } = descrever(a, nomes);
            const Icone = ICONE_TIPO[a.activity_type];
            const quem = a.actor_type === 'user' ? (a.actor_id ? (nomes.get(a.actor_id) ?? '(perfil removido)') : '—') : a.actor_type === 'ai' ? 'IA' : 'Sistema';
            return (
              <li key={a.id} className="relative border-l border-[color:var(--border)] pb-5 pl-5 last:pb-0">
                <span aria-hidden className="absolute top-1.5 -left-[5px] size-[9px] rounded-full border border-[color:var(--border)] bg-[color:var(--surface)]" />
                <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                  {Icone ? <Icone aria-hidden className="size-4 text-[color:var(--muted)]" /> : null}
                  {titulo}
                </p>
                <p className="mt-0.5 text-xs text-[color:var(--muted)]">
                  <time dateTime={a.occurred_at} className="tabular-nums">
                    {formatarQuando(a.occurred_at)}
                  </time>{' '}
                  · {quem}
                  {detalhe ? ` · ${detalhe}` : ''}
                </p>
                {a.body && !['proxima_accao'].includes(a.activity_type) ? (
                  <p className="mt-1.5 max-w-[65ch] text-sm whitespace-pre-wrap">{a.body}</p>
                ) : null}
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

function Origem({ d }: { d: DadosFicha }) {
  const a = d.atribuicao;
  return (
    <section aria-labelledby="origem">
      <h2 id="origem" className="mb-4 text-sm font-medium">
        Origem
      </h2>
      <DefinitionList
        itens={[
          { termo: 'Canal', valor: <StateBadge rotulo={CANAL[d.canal as Canal]} /> },
          { termo: 'Campanha', valor: d.campanha ?? '—' },
          { termo: 'Fonte', valor: a?.utm_source ?? '—' },
          { termo: 'Meio', valor: a?.utm_medium ?? '—' },
          { termo: 'Conteúdo', valor: a?.utm_content ?? '—' },
          { termo: 'Página de entrada', valor: a?.landing_page ?? '—' },
          { termo: 'Veio de', valor: a?.referrer_host ?? '—' },
          { termo: 'Primeiro contacto', valor: <DataHora valor={a?.first_touch_at} /> },
          { termo: 'Submeteu', valor: <DataHora valor={a?.last_touch_at} /> },
        ]}
      />
    </section>
  );
}

function Fase({ d, activo, escreve, perder, agora }: { d: DadosFicha; activo: boolean; escreve: boolean; perder: boolean; agora: Date }) {
  const rotulo = FASE_OPORTUNIDADE[d.stage as FaseOportunidade];
  return (
    <section aria-labelledby="p-fase" className={CAIXA}>
      <h2 id="p-fase" className={H2}>
        Fase
      </h2>
      <p className="flex flex-wrap items-center gap-2 text-sm">
        <StateBadge rotulo={rotulo} />
        {activo ? (
          <span className="text-[color:var(--muted)]">
            há <Dias dias={diasNaFase(d.fase_desde, agora)} />
          </span>
        ) : null}
      </p>
      {escreve ? (
        <form action={activo ? moverFase : mudarFaseLegado} className="mt-3 flex items-end gap-2">
          <input type="hidden" name="id" value={d.id} />
          <label htmlFor="fase" className="sr-only">
            Nova fase
          </label>
          <select id="fase" name="fase" defaultValue={d.stage} className={cn(CAMPO, 'flex-1')}>
            {FASES_OPORTUNIDADE.filter((f) => !activo || f !== 'perdido' || d.stage === 'perdido').map((f) => (
              <option key={f} value={f}>
                {FASE_OPORTUNIDADE[f].texto}
              </option>
            ))}
          </select>
          <BotaoEnviar variant="outline" size="sm" aEnviar="A guardar…">
            Mudar
          </BotaoEnviar>
        </form>
      ) : null}
      {escreve && activo && (d.stage !== 'perdido' || !d.motivo_perda) ? (
        <details id="perder" open={perder} className="group mt-3 border-t border-[color:var(--hairline)] pt-3">
          <summary className="min-h-10 cursor-pointer py-2 text-sm text-[color:var(--color-signal-700)] underline-offset-4 hover:underline">
            {d.stage === 'perdido' ? 'Registar o motivo da perda' : 'Marcar como perdida'}
          </summary>
          <form action={marcarPerdida} className="mt-2 flex flex-col gap-3">
            <input type="hidden" name="id" value={d.id} />
            <label className="flex flex-col gap-1">
              <span className="text-xs text-[color:var(--muted)]">Motivo (obrigatório)</span>
              <select name="motivo" required defaultValue="" className={CAMPO}>
                <option value="" disabled>
                  Escolha o motivo
                </option>
                {MOTIVOS_PERDA.map((m) => (
                  <option key={m} value={m}>
                    {MOTIVO_PERDA[m]}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-[color:var(--muted)]">Nota (obrigatória com «Outro»)</span>
              <input name="nota" maxLength={500} className={CAMPO} />
            </label>
            <BotaoEnviar size="sm" aEnviar="A registar…">
              Confirmar perda
            </BotaoEnviar>
          </form>
        </details>
      ) : null}
    </section>
  );
}

function Responsavel({
  d,
  escreve,
  eu,
  equipa,
  nomes,
}: {
  d: DadosFicha;
  escreve: boolean;
  eu: string;
  equipa: PropsFicha['equipa'];
  nomes: ReadonlyMap<string, string>;
}) {
  const actual = d.owner_id ? (nomes.get(d.owner_id) ?? '(perfil removido)') : null;
  return (
    <section aria-labelledby="p-dono" className={CAIXA}>
      <h2 id="p-dono" className={H2}>
        Responsável
      </h2>
      <p className="text-sm">{actual ? (d.owner_id === eu ? `${actual} (eu)` : actual) : <span className="text-[color:var(--muted)]">Sem dono</span>}</p>
      {escreve && d.owner_id !== eu ? (
        <form action={atribuirAMim} className="mt-3">
          <input type="hidden" name="id" value={d.id} />
          <BotaoEnviar size="sm" aEnviar="A atribuir…">
            Atribuir a mim
          </BotaoEnviar>
        </form>
      ) : null}
      {escreve ? (
        <details className="mt-3 border-t border-[color:var(--hairline)] pt-2">
          <summary className="min-h-10 cursor-pointer py-2 text-sm underline-offset-4 hover:underline">Atribuir a outra pessoa</summary>
          <form action={atribuirOportunidade} className="mt-2 flex items-end gap-2">
            <input type="hidden" name="id" value={d.id} />
            <label htmlFor="owner" className="sr-only">
              Responsável
            </label>
            <select id="owner" name="owner" defaultValue={d.owner_id ?? ''} className={cn(CAMPO, 'flex-1')}>
              <option value="">Sem responsável</option>
              {equipa
                .filter((p) => p.activo)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome}
                  </option>
                ))}
            </select>
            <BotaoEnviar variant="outline" size="sm" aEnviar="…">
              Atribuir
            </BotaoEnviar>
          </form>
        </details>
      ) : null}
    </section>
  );
}

/** A data e a hora no fuso de Maputo, para preencher os campos `date` e `time`. */
function partesDe(iso: string | null): { data: string; hora: string } {
  if (!iso) return { data: '', hora: '' };
  const d = new Date(iso);
  const hora = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Maputo' });
  return { data: diaDeMaputo(d), hora };
}

function Proxima({ d, escreve, agora, fechada }: { d: DadosFicha; escreve: boolean; agora: Date; fechada: boolean }) {
  const { data, hora } = partesDe(d.next_action_at);
  return (
    <section id="proxima" aria-labelledby="p-proxima" className={cn(CAIXA, 'scroll-mt-24')}>
      <h2 id="p-proxima" className={H2}>
        Próxima acção
      </h2>
      <ProximaAccao quando={d.next_action_at} accao={d.proxima_accao} agora={agora} />
      {escreve && !fechada && d.revisao !== null ? (
        <>
          <form action={definirProximaAccao} className="mt-3 flex flex-col gap-3">
            <input type="hidden" name="id" value={d.id} />
            <input type="hidden" name="revisao" value={d.revisao} />
            <label className="flex flex-col gap-1">
              <span className="text-xs text-[color:var(--muted)]">O quê</span>
              <input name="accao" required maxLength={200} defaultValue={d.proxima_accao ?? ''} placeholder="Ligar a confirmar a reunião" className={CAMPO} />
            </label>
            <div className="grid grid-cols-[1fr_7rem] gap-2">
              <label className="flex flex-col gap-1">
                <span className="text-xs text-[color:var(--muted)]">Quando</span>
                <input type="date" name="data" required defaultValue={data} className={CAMPO} />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-[color:var(--muted)]">Hora</span>
                <input type="time" name="hora" defaultValue={hora} className={CAMPO} />
              </label>
            </div>
            <p className="text-xs text-[color:var(--muted)]">Hora de Maputo. Sem hora, fica às 09:00.</p>
            <BotaoEnviar variant="outline" size="sm" aEnviar="A guardar…">
              Guardar próxima acção
            </BotaoEnviar>
          </form>
          {d.proxima_accao ? (
            <form action={definirProximaAccao} className="mt-2">
              <input type="hidden" name="id" value={d.id} />
              <input type="hidden" name="revisao" value={d.revisao} />
              <BotaoEnviar variant="outline" size="sm" aEnviar="…">
                Retirar
              </BotaoEnviar>
            </form>
          ) : null}
        </>
      ) : null}
    </section>
  );
}

function Dados({ d, escreve }: { d: DadosFicha; escreve: boolean }) {
  const fecho = d.data_prevista_fecho
    ? new Date(`${d.data_prevista_fecho}T12:00:00Z`).toLocaleDateString('pt-PT', { timeZone: 'Africa/Maputo' })
    : null;
  return (
    <section aria-labelledby="p-dados" className={CAIXA}>
      <h2 id="p-dados" className={H2}>
        Valor e fecho
      </h2>
      <dl className="grid grid-cols-2 gap-y-1 text-sm">
        <dt className="text-[color:var(--muted)]">Valor</dt>
        <dd className="text-right">
          <Valor valor={d.valor} moeda={d.moeda} />
        </dd>
        <dt className="text-[color:var(--muted)]">Fecho previsto</dt>
        <dd className="text-right tabular-nums">{fecho ?? <span className="text-[color:var(--muted)]">—</span>}</dd>
      </dl>
      {escreve && d.revisao !== null ? (
        <details className="mt-3 border-t border-[color:var(--hairline)] pt-2">
          <summary className="min-h-10 cursor-pointer py-2 text-sm underline-offset-4 hover:underline">Editar</summary>
          <form action={guardarDados} className="mt-2 flex flex-col gap-3">
            <input type="hidden" name="id" value={d.id} />
            <input type="hidden" name="revisao" value={d.revisao} />
            <div className="grid grid-cols-[1fr_6rem] gap-2">
              <label className="flex flex-col gap-1">
                <span className="text-xs text-[color:var(--muted)]">Valor</span>
                <input name="valor" inputMode="decimal" defaultValue={d.valor ?? ''} placeholder="250000,00" className={CAMPO} />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-[color:var(--muted)]">Moeda</span>
                <select name="moeda" defaultValue={d.moeda ?? 'MZN'} className={CAMPO}>
                  {MOEDAS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-[color:var(--muted)]">Data prevista de fecho</span>
              <input type="date" name="fecho" defaultValue={d.data_prevista_fecho ?? ''} className={CAMPO} />
            </label>
            <p className="text-xs text-[color:var(--muted)]">Sem câmbio: o valor fica na moeda em que é registado. Valor vazio retira-o.</p>
            <BotaoEnviar variant="outline" size="sm" aEnviar="A guardar…">
              Guardar
            </BotaoEnviar>
          </form>
        </details>
      ) : null}
    </section>
  );
}

function Ligacoes({ d }: { d: DadosFicha }) {
  return (
    <section aria-labelledby="p-ligacoes" className={CAIXA}>
      <h2 id="p-ligacoes" className={H2}>
        Ligações
      </h2>
      <dl className="flex flex-col gap-3 text-sm">
        <div>
          <dt className={ROTULO}>Contacto</dt>
          <dd className="mt-0.5 break-words">
            {d.contacto ? (
              <Link href={`/admin/contactos/${d.contacto.id}`} className="underline">
                {d.contacto.nome}
              </Link>
            ) : (
              '—'
            )}
            {d.contacto?.email ? <span className="block text-xs text-[color:var(--muted)]">{d.contacto.email}</span> : null}
          </dd>
        </div>
        <div>
          <dt className={ROTULO}>Organização</dt>
          <dd className="mt-0.5">
            {d.organizacao ? (
              <Link href={`/admin/organizacoes/${d.organizacao.id}`} className="underline">
                {d.organizacao.nome}
              </Link>
            ) : (
              '—'
            )}
          </dd>
        </div>
        <div>
          <dt className={ROTULO}>Diagnóstico</dt>
          <dd className="mt-0.5">
            {d.diagnostico ? (
              <Link href={`/admin/diagnosticos/${d.diagnostico.id}`} className="inline-flex flex-wrap items-center gap-2 underline">
                <ClipboardCheck aria-hidden className="size-4" />
                {d.diagnostico.tier} · {d.diagnostico.score} pontos
              </Link>
            ) : (
              '—'
            )}
            {d.diagnostico ? (
              <span className="mt-1 block">
                <StateBadge rotulo={ESTADO_DIAGNOSTICO[d.diagnostico.estado as keyof typeof ESTADO_DIAGNOSTICO]} />
              </span>
            ) : null}
            {d.tier ? <span className="mt-1 block text-xs text-[color:var(--muted)]">{CLASSIFICACAO[d.tier] ?? ''}</span> : null}
          </dd>
        </div>
        <div>
          <dt className={ROTULO}>Reuniões</dt>
          <dd className="mt-0.5">
            {d.reunioes.length === 0 ? (
              <span className="text-[color:var(--muted)]">Nenhuma marcada</span>
            ) : (
              <ul role="list" className="flex flex-col gap-1">
                {d.reunioes.map((r) => (
                  <li key={r.id} className="text-xs">
                    <span className="font-medium">{TIPO_ACTIVIDADE[`reuniao_${r.estado}`] ?? r.estado}</span>
                    {r.inicio ? ` · ${formatarQuando(r.inicio)}` : ''}
                    {r.tipo ? <span className="block text-[color:var(--muted)]">{r.tipo}</span> : null}
                  </li>
                ))}
              </ul>
            )}
          </dd>
        </div>
        <div>
          <dt className={ROTULO}>Criada</dt>
          <dd className="mt-0.5">
            <DataHora valor={d.created_at} />
          </dd>
        </div>
      </dl>
    </section>
  );
}
