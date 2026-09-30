import Link from 'next/link';
import {
  BadgeCheck,
  Briefcase,
  CalendarCheck,
  CircleDashed,
  Inbox,
  Newspaper,
  PlugZap,
  Send,
  TriangleAlert,
  Users,
} from 'lucide-react';
import { DataHora, DataTable, EmptyState, StateBadge } from '@/components/admin/primitives';
import { CANAL, CLASSIFICACAO, ESTADO_DIAGNOSTICO, FASE_OPORTUNIDADE } from '@/lib/admin/labels';
import type { DadosPainel, EtapaFunil } from '@/lib/admin/painel-dados';
import { partilha, taxasDoFunil, variacao } from '@/lib/admin/painel';
import type { CartaoId } from '@/lib/forms/lead-schema';
import { ROTULO_PRIORIDADE } from '@/content/i18n/news';
import { cn } from '@/lib/utils/cn';
import { BarrasHorizontais, Bloco, ComFonte, Indicador, numero, SeletorPeriodo } from './Blocos';
import { GraficoLeads } from './GraficoLeads';

/**
 * O painel de comando: tudo o que o site, o CRM, o pixel, o News, o Cal e o
 * ERP sabem, num ecrã. Componente de servidor; o único pedaço de cliente é o
 * gráfico, por causa da dica ao passar o rato.
 */

const ETAPA: Record<EtapaFunil, string> = {
  iniciados: 'Diagnósticos iniciados',
  submetidos: 'Submetidos',
  oportunidades: 'Oportunidades criadas',
  reunioes: 'Reuniões marcadas',
  ganhos: 'Ganhos',
};

/** O nome curto de cada cartão do carrossel, para o staff. */
const CARTAO: Record<CartaoId, string> = {
  pais: 'País',
  setor: 'Sector',
  processos: 'Processos',
  dimensao: 'Dimensão',
  prazo: 'Prazo',
  papel: 'Papel',
  faixa: 'Investimento',
  impacto: 'Impacto (opcional)',
  contacto: 'Contacto',
};

const dataHoraCurta = new Intl.DateTimeFormat('pt-PT', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Africa/Maputo',
});

function Operacao({ dados }: { dados: DadosPainel }) {
  return (
    <ComFonte fonte={dados.operacao}>
      {(o) => {
        const itens = [
          {
            rotulo: 'Por rever',
            valor: o.porRever,
            href: '/admin/diagnosticos?estado=pending_review',
            icone: Inbox,
            alerta: false,
          },
          {
            rotulo: 'Na fila de envio',
            valor: o.fila,
            href: '/admin/fila',
            icone: Send,
            alerta: false,
          },
          {
            rotulo: 'Sem saída',
            valor: o.semSaida,
            href: '/admin/fila?estado=dead',
            icone: TriangleAlert,
            alerta: o.semSaida > 0,
          },
        ];
        return (
          <ul aria-label="Precisa de si agora" className="grid gap-3 sm:grid-cols-3">
            {itens.map(({ rotulo, valor, href, icone: Icone, alerta }) => (
              <li key={rotulo}>
                <Link
                  href={href}
                  className="flex min-h-11 items-center justify-between gap-3 rounded-[--radius-sm] border border-[color:var(--border)] bg-[color:var(--surface-raised)] px-4 py-3 text-sm transition-colors hover:border-[color:var(--on-surface)]"
                >
                  <span className="flex items-center gap-2">
                    <Icone
                      aria-hidden
                      className={cn(
                        'size-4',
                        alerta ? 'text-dado-negativo' : 'text-[color:var(--muted)]',
                      )}
                    />
                    {rotulo}
                    {alerta && <span className="sr-only"> (requer atenção)</span>}
                  </span>
                  <span className="font-semibold tabular-nums">{numero(valor)}</span>
                </Link>
              </li>
            ))}
          </ul>
        );
      }}
    </ComFonte>
  );
}

