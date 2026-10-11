import Link from 'next/link';
import { BotaoEnviar } from '@/components/admin/BotaoEnviar';
import { GuardaRascunho } from '@/components/admin/espaco/GuardaRascunho';
import { CAIXA, H2, Rolavel } from '@/components/admin/espaco/partes';
import { AdminHeading, EmptyState, StateBadge } from '@/components/admin/primitives';
import { buttonVariants } from '@/components/ui/Button';
import {
  guardarDecisao,
  guardarMovimento,
  guardarProjeto,
  removerAlocacao,
} from '@/lib/admin/gabinete-actions';
import {
  caixaPorMoeda,
  capacidade,
  CHAPEUS,
  DECISAO_ABERTA,
  decisaoAtrasada,
  ESTADOS_DECISAO,
  estadoMovimento,
  FASES_PROJETO,
  formatarValor,
  margemPercentual,
  percentagem,
  podeEntrarEm,
  projetoActivo,
  RISCOS,
  TIPOS_MOVIMENTO,
  TIPOS_PRIORIDADE,
  type Alocacao,
  type Decisao,
  type EstadoDecisao,
  type Movimento,
  type Pessoa,
  type Prioridade,
  type Projeto,
  type TipoPrioridade,
} from '@/lib/gabinete/modelo';
import {
  CamposDecisao,
  CamposProjeto,
  dataCurta,
  FormAlocacao,
  FormMovimento,
  FormPessoa,
  FormPrioridade,
  GabineteNav,
} from './partes';

/**
 * Os cinco registos do gabinete — decisões, prioridades, projectos,
 * tesouraria e capacidade. Recebem os dados (as páginas lêem a base; a
 * pré-visualização de QA passa exemplos) e desenham lista + formulários.
 */

const TABELA = 'w-full min-w-[40rem] border-collapse text-left text-sm';
const TH = 'border-b border-[color:var(--border)] px-3 py-2 font-medium';
const TD = 'border-b border-[color:var(--hairline)] px-3 py-2 align-top';
const TDN = `${TD} text-right tabular-nums`;
const NOTA = 'text-sm text-[color:var(--muted)]';

const horas = (n: number) => `${new Intl.NumberFormat('pt-PT', { maximumFractionDigits: 1 }).format(n)} h`;

// ── Decisões ──────────────────────────────────────────────────────────────────

const GRUPOS: readonly EstadoDecisao[] = [...DECISAO_ABERTA, 'eliminar', 'decidida'];

