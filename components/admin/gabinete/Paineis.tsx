import Link from 'next/link';
import { Kpi, Rolavel } from '@/components/admin/espaco/partes';
import { AdminHeading, StateBadge } from '@/components/admin/primitives';
import { BarrasHorizontais, Bloco, type LinhaBarra } from '@/components/admin/painel/Blocos';
import { buttonVariants } from '@/components/ui/Button';
import {
  CHAPEUS,
  ESTADOS_PRIORIDADE,
  FASES_PROJETO,
  formatarValor,
  MOTIVO_RISCO,
  percentagem,
  RISCOS,
  TIPOS_PRIORIDADE,
  type Capacidade,
  type PainelCeo,
  type PainelCto,
  type Prioridade,
  type TipoPrioridade,
} from '@/lib/gabinete/modelo';
import { dataCurta, GabineteNav } from './partes';

/**
 * Os dois painéis do documento: CEO (economia e execução) e CTO (tecnologia).
 * Recebem os dados já calculados — não os vão buscar — para que a
 * pré-visualização de QA mostre exactamente o mesmo ecrã. Nada é inventado:
 * sem dados, cada bloco diz o que falta registar.
 */

const TABELA = 'w-full min-w-[34rem] border-collapse text-left text-sm';
const TH = 'border-b border-[color:var(--border)] px-3 py-2 font-medium';
const TD = 'border-b border-[color:var(--hairline)] px-3 py-2 align-top';
const TDN = `${TD} text-right tabular-nums`;
const NOTA = 'text-sm text-[color:var(--muted)]';

const horas = (n: number) => `${new Intl.NumberFormat('pt-PT', { maximumFractionDigits: 1 }).format(n)} h`;

