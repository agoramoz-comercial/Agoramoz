import Link from 'next/link';
import { Briefcase, ClipboardCheck, FileCheck2, StickyNote } from 'lucide-react';
import { EmptyState, StateBadge } from '@/components/admin/primitives';
import { FASE_OPORTUNIDADE, type FaseOportunidade, type Rotulo } from '@/lib/admin/labels';
import { formatarQuando } from '@/lib/crm/cronologia';
import { rotuloFinalidade, type ConsentimentoActual, type Evento, type OportunidadeLigada, type RegistoConsentimento, type TipoEvento } from '@/lib/crm/ficha360';

export type { OportunidadeLigada };
import { FASES_FECHADAS, formatarValor } from '@/lib/crm/modelo';
import { totaisPorMoeda } from '@/lib/crm/pipeline';
import { cn } from '@/lib/utils/cn';
import { ProximaAccao, ROTULO, Valor } from './partes';

/**
 * As peças das fichas 360 (contacto e organização), à maneira de um «object
 * view»: resumo em números, objectos ligados, o estado do consentimento e uma
 * só linha temporal com tudo o que aconteceu.
 */


const H2 = 'mb-3 text-sm font-medium';

export function Resumo360({
  oportunidades,
  ultima,
  activo,
}: {
  oportunidades: readonly OportunidadeLigada[];
  ultima: string | null;
  activo: boolean;
}) {
  const abertas = oportunidades.filter((o) => !(FASES_FECHADAS as readonly string[]).includes(o.stage));
  const ganhas = oportunidades.filter((o) => o.stage === 'ganho').length;
  const totais = totaisPorMoeda(abertas);
  const celulas: { rotulo: string; valor: React.ReactNode }[] = [
    { rotulo: 'Oportunidades abertas', valor: abertas.length },
    { rotulo: 'Ganhas', valor: ganhas },
    {
      rotulo: 'Valor em aberto',
      valor: !activo ? '—' : totais.length === 0 ? '—' : totais.map((t) => formatarValor(t.total, t.moeda)).join(' · '),
    },
    { rotulo: 'Última actividade', valor: ultima ? formatarQuando(ultima) : '—' },
  ];
  return (
    <dl className="mb-8 grid grid-cols-2 gap-px border border-[color:var(--border)] bg-[color:var(--border)] lg:grid-cols-4">
      {celulas.map((c) => (
        <div key={c.rotulo} className="flex flex-col gap-1 bg-[color:var(--surface)] px-4 py-3">
          <dt className={ROTULO}>{c.rotulo}</dt>
          <dd className="text-lg leading-tight tabular-nums">{c.valor}</dd>
        </div>
      ))}
    </dl>
  );
}

