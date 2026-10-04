import Link from 'next/link';
import { AdminHeading } from '@/components/admin/primitives';
import { BarrasHorizontais, Bloco, numero } from '@/components/admin/painel/Blocos';
import { NOME_DO_TIPO } from '@/lib/inqueritos/construtor';
import { barrasDe, npsDe, type Resultados as DadosResultados } from '@/lib/inqueritos/resultados';
import { temResposta, type SpecInquerito } from '@/lib/inqueritos/spec';

/**
 * Os resultados de um inquérito. Os números vêm de `resultados_inquerito`
 * (0013), agregados na base; a desistência vem dos eventos do browser e diz
 * que é uma estimativa — bloqueadores de anúncios cortam eventos, nunca
 * respostas.
 */

export type Desistencia =
  | { readonly estado: 'ok'; readonly iniciados: number; readonly porPasso: readonly number[] }
  | { readonly estado: 'sem-dados'; readonly motivo: string };

export function Resultados({
  id,
  nome,
  versao,
  spec,
  resultados,
  desistencia,
  escreve,
}: {
  id: string;
  nome: string;
  /** A versão cujo texto agrupa as respostas; null se só há rascunho. */
  versao: number | null;
  spec: SpecInquerito;
  /** null: a leitura falhou — mostra-se o erro, nunca zeros. */
  resultados: DadosResultados | null;
  desistencia: Desistencia;
  escreve: boolean;
}) {
  const perguntas = spec.perguntas.filter(temResposta);
  return (
    <>
      <AdminHeading
        titulo={`Resultados — ${nome}`}
        descricao={
          versao
            ? `Agrupados pelo texto da versão ${versao}. Respostas a versões anteriores entram na mesma pergunta.`
            : 'Ainda sem versão publicada.'
        }
        accao={
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
            <Link href={`/admin/inqueritos/${id}`} className="underline underline-offset-4">
              Voltar ao inquérito
            </Link>
            <a href={`/admin/inqueritos/${id}/exportar`} className="underline underline-offset-4">
              Exportar CSV
            </a>
            {escreve && (
              <a
                href={`/admin/inqueritos/${id}/exportar?contacto=1`}
                className="underline underline-offset-4"
              >
                Exportar com contactos
              </a>
            )}
          </div>
        }
      />

      {resultados === null ? (
        <p
          role="alert"
          className="mb-6 border border-[color:var(--color-signal-600)] px-4 py-3 text-sm text-[color:var(--color-signal-700)]"
        >
          Não foi possível ler os resultados agora. Nenhum número é mostrado em vez deles.
        </p>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Bloco id="res-total" titulo="Respostas">
              <p>
                <span className="font-techno text-[length:var(--text-h2)] font-semibold tabular-nums">
                  {numero(resultados.total)}
                </span>{' '}
                <span className="text-sm text-[color:var(--muted)]">
                  {resultados.total === 1 ? 'resposta submetida' : 'respostas submetidas'}
                </span>
              </p>
            </Bloco>
            <Bloco
              id="res-desistencia"
              titulo="Onde desistem"
              subtitulo="Estimativa: vem dos eventos do browser, que os bloqueadores de anúncios cortam."
            >
              {desistencia.estado === 'sem-dados' ? (
                <p className="text-sm text-[color:var(--muted)]">Sem dados. {desistencia.motivo}</p>
              ) : (
                <BarrasHorizontais
                  legenda="Pessoas que viram cada passo"
                  maximo={desistencia.iniciados}
                  linhas={[
                    { chave: 'inicio', rotulo: 'Começaram', valor: desistencia.iniciados },
                    ...desistencia.porPasso.map((n, i) => ({
                      chave: `p${i + 1}`,
                      rotulo: `Passo ${i + 1}`,
                      valor: n,
                    })),
                    { chave: 'fim', rotulo: 'Submeteram', valor: resultados.total },
                  ]}
                />
              )}
            </Bloco>
          </div>

          {perguntas.map((p, i) => {
            const r = resultados.porPergunta[p.chave];
            const respondidas = r?.respondidas ?? 0;
            const barras = barrasDe(p, r);
            const nps = p.tipo === 'nps' && r ? npsDe(r.valores) : null;
            return (
              <Bloco
                key={p.chave}
                id={`res-${p.chave}`}
                titulo={`${i + 1}. ${p.titulo}`}
                subtitulo={`${NOME_DO_TIPO[p.tipo]} · ${numero(respondidas)} de ${numero(
                  resultados.total,
                )} responderam`}
              >
                {nps && (
                  <p className="mb-4 text-sm">
                    NPS{' '}
                    <span className="font-techno text-[length:var(--text-h3)] font-semibold tabular-nums">
                      {nps.nps}
                    </span>
                    <span className="text-[color:var(--muted)]">
                      {' '}
                      · {numero(nps.promotores)} promotores, {numero(nps.neutros)} neutros,{' '}
                      {numero(nps.detratores)} detratores
                    </span>
                  </p>
                )}
                {r?.media !== null && r?.media !== undefined && (
                  <p className="mb-4 text-sm">
                    Média{' '}
                    <span className="font-medium tabular-nums">
                      {r.media.toLocaleString('pt-PT')}
                    </span>
                  </p>
                )}
                {barras.length > 0 ? (
                  respondidas > 0 ? (
                    <BarrasHorizontais
                      legenda={p.titulo}
                      linhas={barras.map((b) => ({
                        chave: b.chave,
                        rotulo: b.rotulo,
                        valor: b.valor,
                        nota: `${b.percentagem} %`,
                      }))}
                    />
                  ) : (
                    <p className="text-sm text-[color:var(--muted)]">Ainda sem respostas.</p>
                  )
                ) : (
                  p.tipo !== 'numero' && (
                    <p className="text-sm text-[color:var(--muted)]">
                      Respostas em texto ou data: veja-as na exportação CSV.
                    </p>
                  )
                )}
              </Bloco>
            );
          })}
        </div>
      )}
    </>
  );
}