function BlocoCapacidade({ c, id, titulo }: { c: Capacidade; id: string; titulo: string }) {
  return (
    <Bloco id={id} titulo={titulo} subtitulo="Horas por semana: disponíveis (pessoas activas) contra comprometidas (alocações em vigor).">
      {c.porPessoa.length === 0 ? (
        <p className={NOTA}>
          Sem pessoas registadas. <Link href="/admin/gabinete/capacidade" className="underline">Registar em Capacidade</Link>.
        </p>
      ) : (
        <div className="grid gap-4">
          <p className="text-sm">
            <span className="font-medium tabular-nums">{horas(c.comprometida)}</span> comprometidas de{' '}
            <span className="font-medium tabular-nums">{horas(c.disponivel)}</span> ({percentagem(c.utilizacao)})
          </p>
          <ul className="grid gap-2 text-sm">
            {c.porPessoa.map((p) => (
              <li key={p.pessoa.id} className="flex flex-wrap items-center justify-between gap-2">
                <span>{p.pessoa.nome}</span>
                <span className="flex items-center gap-2 tabular-nums">
                  {horas(p.comprometida)} / {horas(p.pessoa.horas_semana)}
                  {p.sobrealocada && <StateBadge rotulo={{ texto: 'Sobrealocada', tom: 'mau' }} />}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Bloco>
  );
}

const ORDEM_TIPOS = Object.keys(TIPOS_PRIORIDADE) as TipoPrioridade[];

function ListaPrioridades({ prioridades, trimestre }: { prioridades: readonly Prioridade[]; trimestre: string }) {
  return (
    <ul className="grid gap-3 text-sm">
      {ORDEM_TIPOS.map((t) => {
        const p = prioridades.find((x) => x.tipo === t);
        return (
          <li key={t} className="grid gap-1 sm:grid-cols-[10rem_1fr_auto] sm:items-baseline sm:gap-3">
            <span className="text-[color:var(--muted)]">{TIPOS_PRIORIDADE[t]}</span>
            <span>{p ? p.resultado : <span className="text-[color:var(--muted)]">Por definir em {trimestre}</span>}</span>
            {p && (
              <StateBadge
                rotulo={{
                  texto: ESTADOS_PRIORIDADE[p.estado],
                  tom: p.estado === 'em_risco' ? 'aviso' : p.estado === 'concluida' ? 'bom' : 'neutro',
                }}
              />
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function PainelCeoVista({
  p,
  hoje,
  pipeline,
}: {
  p: PainelCeo;
  hoje: string;
  /** Oportunidades do CRM por fase (contagem). Nulo se a leitura falhou. */
  pipeline: readonly LinhaBarra[] | null;
}) {
  const delegacaoNota =
    p.delegacao.total === 0
      ? 'Sem decisões recorrentes fechadas: marque «recorrente» e «quem decidiu» ao fechar.'
      : `${p.delegacao.delegadas} de ${p.delegacao.total} decisões recorrentes fechadas sem si.`;
  return (
    <>
      <AdminHeading
        titulo="Gabinete do Fundador"
        descricao={`Painel CEO — ${dataCurta(hoje)}. Este espaço é privado: só a sua conta o vê. Os números são os que registar aqui; sem conversão entre moedas.`}
        accao={
          <Link href="/admin/gabinete/decisoes/nova" className={buttonVariants({ size: 'sm' })}>
            Nova decisão
          </Link>
        }
      />
      <GabineteNav activo="ceo" />

      <div className="grid gap-8">
        <section aria-labelledby="metrica-critica">
          <div className="rounded-[--radius-sm] border border-[color:var(--on-surface)] bg-[color:var(--surface-raised)] p-5 md:p-6">
            <h2 id="metrica-critica" className="text-sm text-[color:var(--muted)]">
              Métrica crítica — decisões recorrentes resolvidas sem o fundador
            </h2>
            <p className="mt-2 font-[family-name:var(--font-display)] text-[2.5rem] leading-none font-semibold tracking-[-0.03em] tabular-nums">
              {percentagem(p.delegacao.razao)}
            </p>
            <p className="mt-2 text-sm text-[color:var(--muted)]">{delegacaoNota} Mede se a empresa se está a tornar um sistema.</p>
          </div>
        </section>

        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="Indicadores">
          <li>
            <Kpi rotulo="Exigem decisão minha" valor={String(p.decisoesMinhas.length)} nota="Decisões abertas com o estado «Exige decisão minha»." />
          </li>
          <li>
            <Kpi rotulo="Decisões atrasadas" valor={String(p.decisoesAtrasadas)} nota="Em aberto e com a data de revisão passada." />
          </li>
          <li>
            <Kpi rotulo="Capacidade comprometida" valor={percentagem(p.capacidade.utilizacao)} nota="Comprometida ÷ disponível, horas por semana." />
          </li>
          <li>
            <Kpi
              rotulo="Higiene dos projectos"
              valor={percentagem(p.higiene.razao)}
              nota={`${p.higiene.completos} de ${p.higiene.activos} activos com responsável, escopo, próxima acção e data.`}
            />
          </li>
        </ul>

        <div className="grid gap-6 lg:grid-cols-2">
          <Bloco id="caixa" titulo="Caixa" subtitulo="Último saldo registado mais o realizado depois dele, por moeda.">
            {p.caixa.length === 0 ? (
              <p className={NOTA}>
                Sem saldo de partida. <Link href="/admin/gabinete/tesouraria" className="underline">Registe um saldo em Tesouraria</Link> —
                sem ele, somar movimentos daria um número que parece caixa e não é.
              </p>
            ) : (
              <ul className="grid gap-2">
                {p.caixa.map((c) => (
                  <li key={c.moeda} className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="font-[family-name:var(--font-display)] text-[1.5rem] font-semibold tabular-nums">
                      {formatarValor(c.valor, c.moeda)}
                    </span>
                    <span className={NOTA}>desde o saldo de {dataCurta(c.desde)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Bloco>

          <Bloco id="pipeline" titulo="Pipeline comercial" subtitulo="Oportunidades do CRM por fase. O CRM não regista valor: é contagem, não dinheiro.">
            {pipeline === null ? (
              <p className={NOTA}>Não foi possível ler o CRM agora.</p>
            ) : pipeline.every((l) => l.valor === 0) ? (
              <p className={NOTA}>Sem oportunidades no CRM.</p>
            ) : (
              <BarrasHorizontais linhas={pipeline} legenda="Oportunidades por fase" />
            )}
          </Bloco>

          <Bloco id="previsao" className="lg:col-span-2" titulo="Recebimentos e pagamentos — 30 dias" subtitulo="Previstos (sem data efectiva) e os que já passaram da data.">
            {p.previsao.length === 0 ? (
              <p className={NOTA}>Sem movimentos previstos.</p>
            ) : (
              <Rolavel rotulo="Previsão de tesouraria por moeda">
                <table className={TABELA}>
                  <caption className="sr-only">Previsão a 30 dias, por moeda</caption>
                  <thead>
                    <tr>
                      <th scope="col" className={TH}>Moeda</th>
                      <th scope="col" className={`${TH} text-right`}>A receber</th>
                      <th scope="col" className={`${TH} text-right`}>A pagar</th>
                      <th scope="col" className={`${TH} text-right`}>Recebimentos vencidos</th>
                      <th scope="col" className={`${TH} text-right`}>Pagamentos vencidos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {p.previsao.map((v) => (
                      <tr key={v.moeda}>
                        <th scope="row" className={`${TD} font-medium`}>{v.moeda}</th>
                        <td className={TDN}>{formatarValor(v.recebimentos, v.moeda)}</td>
                        <td className={TDN}>{formatarValor(v.pagamentos, v.moeda)}</td>
                        <td className={TDN}>{formatarValor(v.recebimentosVencidos, v.moeda)}</td>
                        <td className={TDN}>{formatarValor(v.pagamentosVencidos, v.moeda)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Rolavel>
            )}
          </Bloco>

          <Bloco id="receita" className="lg:col-span-2" titulo="Receita e margem" subtitulo="Somada dos projectos (suspensos fora). Faturada separada de recebida.">
            {p.receita.length === 0 ? (
              <p className={NOTA}>
                Sem receita registada. Preencha a economia de cada projecto em{' '}
                <Link href="/admin/gabinete/projetos" className="underline">Projectos</Link>.
              </p>
            ) : (
              <Rolavel rotulo="Receita e margem por moeda">
                <table className={TABELA}>
                  <caption className="sr-only">Receita e margem por moeda</caption>
                  <thead>
                    <tr>
                      <th scope="col" className={TH}>Moeda</th>
                      <th scope="col" className={`${TH} text-right`}>Contratada</th>
                      <th scope="col" className={`${TH} text-right`}>Faturada</th>
                      <th scope="col" className={`${TH} text-right`}>Recebida</th>
                      <th scope="col" className={`${TH} text-right`}>A receber</th>
                      <th scope="col" className={`${TH} text-right`}>Margem bruta</th>
                    </tr>
                  </thead>
                  <tbody>
                    {p.receita.map((r) => (
                      <tr key={r.moeda}>
                        <th scope="row" className={`${TD} font-medium`}>{r.moeda}</th>
                        <td className={TDN}>{formatarValor(r.contratada, r.moeda)}</td>
                        <td className={TDN}>{formatarValor(r.faturada, r.moeda)}</td>
                        <td className={TDN}>{formatarValor(r.recebida, r.moeda)}</td>
                        <td className={TDN}>{formatarValor(r.aReceber, r.moeda)}</td>
                        <td className={TDN}>
                          {r.comMargem > 0 ? formatarValor(r.margem, r.moeda) : '—'}
                          <span className="block text-xs text-[color:var(--muted)]">
                            {r.comMargem} de {r.projetos} com custos
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Rolavel>
            )}
          </Bloco>

          

          

          

          <Bloco id="em-risco" titulo="Projectos em risco" subtitulo="Risco alto, próxima acção atrasada ou margem negativa.">
            {p.emRisco.length === 0 ? (
              <p className={NOTA}>Nenhum projecto activo em risco.</p>
            ) : (
              <ul className="grid gap-3 text-sm">
                {p.emRisco.map(({ projeto, motivos }) => (
                  <li key={projeto.id} className="grid gap-1">
                    <Link href={`/admin/gabinete/projetos/${projeto.id}`} className="font-medium underline">
                      {projeto.nome}
                    </Link>
                    <span className="flex flex-wrap gap-2">
                      {motivos.map((m) => (
                        <StateBadge key={m} rotulo={MOTIVO_RISCO[m]} />
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Bloco>

          <Bloco id="minhas" titulo="Exige decisão minha" subtitulo="Por data de revisão.">
            {p.decisoesMinhas.length === 0 ? (
              <p className={NOTA}>Nenhuma decisão à sua espera.</p>
            ) : (
              <ul className="grid gap-2 text-sm">
                {p.decisoesMinhas.slice(0, 8).map((d) => (
                  <li key={d.id} className="flex flex-wrap items-baseline justify-between gap-2">
                    <Link href={`/admin/gabinete/decisoes/${d.id}`} className="underline">
                      {d.titulo}
                    </Link>
                    <span className="text-[color:var(--muted)] tabular-nums">
                      {CHAPEUS[d.chapeu].texto} · {dataCurta(d.data_revisao)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Bloco>
        </div>

        <BlocoCapacidade c={p.capacidade} id="capacidade" titulo="Capacidade" />

        <Bloco id="prioridades" titulo={`Prioridades — ${p.trimestre}`} subtitulo="Cinco resultados que organizam as tarefas.">
          <ListaPrioridades prioridades={p.prioridades} trimestre={p.trimestre} />
        </Bloco>
      </div>
    </>
  );
}

export function PainelCtoVista({ p }: { p: PainelCto }) {
  return (
    <>
      <AdminHeading
        titulo="Painel CTO"
        descricao="Como a tecnologia é construída e operada: decisões técnicas, prioridade tecnológica, execução e capacidade técnica."
      />
      <GabineteNav activo="cto" />

      <div className="grid gap-6 lg:grid-cols-2">
        <Bloco id="decisoes-cto" titulo="Decisões técnicas em aberto" subtitulo="Chapéu CTO.">
          {p.decisoesCto.length === 0 ? (
            <p className={NOTA}>Nenhuma decisão técnica em aberto.</p>
          ) : (
            <ul className="grid gap-2 text-sm">
              {p.decisoesCto.map((d) => (
                <li key={d.id} className="flex flex-wrap items-baseline justify-between gap-2">
                  <Link href={`/admin/gabinete/decisoes/${d.id}`} className="underline">
                    {d.titulo}
                  </Link>
                  <span className="text-[color:var(--muted)] tabular-nums">{dataCurta(d.data_revisao)}</span>
                </li>
              ))}
            </ul>
          )}
        </Bloco>

        <Bloco id="prioridade-tec" titulo="Prioridade tecnológica do trimestre">
          {p.prioridadeTecnologica ? (
            <div className="grid gap-2 text-sm">
              <p className="font-medium">{p.prioridadeTecnologica.resultado}</p>
              {p.prioridadeTecnologica.indicador && (
                <p className={NOTA}>
                  Indicador: {p.prioridadeTecnologica.indicador}
                  {p.prioridadeTecnologica.meta ? ` · meta: ${p.prioridadeTecnologica.meta}` : ''}
                </p>
              )}
            </div>
          ) : (
            <p className={NOTA}>
              Por definir. <Link href="/admin/gabinete/prioridades" className="underline">Definir em Prioridades</Link>.
            </p>
          )}
        </Bloco>

        <Bloco id="execucao" titulo="Em execução" subtitulo="Implementação, activação e evolução.">
          {p.emExecucao.length === 0 ? (
            <p className={NOTA}>Nenhum projecto em execução.</p>
          ) : (
            <ul className="grid gap-3 text-sm">
              {p.emExecucao.map((x) => (
                <li key={x.id} className="grid gap-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <Link href={`/admin/gabinete/projetos/${x.id}`} className="font-medium underline">
                      {x.nome}
                    </Link>
                    <StateBadge rotulo={{ texto: FASES_PROJETO[x.fase], tom: 'neutro' }} />
                    <StateBadge rotulo={RISCOS[x.risco]} />
                  </span>
                  <span className="text-[color:var(--muted)]">
                    {x.proxima_accao ?? 'Sem próxima acção'} · {dataCurta(x.proxima_data)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Bloco>

        <Bloco id="por-preparar" titulo="Antes de implementar" subtitulo="Projectos em arquitectura ou protótipo e os critérios de prontidão que faltam.">
          {p.porPreparar.length === 0 ? (
            <p className={NOTA}>Nenhum projecto em arquitectura ou protótipo.</p>
          ) : (
            <ul className="grid gap-3 text-sm">
              {p.porPreparar.map(({ projeto, falta }) => (
                <li key={projeto.id} className="grid gap-1">
                  <Link href={`/admin/gabinete/projetos/${projeto.id}`} className="font-medium underline">
                    {projeto.nome}
                  </Link>
                  <span className="text-[color:var(--muted)]">
                    {falta.length === 0 ? 'Pronto para implementar.' : `Falta: ${falta.join(', ')}.`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Bloco>

        <BlocoCapacidade c={p.capacidadeTecnica} id="capacidade-tec" titulo="Capacidade técnica" />

        <Bloco id="fora" titulo="Fora deste painel (v1)">
          <p className={NOTA}>
            Releases, incidentes, riscos de segurança, dívida técnica e disponibilidade continuam nas fontes oficiais
            (GitHub, Vercel, Supabase). O registo técnico entra numa versão seguinte, quando esta for usada todas as
            semanas.
          </p>
        </Bloco>
      </div>
    </>
  );
}