export function DecisoesVista({ decisoes, hoje }: { decisoes: readonly Decisao[]; hoje: string }) {
  return (
    <>
      <AdminHeading
        titulo="Decisões"
        descricao="Cada decisão indica o chapéu responsável, quem é consultado, o indicador afectado e a data de revisão."
        accao={
          <Link href="/admin/gabinete/decisoes/nova" className={buttonVariants({ size: 'sm' })}>
            Nova decisão
          </Link>
        }
      />
      <GabineteNav activo="decisoes" />
      {decisoes.length === 0 ? (
        <EmptyState
          titulo="Ainda sem decisões registadas"
          descricao="Semana 1 do plano: listar as decisões que dependem de si. Registe cada uma e classifique: exige decisão sua, pode ser delegada, precisa de informação, aguarda decisão externa ou deve ser eliminada."
        />
      ) : (
        <div className="grid gap-8">
          {GRUPOS.map((estado) => {
            const lista = decisoes.filter((d) => d.estado === estado);
            if (lista.length === 0) return null;
            const id = `grupo-${estado}`;
            return (
              <section key={estado} aria-labelledby={id} className="grid gap-3">
                <h2 id={id} className={H2}>
                  {ESTADOS_DECISAO[estado]} <span className="text-[color:var(--muted)] tabular-nums">({lista.length})</span>
                </h2>
                <ul className="grid gap-2">
                  {lista.slice(0, estado === 'decidida' ? 20 : undefined).map((d) => (
                    <li
                      key={d.id}
                      className="grid gap-1 border-b border-[color:var(--hairline)] pb-2 text-sm sm:grid-cols-[1fr_auto] sm:items-baseline sm:gap-4"
                    >
                      <span className="flex flex-wrap items-center gap-2">
                        <Link href={`/admin/gabinete/decisoes/${d.id}`} className="font-medium underline">
                          {d.titulo}
                        </Link>
                        <StateBadge rotulo={{ texto: CHAPEUS[d.chapeu].texto, tom: 'neutro' }} />
                        {d.recorrente && <StateBadge rotulo={{ texto: 'Recorrente', tom: 'espera' }} />}
                        {decisaoAtrasada(d, hoje) && <StateBadge rotulo={{ texto: 'Revisão em atraso', tom: 'mau' }} />}
                      </span>
                      <span className="text-[color:var(--muted)] tabular-nums">
                        {estado === 'decidida'
                          ? `${d.quem_decidiu === 'delegada' ? 'Delegada' : 'Fundador'} · ${dataCurta(d.decidida_em)}`
                          : `${d.responsavel ?? 'Sem responsável'} · ${dataCurta(d.data_revisao)}`}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}

/** Criar (sem `v`) ou editar uma decisão. */
export function FormDecisao({ v }: { v?: Decisao }) {
  return (
    <form action={guardarDecisao} className={CAIXA} aria-labelledby="form-decisao">
      <h2 id="form-decisao" className={H2}>
        {v ? 'Registo da decisão' : 'Nova decisão'}
      </h2>
      <GuardaRascunho espaco="gabinete" chave={v ? `decisao-${v.id}` : 'decisao-nova'} />
      {v && <input type="hidden" name="id" value={v.id} />}
      {v && <input type="hidden" name="revisao" value={v.revisao} />}
      <CamposDecisao v={v} />
      <div>
        <BotaoEnviar size="sm" aEnviar="A guardar…">
          {v ? 'Guardar decisão' : 'Registar decisão'}
        </BotaoEnviar>
      </div>
    </form>
  );
}

// ── Prioridades ───────────────────────────────────────────────────────────────

function trimestreVizinho(t: string, delta: -1 | 1): string {
  const [a, q] = t.split('-T').map(Number);
  const i = (a ?? 2026) * 4 + ((q ?? 1) - 1) + delta;
  return `${Math.floor(i / 4)}-T${(i % 4) + 1}`;
}

export function PrioridadesVista({ trimestre, prioridades }: { trimestre: string; prioridades: readonly Prioridade[] }) {
  const tipos = Object.keys(TIPOS_PRIORIDADE) as TipoPrioridade[];
  return (
    <>
      <AdminHeading
        titulo={`Prioridades — ${trimestre}`}
        descricao="No máximo cinco: uma empresarial, uma comercial, uma operacional, uma tecnológica e uma de liderança pessoal. Cinco resultados que organizam as tarefas, não cinco tarefas."
      />
      <GabineteNav activo="prioridades" />
      <nav aria-label="Trimestre" className="mb-6 flex flex-wrap gap-4 text-sm">
        <Link href={`/admin/gabinete/prioridades?trimestre=${trimestreVizinho(trimestre, -1)}`} className="min-h-11 py-3 underline">
          ← {trimestreVizinho(trimestre, -1)}
        </Link>
        <Link href={`/admin/gabinete/prioridades?trimestre=${trimestreVizinho(trimestre, 1)}`} className="min-h-11 py-3 underline">
          {trimestreVizinho(trimestre, 1)} →
        </Link>
      </nav>
      <div className="grid gap-6">
        {tipos.map((t) => (
          <FormPrioridade key={t} trimestre={trimestre} tipo={t} v={prioridades.find((p) => p.trimestre === trimestre && p.tipo === t)} />
        ))}
      </div>
    </>
  );
}

// ── Projectos ─────────────────────────────────────────────────────────────────

export function ProjetosVista({ projetos }: { projetos: readonly Projeto[] }) {
  return (
    <>
      <AdminHeading
        titulo="Projectos"
        descricao="Portfólio no ciclo público: diagnóstico, arquitectura, protótipo, implementação, activação e evolução. Cada projecto activo tem responsável, escopo, próxima acção e data."
        accao={
          <Link href="/admin/gabinete/projetos/novo" className={buttonVariants({ size: 'sm' })}>
            Novo projecto
          </Link>
        }
      />
      <GabineteNav activo="projetos" />
      {projetos.length === 0 ? (
        <EmptyState titulo="Ainda sem projectos registados" descricao="Registe os projectos activos: responsável, escopo, fase, próxima acção e data." />
      ) : (
        <Rolavel rotulo="Lista de projectos">
          <table className={TABELA}>
            <caption className="sr-only">Projectos</caption>
            <thead>
              <tr>
                <th scope="col" className={TH}>Projecto</th>
                <th scope="col" className={TH}>Fase</th>
                <th scope="col" className={TH}>Risco</th>
                <th scope="col" className={TH}>Próxima acção</th>
                <th scope="col" className={`${TH} text-right`}>Margem</th>
              </tr>
            </thead>
            <tbody>
              {projetos.map((p) => (
                <tr key={p.id}>
                  <td className={TD}>
                    <Link href={`/admin/gabinete/projetos/${p.id}`} className="font-medium underline">
                      {p.nome}
                    </Link>
                    <span className="block text-xs text-[color:var(--muted)]">
                      {p.cliente ?? 'Sem cliente'} · {p.responsavel ?? 'sem responsável'}
                    </span>
                  </td>
                  <td className={TD}>{FASES_PROJETO[p.fase]}</td>
                  <td className={TD}>
                    <StateBadge rotulo={RISCOS[p.risco]} />
                  </td>
                  <td className={TD}>
                    {projetoActivo(p.fase) ? (
                      <>
                        {p.proxima_accao ?? '—'}
                        <span className="block text-xs text-[color:var(--muted)] tabular-nums">{dataCurta(p.proxima_data)}</span>
                      </>
                    ) : (
                      <span className="text-[color:var(--muted)]">—</span>
                    )}
                  </td>
                  <td className={TDN}>{percentagem(margemPercentual(p))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Rolavel>
      )}
    </>
  );
}

/** Criar (sem `v`) ou editar um projecto; com `v`, também as alocações. */
export function FichaProjeto({
  v,
  pessoas = [],
  alocacoes = [],
}: {
  v?: Projeto;
  pessoas?: readonly Pessoa[];
  alocacoes?: readonly Alocacao[];
}) {
  const gate = v ? podeEntrarEm('implementacao', v) : null;
  const daqui = alocacoes.filter((a) => v && a.projeto_id === v.id);
  const nomeDe = new Map(pessoas.map((p) => [p.id, p.nome]));
  return (
    <div className="grid gap-8">
      {v && gate && !gate.ok && projetoActivo(v.fase) && ['diagnostico', 'arquitetura', 'prototipo'].includes(v.fase) && (
        <p role="note" className="border border-[color:var(--border)] px-4 py-3 text-sm">
          {gate.motivo}
        </p>
      )}
      <form action={guardarProjeto} className={CAIXA} aria-labelledby="form-projeto">
        <h2 id="form-projeto" className={H2}>
          {v ? 'Ficha do projecto' : 'Novo projecto'}
        </h2>
        <GuardaRascunho espaco="gabinete" chave={v ? `projeto-${v.id}` : 'projeto-novo'} />
        {v && <input type="hidden" name="id" value={v.id} />}
        {v && <input type="hidden" name="revisao" value={v.revisao} />}
        <CamposProjeto v={v} />
        {v && v.margem_bruta !== null && (
          <p className={NOTA}>
            Margem bruta: <span className="font-medium tabular-nums">{formatarValor(v.margem_bruta, v.moeda)}</span> (
            {percentagem(margemPercentual(v))} da receita contratada).
          </p>
        )}
        <div>
          <BotaoEnviar size="sm" aEnviar="A guardar…">
            {v ? 'Guardar projecto' : 'Registar projecto'}
          </BotaoEnviar>
        </div>
      </form>

      {v && (
        <section aria-labelledby="alocacoes" className="grid gap-4">
          <h2 id="alocacoes" className={H2}>
            Capacidade alocada
          </h2>
          {daqui.length === 0 ? (
            <p className={NOTA}>Nenhuma pessoa alocada a este projecto.</p>
          ) : (
            <ul className="grid gap-2 text-sm">
              {daqui.map((a) => (
                <li key={a.pessoa_id} className="flex flex-wrap items-center justify-between gap-3 border-b border-[color:var(--hairline)] pb-2">
                  <span>
                    {nomeDe.get(a.pessoa_id) ?? 'Pessoa'} · <span className="tabular-nums">{horas(a.horas_semana)}</span> por semana
                    {a.ate ? ` até ${dataCurta(a.ate)}` : ''}
                  </span>
                  <form action={removerAlocacao}>
                    <input type="hidden" name="pessoa" value={a.pessoa_id} />
                    <input type="hidden" name="projeto" value={a.projeto_id} />
                    <input type="hidden" name="voltar" value={`/admin/gabinete/projetos/${v.id}`} />
                    <BotaoEnviar size="sm" variant="outline" aEnviar="A remover…">
                      Remover<span className="sr-only"> a alocação de {nomeDe.get(a.pessoa_id) ?? 'esta pessoa'}</span>
                    </BotaoEnviar>
                  </form>
                </li>
              ))}
            </ul>
          )}
          {pessoas.some((p) => p.activa) ? (
            <FormAlocacao
              pessoas={pessoas.filter((p) => p.activa)}
              projetos={[v]}
              voltar={`/admin/gabinete/projetos/${v.id}`}
              projetoFixo={v.id}
            />
          ) : (
            <p className={NOTA}>
              Para alocar, registe primeiro as pessoas em <Link href="/admin/gabinete/capacidade" className="underline">Capacidade</Link>.
            </p>
          )}
        </section>
      )}
    </div>
  );
}

// ── Tesouraria ────────────────────────────────────────────────────────────────

const TOM_MOVIMENTO = {
  realizado: { texto: 'Realizado', tom: 'bom' },
  previsto: { texto: 'Previsto', tom: 'espera' },
  vencido: { texto: 'Vencido', tom: 'mau' },
} as const;

export function TesourariaVista({
  movimentos,
  projetos,
  hoje,
}: {
  movimentos: readonly Movimento[];
  projetos: readonly Pick<Projeto, 'id' | 'nome'>[];
  hoje: string;
}) {
  const caixa = caixaPorMoeda(movimentos);
  const nomeDe = new Map(projetos.map((p) => [p.id, p.nome]));
  return (
    <>
      <AdminHeading
        titulo="Tesouraria"
        descricao="Caixa, recebimentos e pagamentos. Um saldo é uma fotografia numa data; o resto é previsto até ter data efectiva."
      />
      <GabineteNav activo="tesouraria" />
      <div className="grid gap-8">
        <section aria-labelledby="caixa-agora" className="grid gap-3">
          <h2 id="caixa-agora" className={H2}>
            Caixa
          </h2>
          {caixa.length === 0 ? (
            <p className={NOTA}>Sem saldo de partida: registe um movimento do tipo «Saldo».</p>
          ) : (
            <ul className="flex flex-wrap gap-6">
              {caixa.map((c) => (
                <li key={c.moeda}>
                  <span className="font-[family-name:var(--font-display)] text-[1.5rem] font-semibold tabular-nums">
                    {formatarValor(c.valor, c.moeda)}
                  </span>
                  <span className="block text-xs text-[color:var(--muted)]">desde o saldo de {dataCurta(c.desde)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <FormMovimento projetos={projetos} hoje={hoje} />

        <section aria-labelledby="movimentos" className="grid gap-3">
          <h2 id="movimentos" className={H2}>
            Movimentos
          </h2>
          {movimentos.length === 0 ? (
            <p className={NOTA}>Ainda sem movimentos.</p>
          ) : (
            <Rolavel rotulo="Movimentos de tesouraria">
              <table className={TABELA}>
                <caption className="sr-only">Movimentos de tesouraria, mais recentes primeiro</caption>
                <thead>
                  <tr>
                    <th scope="col" className={TH}>Data</th>
                    <th scope="col" className={TH}>Movimento</th>
                    <th scope="col" className={`${TH} text-right`}>Valor</th>
                    <th scope="col" className={TH}>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {movimentos.map((m) => {
                    const estado = estadoMovimento(m, hoje);
                    return (
                      <tr key={m.id}>
                        <td className={`${TD} tabular-nums`}>{dataCurta(m.data_efectiva ?? m.data_prevista)}</td>
                        <td className={TD}>
                          {m.descricao}
                          <span className="block text-xs text-[color:var(--muted)]">
                            {TIPOS_MOVIMENTO[m.tipo]}
                            {m.projeto_id ? ` · ${nomeDe.get(m.projeto_id) ?? 'projecto'}` : ''}
                          </span>
                        </td>
                        <td className={TDN}>
                          {m.tipo === 'pagamento' ? '−' : ''}
                          {formatarValor(m.valor, m.moeda)}
                        </td>
                        <td className={TD}>
                          <span className="flex flex-wrap items-center gap-2">
                            <StateBadge rotulo={TOM_MOVIMENTO[estado]} />
                            {estado !== 'realizado' && (
                              <form action={guardarMovimento}>
                                <input type="hidden" name="id" value={m.id} />
                                <input type="hidden" name="revisao" value={m.revisao} />
                                <input type="hidden" name="tipo" value={m.tipo} />
                                <input type="hidden" name="descricao" value={m.descricao} />
                                <input type="hidden" name="projeto" value={m.projeto_id ?? ''} />
                                <input type="hidden" name="valor" value={String(m.valor)} />
                                <input type="hidden" name="moeda" value={m.moeda} />
                                <input type="hidden" name="dataPrevista" value={m.data_prevista} />
                                <input type="hidden" name="dataEfectiva" value={hoje} />
                                <BotaoEnviar size="sm" variant="outline" aEnviar="A marcar…">
                                  Marcar realizado hoje<span className="sr-only">: {m.descricao}</span>
                                </BotaoEnviar>
                              </form>
                            )}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Rolavel>
          )}
        </section>
      </div>
    </>
  );
}

// ── Capacidade ────────────────────────────────────────────────────────────────

export function CapacidadeVista({
  pessoas,
  alocacoes,
  projetos,
  hoje,
}: {
  pessoas: readonly Pessoa[];
  alocacoes: readonly Alocacao[];
  projetos: readonly Projeto[];
  hoje: string;
}) {
  const c = capacidade(pessoas, alocacoes, projetos, hoje);
  const activos = projetos.filter((p) => projetoActivo(p.fase));
  const nomeProjeto = new Map(projetos.map((p) => [p.id, p.nome]));
  return (
    <>
      <AdminHeading
        titulo="Capacidade"
        descricao="Capacidade vendida contra disponível, em horas por semana. Antes de vender: há horas livres? Se não — vender, contratar ou adiar."
      />
      <GabineteNav activo="capacidade" />
      <div className="grid gap-8">
        <section aria-labelledby="cap-resumo" className="grid gap-3">
          <h2 id="cap-resumo" className={H2}>
            Resumo
          </h2>
          {c.porPessoa.length === 0 ? (
            <p className={NOTA}>Sem pessoas activas registadas.</p>
          ) : (
            <>
              <p className="text-sm">
                <span className="font-medium tabular-nums">{horas(c.comprometida)}</span> comprometidas de{' '}
                <span className="font-medium tabular-nums">{horas(c.disponivel)}</span> ({percentagem(c.utilizacao)})
              </p>
              <Rolavel rotulo="Capacidade por pessoa">
                <table className={TABELA}>
                  <caption className="sr-only">Capacidade por pessoa e alocações em vigor</caption>
                  <thead>
                    <tr>
                      <th scope="col" className={TH}>Pessoa</th>
                      <th scope="col" className={`${TH} text-right`}>Disponível</th>
                      <th scope="col" className={`${TH} text-right`}>Comprometida</th>
                      <th scope="col" className={`${TH} text-right`}>Livre</th>
                      <th scope="col" className={TH}>Alocações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {c.porPessoa.map((x) => (
                      <tr key={x.pessoa.id}>
                        <th scope="row" className={`${TD} font-medium`}>
                          {x.pessoa.nome}
                          <span className="block text-xs font-normal text-[color:var(--muted)]">{x.pessoa.funcao ?? ''}</span>
                        </th>
                        <td className={TDN}>{horas(x.pessoa.horas_semana)}</td>
                        <td className={TDN}>{horas(x.comprometida)}</td>
                        <td className={TDN}>
                          {horas(x.livre)}
                          {x.sobrealocada && (
                            <span className="mt-1 block">
                              <StateBadge rotulo={{ texto: 'Sobrealocada', tom: 'mau' }} />
                            </span>
                          )}
                        </td>
                        <td className={TD}>
                          <ul className="grid gap-1">
                            {alocacoes
                              .filter((a) => a.pessoa_id === x.pessoa.id)
                              .map((a) => (
                                <li key={a.projeto_id} className="flex flex-wrap items-center gap-2">
                                  <span>
                                    {nomeProjeto.get(a.projeto_id) ?? 'Projecto'} · {horas(a.horas_semana)}
                                    {a.ate ? ` até ${dataCurta(a.ate)}` : ''}
                                  </span>
                                  <form action={removerAlocacao}>
                                    <input type="hidden" name="pessoa" value={a.pessoa_id} />
                                    <input type="hidden" name="projeto" value={a.projeto_id} />
                                    <BotaoEnviar size="sm" variant="outline" aEnviar="A remover…">
                                      Remover
                                      <span className="sr-only">
                                        {' '}
                                        {x.pessoa.nome} de {nomeProjeto.get(a.projeto_id) ?? 'projecto'}
                                      </span>
                                    </BotaoEnviar>
                                  </form>
                                </li>
                              ))}
                          </ul>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Rolavel>
            </>
          )}
        </section>

        {pessoas.some((p) => p.activa) && activos.length > 0 && (
          <FormAlocacao pessoas={pessoas.filter((p) => p.activa)} projetos={activos} voltar="/admin/gabinete/capacidade" />
        )}

        <FormPessoa />

        {pessoas.length > 0 && (
          <section aria-labelledby="editar-pessoas" className="grid gap-3">
            <h2 id="editar-pessoas" className={H2}>
              Editar pessoas
            </h2>
            {pessoas.map((p) => (
              <details key={p.id} className="border border-[color:var(--border)]">
                <summary className="min-h-11 cursor-pointer px-4 py-3 text-sm">
                  {p.nome} · {horas(p.horas_semana)} {p.activa ? '' : '(inactiva)'}
                </summary>
                <div className="p-2">
                  <FormPessoa v={p} />
                </div>
              </details>
            ))}
          </section>
        )}
      </div>
    </>
  );
}
