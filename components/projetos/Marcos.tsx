'use client';

import { useId, useState } from 'react';
import type { Componente } from '@/content/projetos/tipos';
import { milhoes, mzn } from '@/lib/terrabuild/formato';
import { avancar, concluida, emFalta, iniciar, PASSOS, type Simulacao } from '@/lib/terrabuild/marcos';
import { resumoCapital } from '@/lib/terrabuild/obra';
import { cn } from '@/lib/utils/cn';
import { useGemeo } from './estado';
import { useRastreio } from './rastreio';
import { Ficticio, Indicador, Progresso, ROTULO } from './ui';

/**
 * Construção verificável por marcos. Cada componente tem orçamento,
 * responsável, evidências e histórico; o fluxo de desembolso é SIMULADO e
 * termina sempre a dizer que nada foi guardado nem cobrado.
 */

const ESTADO = {
  concluido: 'Concluído',
  'em-curso': 'Em curso',
  'por-iniciar': 'Por iniciar',
} as const;
const CERT = {
  validado: 'Validado',
  'em-validacao': 'Em validação',
  pendente: 'Pendente',
} as const;

export function Marcos() {
  const { projeto: p } = useGemeo();
  const rastrear = useRastreio(p.slug);
  const resumo = resumoCapital(p);
  const [escolhido, setEscolhido] = useState<string>(p.componentes.find((c) => c.estado !== 'concluido')?.id ?? p.componentes[0]!.id);
  const [sim, setSim] = useState<Simulacao | null>(null);
  const comp = p.componentes.find((c) => c.id === escolhido)!;
  const idLista = useId();

  const escolher = (c: Componente) => {
    setEscolhido(c.id);
    setSim(null);
  };

  return (
    <div className="flex flex-col gap-10">
      <dl className="grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
        <Indicador
          rotulo="Capital necessário"
          valor={
            <>
              {milhoes(resumo.orcamento)}
              <Ficticio />
            </>
          }
        />
        <Indicador rotulo="Libertado após validação" valor={milhoes(resumo.libertado)} nota="Só as tranches já validadas; o resto aguarda validação" />
        <Indicador
          rotulo="Progresso físico"
          valor={`${Math.round(resumo.progresso)} %`}
          nota="Ponderado pelo orçamento de cada componente"
        />
        <Indicador
          rotulo="Componentes"
          valor={`${resumo.concluidos} / ${p.componentes.length}`}
          nota={`${resumo.emCurso} em curso · ${resumo.porIniciar} por iniciar`}
        />
      </dl>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <h4 id={idLista} className={ROTULO}>
            Componentes financiáveis
          </h4>
          <ul aria-labelledby={idLista} className="mt-3 flex flex-col">
            {p.componentes.map((c) => (
              <li key={c.id} className="border-t border-[color:var(--hairline)]">
                <button
                  type="button"
                  aria-pressed={escolhido === c.id}
                  onClick={() => escolher(c)}
                  className={cn(
                    'flex min-h-11 w-full flex-col gap-2 px-2 py-3 text-left transition-colors',
                    escolhido === c.id ? 'bg-[color:var(--surface-raised)]' : 'hover:bg-[color:var(--surface-raised)]',
                  )}
                >
                  <span className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="font-medium">{c.nome}</span>
                    <span className="text-xs text-[color:var(--muted)]">{ESTADO[c.estado]}</span>
                  </span>
                  <Progresso valor={c.percentagem} rotulo={`Execução de ${c.nome}`} />
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col gap-6 lg:col-span-7">
          <div className="border border-[color:var(--hairline)] p-5">
            <p className="font-display text-[length:var(--text-h3)] font-semibold">{comp.nome}</p>
            <dl className="mt-4 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
              <Dado
                rotulo="Orçamento"
                valor={
                  <>
                    {mzn(comp.orcamento)}
                    <Ficticio />
                  </>
                }
              />
              <Dado rotulo="Libertado" valor={mzn(comp.libertado)} />
              <Dado rotulo="Responsável" valor={comp.responsavel} />
              <Dado rotulo="Fornecedor (fictício)" valor={comp.fornecedor} />
              <Dado rotulo="Executado" valor={`${comp.percentagem} %`} />
              <Dado rotulo="Certificação técnica" valor={CERT[comp.certificacao]} />
              <Dado rotulo="Desvio" valor={comp.desvio === 0 ? 'Sem desvio' : `${comp.desvio > 0 ? '+' : '−'}${Math.abs(comp.desvio)} %`} />
              <Dado rotulo="Em falta" valor={mzn(emFalta(comp))} />
            </dl>
            {comp.evidencias.length ? (
              <div className="mt-5">
                <p className={ROTULO}>Evidências georreferenciadas</p>
                <ul className="mt-2 flex flex-col gap-1 text-sm">
                  {comp.evidencias.map((e) => (
                    <li key={`${e.data}-${e.descricao}`}>
                      {e.descricao}{' '}
                      <span className="text-[color:var(--muted)]">
                        · E {e.e} m, N {e.n} m · {e.data}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            <div className="mt-5">
              <p className={ROTULO}>Histórico de versões</p>
              <ol className="mt-2 flex flex-col gap-1 text-sm">
                {comp.versoes.map((v) => (
                  <li key={v.versao}>
                    v{v.versao} · {v.data} · {v.nota}{' '}
                    <code className="text-xs text-[color:var(--muted)]" title="Impressão digital fictícia">
                      #{v.hash}
                    </code>
                  </li>
                ))}
              </ol>
            </div>
          </div>

          <div className="flex flex-col gap-4" data-testid="simulacao-marcos">
            {sim === null ? (
              <>
                <p className="text-sm text-[color:var(--muted)]">
                  Simule o percurso do dinheiro neste componente: só se liberta depois de evidência e validação. Nada é reservado, guardado
                  ou cobrado.
                </p>
                <button
                  type="button"
                  disabled={emFalta(comp) === 0}
                  onClick={() => {
                    rastrear('milestone_sim');
                    setSim(iniciar(comp));
                  }}
                  className="inline-flex min-h-12 items-center justify-center self-start bg-[color:var(--color-signal-600)] px-6 font-display font-semibold text-white hover:bg-[color:var(--color-signal-700)] disabled:opacity-40"
                >
                  Simular financiamento deste componente
                </button>
                {emFalta(comp) === 0 ? (
                  <p className="text-xs text-[color:var(--muted)]">Este componente já está totalmente libertado.</p>
                ) : null}
              </>
            ) : (
              <>
                <ol className="grid gap-1.5 sm:grid-cols-2" aria-label="Passos do desembolso">
                  {PASSOS.map((passo, i) => (
                    <li
                      key={passo.id}
                      aria-current={i === sim.passo ? 'step' : undefined}
                      className={cn(
                        'flex items-center gap-2 border px-3 py-2 text-xs',
                        i < sim.passo && 'border-[color:var(--hairline)] text-[color:var(--muted)]',
                        i === sim.passo && 'border-[color:var(--color-signal-500)]',
                        i > sim.passo && 'border-dashed border-[color:var(--hairline)] text-[color:var(--muted)]',
                      )}
                    >
                      <span className="numeral">{String(i + 1).padStart(2, '0')}</span>
                      {passo.nome}
                      {i < sim.passo ? <span className="sr-only">(feito)</span> : null}
                    </li>
                  ))}
                </ol>
                <div role="log" aria-live="polite" aria-label="Registo da simulação">
                  <ol className="flex flex-col gap-1.5 border-l border-[color:var(--hairline)] pl-4 text-sm">
                    {sim.registo.map((linha, i) => (
                      <li key={i} className={cn(i === sim.registo.length - 1 && concluida(sim) && 'font-semibold')}>
                        {linha}
                      </li>
                    ))}
                  </ol>
                </div>
                <div className="flex flex-wrap gap-2">
                  {!concluida(sim) ? (
                    <button
                      type="button"
                      onClick={() => setSim(avancar(sim, comp))}
                      className="inline-flex min-h-11 items-center bg-[color:var(--color-signal-600)] px-5 text-sm font-semibold text-white hover:bg-[color:var(--color-signal-700)]"
                    >
                      Avançar: {PASSOS[sim.passo + 1]!.nome.toLowerCase()}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => setSim(null)}
                    className="inline-flex min-h-11 items-center border border-[color:var(--border)] px-5 text-sm hover:border-[color:var(--on-surface)]"
                  >
                    {concluida(sim) ? 'Recomeçar' : 'Cancelar a simulação'}
                  </button>
                </div>
              </>
            )}
          </div>
          <p className="text-xs text-[color:var(--muted)]">
            Numa versão real, os fundos ficariam numa instituição de pagamento autorizada, nunca na AGORAMOZ. Os meios de pagamento
            (M-Pesa, e-Mola e mKesh só através de agregador autorizado; transferência; cartão) e o instrumento jurídico, a definir com
            aconselhamento jurídico, dependeriam de autorização e de verificação de identidade (KYC/AML) antes do primeiro pagamento. Nesta
            demonstração não existe parceria, integração nem pagamento.
          </p>
        </div>
      </div>
    </div>
  );
}

function Dado({ rotulo, valor }: { rotulo: string; valor: React.ReactNode }) {
  return (
    <div>
      <dt className={ROTULO}>{rotulo}</dt>
      <dd className="mt-0.5 tabular-nums">{valor}</dd>
    </div>
  );
}