function Indicadores({ dados }: { dados: DadosPainel }) {
  const p = dados.periodo;
  return (
    <ul
      aria-label="Indicadores do período"
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5"
    >
      <li>
        <Indicador
          icone={Users}
          rotulo="Leads"
          fonte={dados.leads}
          valor={(d) => numero(d.actual)}
          variacao={(d) => variacao(d.actual, d.anterior)}
          periodo={p}
          href="/admin/contactos"
        />
      </li>
      <li>
        <Indicador
          icone={BadgeCheck}
          rotulo="Qualidade A+B"
          fonte={dados.qualidade}
          valor={(d) => {
            const s = partilha(d.ab, d.total);
            return s === null ? '—' : `${s} %`;
          }}
          variacao={(d) => {
            const a = partilha(d.ab, d.total);
            const b = partilha(d.abAnterior, d.totalAnterior);
            return a === null || b === null ? null : variacao(a, b);
          }}
          nota={(d) => `${numero(d.ab)} de ${numero(d.total)} diagnósticos`}
          periodo={p}
          href="/admin/diagnosticos"
        />
      </li>
      <li>
        <Indicador
          icone={Briefcase}
          rotulo="Oportunidades abertas"
          fonte={dados.crm}
          valor={(d) =>
            numero(
              d.porFase
                .filter((f) => f.chave !== 'ganho' && f.chave !== 'perdido')
                .reduce((a, f) => a + f.valor, 0),
            )
          }
          nota={(d) => `${numero(d.ganhos)} ganhas no período (antes: ${numero(d.ganhosAnterior)})`}
          periodo={p}
          href="/admin/oportunidades"
        />
      </li>
      <li>
        <Indicador
          icone={CalendarCheck}
          rotulo="Reuniões marcadas"
          fonte={dados.reunioes}
          valor={(d) => numero(d.marcadas)}
          variacao={(d) => variacao(d.marcadas, d.marcadasAnterior)}
          nota={(d) => `${numero(d.realizadas)} realizadas`}
          periodo={p}
        />
      </li>
      <li>
        <Indicador
          icone={Newspaper}
          rotulo="Análises Moz News"
          fonte={dados.news}
          valor={(d) => numero(d.analisadas)}
          variacao={(d) => variacao(d.analisadas, d.anterior)}
          nota={(d) => (d.falhadas > 0 ? `${numero(d.falhadas)} falharam` : null)}
          periodo={p}
        />
      </li>
    </ul>
  );
}

function Funil({ dados }: { dados: DadosPainel }) {
  return (
    <Bloco
      id="painel-funil"
      titulo="Funil de aquisição"
      subtitulo="Do primeiro cartão ao negócio ganho, no período."
    >
      <ComFonte fonte={dados.funil}>
        {({ etapas }) => {
          const taxas = taxasDoFunil(etapas.map((e) => e.valor));
          return (
            <BarrasHorizontais
              legenda="Funil de aquisição"
              maximo={etapas[0]?.valor}
              linhas={etapas.map((e, i) => ({
                chave: e.chave,
                rotulo: ETAPA[e.chave],
                valor: e.valor,
                nota: taxas[i] === null ? undefined : `${taxas[i]} % da anterior`,
              }))}
            />
          );
        }}
      </ComFonte>
    </Bloco>
  );
}