export function OportunidadesLigadas({
  itens,
  nomes,
  agora,
  activo,
  mostrarContacto = false,
}: {
  itens: readonly OportunidadeLigada[];
  nomes: ReadonlyMap<string, string>;
  agora: Date;
  activo: boolean;
  mostrarContacto?: boolean;
}) {
  return (
    <section aria-labelledby="ligadas">
      <h2 id="ligadas" className={H2}>
        Oportunidades <span className="tabular-nums text-[color:var(--muted)]">{itens.length}</span>
      </h2>
      {itens.length === 0 ? (
        <EmptyState titulo="Sem oportunidades." />
      ) : (
        <ul role="list" className="divide-y divide-[color:var(--hairline)] border border-[color:var(--border)] bg-[color:var(--surface-raised)]">
          {itens.map((o) => (
            <li key={o.id} className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 px-4 py-3 text-sm">
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2">
                  <Link href={`/admin/oportunidades/${o.id}`} data-atalho-linha className="font-medium underline-offset-4 hover:underline">
                    {mostrarContacto && o.contacto ? o.contacto : `Oportunidade de ${formatarQuando(o.created_at).split(' · ')[0]}`}
                  </Link>
                  <StateBadge rotulo={FASE_OPORTUNIDADE[o.stage as FaseOportunidade]} />
                </p>
                <p className="mt-0.5 text-xs text-[color:var(--muted)]">
                  {o.owner_id ? `Responsável: ${nomes.get(o.owner_id) ?? '(perfil removido)'}` : 'Sem dono'}
                </p>
                {activo && !(FASES_FECHADAS as readonly string[]).includes(o.stage) ? (
                  <div className="mt-1.5">
                    <ProximaAccao quando={o.next_action_at} accao={o.proxima_accao} agora={agora} />
                  </div>
                ) : null}
              </div>
              <Valor valor={o.valor} moeda={o.moeda} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

const ESTADO: Readonly<Record<ConsentimentoActual['estado'], Rotulo>> = {
  concedido: { texto: 'Concedido', tom: 'bom' },
  retirado: { texto: 'Retirado', tom: 'mau' },
  recusado: { texto: 'Recusado', tom: 'aviso' },
};

/** O estado actual por finalidade e, por baixo, o texto exacto que a pessoa leu. */
export function Consentimento({ actuais, registos }: { actuais: readonly ConsentimentoActual[]; registos: readonly RegistoConsentimento[] }) {
  return (
    <section aria-labelledby="consentimento" className="border border-[color:var(--border)] p-4">
      <h2 id="consentimento" className={H2}>
        Consentimento
      </h2>
      {actuais.length === 0 ? (
        <p className="text-sm text-[color:var(--muted)]">Sem registos. Não há base para contactos de marketing.</p>
      ) : (
        <ul role="list" className="flex flex-col gap-2">
          {actuais.map((c) => (
            <li key={c.finalidade} className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className="min-w-0 break-words">{rotuloFinalidade(c.finalidade)}</span>
              <span className="flex items-center gap-2">
                <StateBadge rotulo={ESTADO[c.estado]} />
                <span className="text-xs text-[color:var(--muted)] tabular-nums">desde {formatarQuando(c.desde).split(' · ')[0]}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
      {registos.length > 0 ? (
        <details className="mt-3 border-t border-[color:var(--hairline)] pt-2">
          <summary className="min-h-10 cursor-pointer py-2 text-sm underline-offset-4 hover:underline">
            Textos aceites ({registos.length})
          </summary>
          <ul role="list" className="mt-2 flex flex-col gap-3">
            {registos.map((r) => (
              <li key={r.id} className="text-xs">
                <p className="text-[color:var(--muted)]">
                  {rotuloFinalidade(r.purpose)} · {r.consent_version} · {formatarQuando(r.captured_at)}
                  {r.withdrawn_at ? ` · retirado ${formatarQuando(r.withdrawn_at)}` : ''}
                </p>
                <blockquote className="mt-1 border-l-2 border-[color:var(--border)] pl-3 whitespace-pre-wrap">{r.consent_text}</blockquote>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </section>
  );
}

const ICONE: Readonly<Record<TipoEvento, typeof StickyNote>> = {
  actividade: StickyNote,
  resposta: ClipboardCheck,
  consentimento: FileCheck2,
  oportunidade: Briefcase,
};

export function LinhaTemporal({ eventos }: { eventos: readonly Evento[] }) {
  return (
    <section aria-labelledby="linha-temporal">
      <h2 id="linha-temporal" className="mb-4 text-[length:var(--text-h3)] tracking-[-0.02em]">
        Linha temporal
      </h2>
      {eventos.length === 0 ? (
        <EmptyState titulo="Ainda não aconteceu nada." />
      ) : (
        <ol role="list" className="flex flex-col">
          {eventos.map((e) => {
            const Icone = ICONE[e.tipo];
            return (
              <li key={e.id} className="relative border-l border-[color:var(--border)] pb-5 pl-5 last:pb-0">
                <span aria-hidden className="absolute top-1.5 -left-[5px] size-[9px] rounded-full border border-[color:var(--border)] bg-[color:var(--surface)]" />
                <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                  <Icone aria-hidden className="size-4 text-[color:var(--muted)]" />
                  {e.href ? (
                    <Link href={e.href} className="underline-offset-4 hover:underline">
                      {e.titulo}
                    </Link>
                  ) : (
                    e.titulo
                  )}
                </p>
                <p className={cn('mt-0.5 text-xs text-[color:var(--muted)]')}>
                  <time dateTime={e.quando} className="tabular-nums">
                    {formatarQuando(e.quando)}
                  </time>
                  {e.contexto ? ` · ${e.contexto}` : ''}
                </p>
                {e.detalhe ? <p className="mt-1 max-w-[65ch] text-sm whitespace-pre-wrap">{e.detalhe}</p> : null}
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