function Desistencias({ dados }: { dados: DadosPainel }) {
  return (
    <Bloco
      id="painel-cartoes"
      titulo="Onde desistem"
      subtitulo="Por cartão do diagnóstico: quantos o viram e quantos avançaram."
    >
      <ComFonte fonte={dados.cartoes}>
        {({ vistos, concluidos }) => (
          <>
            <div
              role="region"
              aria-label="Tabela de avanço por cartão"
              tabIndex={0}
              className="overflow-x-auto rounded-[--radius-xs] outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--on-surface)]"
            >
              <table className="w-full min-w-[20rem] text-left text-sm tabular-nums">
                <caption className="sr-only">
                  Cartões vistos e concluídos, com a taxa de avanço
                </caption>
                <thead>
                  <tr className="border-b border-[color:var(--hairline)] text-xs text-[color:var(--muted)]">
                    <th scope="col" className="py-2 font-medium">
                      Cartão
                    </th>
                    <th scope="col" className="py-2 text-right font-medium">
                      Viram
                    </th>
                    <th scope="col" className="py-2 text-right font-medium">
                      Avançaram
                    </th>
                    <th scope="col" className="w-[40%] py-2 pl-4 font-medium">
                      Taxa de avanço
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {vistos.map((v, i) => {
                    const feitos = concluidos[i]?.valor ?? 0;
                    const taxa = partilha(feitos, v.valor);
                    return (
                      <tr
                        key={v.chave}
                        className="border-b border-[color:var(--hairline)] last:border-0"
                      >
                        <th scope="row" className="py-2 font-normal">
                          {CARTAO[v.chave]}
                        </th>
                        <td className="py-2 text-right">{numero(v.valor)}</td>
                        <td className="py-2 text-right">{numero(feitos)}</td>
                        <td className="py-2 pl-4">
                          {taxa === null ? (
                            <span className="text-[color:var(--muted)]">—</span>
                          ) : (
                            <span className="flex items-center gap-2">
                              <span
                                aria-hidden
                                className="relative h-2 flex-1 overflow-hidden rounded-full bg-[color:var(--surface)]"
                              >
                                <span
                                  className="absolute inset-y-0 left-0 rounded-full bg-dado"
                                  style={{ width: `${Math.min(100, taxa)}%` }}
                                />
                              </span>
                              <span className="w-10 text-right">{taxa} %</span>
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </ComFonte>
    </Bloco>
  );
}

function Recentes({ dados }: { dados: DadosPainel }) {
  return (
    <Bloco
      id="painel-recentes"
      titulo="Últimas submissões"
      className="lg:col-span-2"
      accao={
        <Link href="/admin/contactos" className="text-sm underline underline-offset-4">
          Ver todas
        </Link>
      }
    >
      <ComFonte fonte={dados.recentes}>
        {(linhas) => (
          <DataTable
            legenda="As submissões mais recentes"
            linhas={linhas}
            chaveDe={(l) => l.id}
            vazio={
              <EmptyState
                titulo="Ainda não chegou nenhuma submissão."
                descricao="Assim que alguém completar o diagnóstico no site, aparece aqui."
              />
            }
            colunas={[
              {
                chave: 'quando',
                cabecalho: 'Quando',
                render: (l) => <DataHora valor={l.submitted_at} />,
              },
              {
                chave: 'quem',
                cabecalho: 'Quem',
                render: (l) => (
                  <>
                    <span className="block">{l.contacts?.name ?? '—'}</span>
                    <span className="block text-xs text-[color:var(--muted)]">
                      {l.contacts?.email ?? ''}
                    </span>
                  </>
                ),
              },
              {
                chave: 'estado',
                cabecalho: 'Estado',
                render: (l) => {
                  const d = l.diagnostics?.[0];
                  return d ? (
                    <StateBadge
                      rotulo={ESTADO_DIAGNOSTICO[d.state as keyof typeof ESTADO_DIAGNOSTICO]}
                    />
                  ) : (
                    '—'
                  );
                },
              },
              {
                chave: 'classificacao',
                cabecalho: 'Classificação',
                render: (l) => {
                  const d = l.diagnostics?.[0];
                  return d ? (
                    <span title={CLASSIFICACAO[d.tier]}>
                      {d.tier} · {d.score}
                    </span>
                  ) : (
                    '—'
                  );
                },
              },
              {
                chave: 'accao',
                cabecalho: '',
                render: (l) => {
                  const d = l.diagnostics?.[0];
                  return d ? (
                    <Link href={`/admin/diagnosticos/${d.id}`} className="text-sm underline">
                      Abrir
                    </Link>
                  ) : null;
                },
              },
            ]}
          />
        )}
      </ComFonte>
    </Bloco>
  );
}

function Reunioes({ dados }: { dados: DadosPainel }) {
  return (
    <Bloco
      id="painel-reunioes"
      titulo="Próximas reuniões"
      subtitulo="Marcadas pelo Cal.com, hora de Maputo."
    >
      <ComFonte fonte={dados.reunioes}>
        {({ proximas }) =>
          proximas.length === 0 ? (
            <p className="text-sm text-[color:var(--muted)]">Nenhuma reunião marcada por vir.</p>
          ) : (
            <ul className="grid gap-2">
              {proximas.map((r, i) => (
                <li
                  key={`${r.inicio}-${i}`}
                  className="flex items-center justify-between gap-3 rounded-[--radius-xs] border border-[color:var(--hairline)] px-3 py-2 text-sm"
                >
                  <span className="flex items-center gap-2">
                    <CalendarCheck aria-hidden className="size-4 text-[color:var(--muted)]" />
                    <time dateTime={r.inicio}>{dataHoraCurta.format(new Date(r.inicio))}</time>
                  </span>
                  {r.dealId ? (
                    <Link
                      href={`/admin/oportunidades/${r.dealId}`}
                      className="text-xs underline underline-offset-4"
                    >
                      {r.tipo ?? 'Oportunidade'}
                    </Link>
                  ) : (
                    <span className="text-xs text-[color:var(--muted)]">{r.tipo ?? '—'}</span>
                  )}
                </li>
              ))}
            </ul>
          )
        }
      </ComFonte>
    </Bloco>
  );
}

function Erp({ dados }: { dados: DadosPainel }) {
  const configurado = dados.erp.estado === 'configurado-sem-adaptador';
  return (
    <Bloco
      id="painel-erp"
      titulo="ERP"
      subtitulo="Onde as oportunidades ganhas seguem para facturação."
    >
      <div className="flex items-start gap-3 rounded-[--radius-xs] border border-dashed border-[color:var(--hairline)] p-4 text-sm">
        {configurado ? (
          <PlugZap aria-hidden className="mt-0.5 size-4 shrink-0 text-[color:var(--muted)]" />
        ) : (
          <CircleDashed aria-hidden className="mt-0.5 size-4 shrink-0 text-[color:var(--muted)]" />
        )}
        <p>
          <span className="font-medium">
            {configurado ? 'Configurado, sem adaptador.' : 'Por ligar.'}
          </span>{' '}
          <span className="text-[color:var(--muted)]">
            {configurado
              ? 'As variáveis estão definidas, mas falta o adaptador do sistema escolhido. Nada é enviado.'
              : 'A porta está preparada; falta escolher o ERP. Ver docs/ERP.md.'}
          </span>
        </p>
      </div>
    </Bloco>
  );
}

export function PainelComando({ dados }: { dados: DadosPainel }) {
  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[length:var(--text-h3)] tracking-[-0.02em]">Painel</h1>
          <p className="mt-1 text-sm text-[color:var(--muted)]">
            Últimos {dados.periodo} dias (hoje incluído, hora de Maputo), comparados com os
            {dados.periodo} anteriores.
          </p>
        </div>
        <SeletorPeriodo actual={dados.periodo} />
      </div>

      <Operacao dados={dados} />
      <Indicadores dados={dados} />

      <div className="grid gap-6 lg:grid-cols-3">
        <Bloco
          id="painel-leads"
          titulo="Leads por dia"
          subtitulo="Submissões do diagnóstico, por dia."
          className="lg:col-span-2"
        >
          <ComFonte fonte={dados.leads}>
            {(d) => (
              <GraficoLeads serie={d.serie} serieAnterior={d.serieAnterior} inicio={dados.inicio} />
            )}
          </ComFonte>
        </Bloco>
        <Bloco
          id="painel-crm"
          titulo="CRM por fase"
          subtitulo="Todas as oportunidades, agora."
          accao={
            <Link href="/admin/oportunidades" className="text-sm underline underline-offset-4">
              Abrir
            </Link>
          }
        >
          <ComFonte fonte={dados.crm}>
            {({ porFase }) => (
              <BarrasHorizontais
                legenda="Oportunidades por fase"
                linhas={porFase.map((f) => ({
                  chave: f.chave,
                  rotulo: FASE_OPORTUNIDADE[f.chave].texto,
                  valor: f.valor,
                }))}
              />
            )}
          </ComFonte>
        </Bloco>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Funil dados={dados} />
        <Bloco
          id="painel-canais"
          titulo="Canais de aquisição"
          subtitulo="De onde vieram as submissões do período."
        >
          <ComFonte fonte={dados.canais}>
            {(canais) => (
              <BarrasHorizontais
                legenda="Submissões por canal"
                linhas={[...canais]
                  .sort((a, b) => b.valor - a.valor)
                  .map((c) => ({ chave: c.chave, rotulo: CANAL[c.chave].texto, valor: c.valor }))}
              />
            )}
          </ComFonte>
        </Bloco>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Desistencias dados={dados} />
        <Bloco
          id="painel-news"
          titulo="Moz News por prioridade"
          subtitulo="Análises feitas no período."
        >
          <ComFonte fonte={dados.news}>
            {({ porPrioridade }) => (
              <BarrasHorizontais
                legenda="Análises por prioridade"
                linhas={porPrioridade.map((p) => ({
                  chave: p.chave,
                  rotulo: ROTULO_PRIORIDADE[p.chave].pt,
                  valor: p.valor,
                }))}
              />
            )}
          </ComFonte>
        </Bloco>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Recentes dados={dados} />
        <div className="grid content-start gap-6">
          <Reunioes dados={dados} />
          <Erp dados={dados} />
        </div>
      </div>
    </div>
  );
}
