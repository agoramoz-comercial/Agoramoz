'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { Idioma } from '@/content/types';
import {
  MARCA_NEWS,
  NEWS,
  RELATORIO,
  ROTULO_CADEIA,
  ROTULO_PRIORIDADE,
  ROTULO_SEVERIDADE,
  nomeDaDimensao,
} from '@/content/i18n/news';
import type { Analise, Prioridade, Severidade } from '@/lib/news/esquema';
import type { IdiomaMotor } from '@/lib/news/limites';
import { ler } from '@/lib/news/leitura';
import { ligacao } from '@/lib/i18n/rotas';
import { t } from '@/lib/i18n/texto';
import { buttonVariants } from '@/components/ui/Button';
import { cn } from '@/lib/utils/cn';
import { BarrasImpacto } from './BarrasImpacto';
import { assinado } from './formato';

/**
 * O relatório, organizado pela ordem em que se decide.
 *
 * O original repartia a mesma análise por cinco separadores, com a prioridade
 * num, o impacto noutro e o que fazer num terceiro. Aqui é uma página só, com
 * índice: primeiro o veredicto (quão grave, para onde pesa), depois porquê,
 * depois o que fazer, e por fim o aprofundamento. Quem tem dois minutos lê o
 * topo; quem tem vinte, desce.
 *
 * Todo o texto do motor passa pelo React, que o escapa. Não há `innerHTML`, e
 * o PDF é a própria página impressa — não uma janela escrita à mão.
 *
 * Os rótulos estão no idioma da página; o texto do motor está no idioma que
 * a pessoa escolheu para o relatório, e é marcado com `lang` para o leitor de
 * ecrã o pronunciar certo. As chaves das listas são o índice: o motor pode
 * repetir um texto, e a lista é imutável por análise.
 */

const TOM_PRIORIDADE: Record<Prioridade, string> = {
  critical: 'bg-[color:var(--color-signal-600)] text-white',
  high: 'border border-[color:var(--signal)] text-[color:var(--signal)]',
  medium: 'border border-[color:var(--on-surface)] text-[color:var(--on-surface)]',
  monitor: 'border border-[color:var(--border)] text-[color:var(--muted)]',
};

const TOM_SEVERIDADE: Record<Severidade, string> = {
  critical: 'bg-[color:var(--color-signal-600)] text-white',
  high: 'border border-[color:var(--signal)] text-[color:var(--signal)]',
  medium: 'border border-[color:var(--border)] text-[color:var(--muted)]',
};

const SETA = { up: '↑', down: '↓', neutral: '→' } as const;

/** Código BCP 47 do texto do motor. Xichangana é `ts` (Xitsonga). */
const LANG: Record<IdiomaMotor, string> = { pt: 'pt', en: 'en', fr: 'fr', de: 'de', xg: 'ts' };

function Bloco({ id, titulo, children }: { id: string; titulo: string; children: React.ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className="rule scroll-mt-28 pt-6">
      <h3 id={`${id}-h`} className="text-[length:var(--text-h3)] font-bold tracking-[var(--tracking-heading)]">
        {titulo}
      </h3>
      <div className="mt-6">{children}</div>
    </section>
  );
}

function Lista({ itens, lang }: { itens: readonly string[]; lang: string }) {
  return (
    <ul className="grid gap-2" role="list" lang={lang}>
      {itens.map((texto, i) => (
        <li key={i} className="flex gap-3 text-[color:var(--muted)]">
          <span aria-hidden className="text-[color:var(--on-surface)]">—</span>
          <span>{texto}</span>
        </li>
      ))}
    </ul>
  );
}

function resumoParaPartilhar(a: Analise, idioma: Idioma): string {
  const partes = [a.titulo.titulo || t(RELATORIO.semTitulo, idioma)];
  if (a.resumo.length) partes.push('', t(RELATORIO.seccoes.resumo, idioma), ...a.resumo.map((r) => `• ${r}`));
  if (a.interpretacao?.porque) partes.push('', t(RELATORIO.porque, idioma), a.interpretacao.porque);
  if (a.recomendacoes.agir.length) {
    partes.push('', t(RELATORIO.agir, idioma), ...a.recomendacoes.agir.map((r) => `• ${r}`));
  }
  // Partilhado sem o aviso, um texto gerado por IA passaria por verificado.
  partes.push('', t(NEWS.aviso, idioma));
  if (a.seccoesEmFalta.length) partes.push(t(RELATORIO.incompleto, idioma));
  partes.push(`${MARCA_NEWS} · agoramoz.com${ligacao('/news', idioma).href}`);
  return partes.join('\n');
}

export function Relatorio({
  analise: a,
  idioma,
  idiomaConteudo,
  tituloRef,
}: {
  analise: Analise;
  idioma: Idioma;
  /** O idioma que a pessoa escolheu para o relatório — o do texto do motor. */
  idiomaConteudo: IdiomaMotor;
  tituloRef?: React.Ref<HTMLHeadingElement>;
}) {
  const l = ler(a);
  const lc = LANG[idiomaConteudo];
  const [copia, setCopia] = useState<'ok' | 'falhou' | null>(null);

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(resumoParaPartilhar(a, idioma));
      setCopia('ok');
    } catch {
      setCopia('falhou');
    }
  };

  const S = RELATORIO.seccoes;
  const temAcao = a.recomendacoes.agir.length + a.recomendacoes.monitorizar.length + a.recomendacoes.ajustar.length > 0;
  const seccoes = [
    { id: 'news-veredicto', titulo: t(S.veredicto, idioma), mostra: true },
    { id: 'news-resumo', titulo: t(S.resumo, idioma), mostra: a.resumo.length > 0 || a.interpretacao !== null },
    { id: 'news-impacto', titulo: t(S.impacto, idioma), mostra: a.pontuacoes.length > 0 || a.matriz.length > 0 },
    { id: 'news-riscos', titulo: t(S.riscos, idioma), mostra: a.riscos.length + a.oportunidades.length > 0 },
    { id: 'news-acao', titulo: t(S.acao, idioma), mostra: temAcao },
    { id: 'news-horizonte', titulo: t(S.horizonte, idioma), mostra: a.horizonte !== null },
    { id: 'news-cadeias', titulo: t(S.cadeias, idioma), mostra: a.cadeias.length > 0 },
    { id: 'news-economia', titulo: t(S.economia, idioma), mostra: a.economia !== null },
    { id: 'news-estrategias', titulo: t(S.estrategias, idioma), mostra: a.estrategias !== null },
    { id: 'news-perguntas', titulo: t(S.perguntas, idioma), mostra: a.perguntas.length > 0 },
  ].filter((s) => s.mostra);
  const titulo = (id: string) => seccoes.find((s) => s.id === id)!.titulo;
  const mostra = (id: string) => seccoes.some((s) => s.id === id);
  const faltaRiscos = a.seccoesEmFalta.includes('riscos');
  const faltaOportunidades = a.seccoesEmFalta.includes('oportunidades');
  const semDados = t(RELATORIO.semDados, idioma);

  const metricas = [
    {
      rotulo: t(RELATORIO.impactoLiquido, idioma),
      valor: l.impactoLiquido === null ? semDados : assinado(l.impactoLiquido),
      negativo: (l.impactoLiquido ?? 0) < 0,
    },
    {
      rotulo: t(RELATORIO.cargaRisco, idioma),
      valor: l.cargaRisco === null ? semDados : String(l.cargaRisco),
      negativo: false,
    },
    {
      rotulo: t(RELATORIO.balanco, idioma),
      valor: l.balanco === null ? semDados : assinado(l.balanco),
      negativo: (l.balanco ?? 0) < 0,
    },
    {
      rotulo: t(RELATORIO.dimensaoCritica, idioma),
      valor: l.dimensaoCritica ? assinado(l.dimensaoCritica.score) : semDados,
      detalhe: l.dimensaoCritica?.dimensao,
      negativo: (l.dimensaoCritica?.score ?? 0) < 0,
    },
  ];

  const incompleto = a.seccoesEmFalta.length > 0 || a.descartados > 0;

  return (
    <article data-news-imprimir aria-labelledby="news-titulo" className="grid gap-12 lg:grid-cols-[13rem_minmax(0,1fr)]">
      <nav aria-label={t(RELATORIO.indice, idioma)} className="hidden lg:block print:hidden">
        <div className="sticky top-28">
          <p className="rule-label text-[color:var(--muted)]">{t(RELATORIO.indice, idioma)}</p>
          <ol className="mt-4 grid gap-1">
            {seccoes.map((s, i) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  className="flex gap-3 py-1 text-sm text-[color:var(--muted)] hover:text-[color:var(--on-surface)]"
                >
                  <span className="rule-label tabular-nums">{String(i + 1).padStart(2, '0')}</span>
                  {s.titulo}
                </a>
              </li>
            ))}
          </ol>
        </div>
      </nav>

      <div className="grid min-w-0 gap-14">
        {/* 1. Veredicto */}
        <header id="news-veredicto" className="scroll-mt-28">
          <div className="flex flex-wrap items-center gap-3">
            {a.prioridade && (
              <span className={cn('rule-label px-2.5 py-1', TOM_PRIORIDADE[a.prioridade])}>
                {t(RELATORIO.prioridade, idioma)}: {t(ROTULO_PRIORIDADE[a.prioridade], idioma)}
              </span>
            )}
            {a.titulo.regiao && (
              <span lang={lc} className="rule-label text-[color:var(--muted)]">
                {a.titulo.regiao}
              </span>
            )}
            {(a.titulo.fonte || a.titulo.data) && (
              <span className="text-sm text-[color:var(--muted)]">
                {[a.titulo.fonte, a.titulo.data].filter(Boolean).join(' · ')}
              </span>
            )}
          </div>
          <h2
            id="news-titulo"
            ref={tituloRef}
            tabIndex={-1}
            lang={a.titulo.titulo ? lc : undefined}
            className="mt-5 max-w-[30ch] scroll-mt-40 text-[length:var(--text-h2)] leading-[var(--leading-heading)] font-bold tracking-[var(--tracking-heading)] outline-none"
          >
            {a.titulo.titulo || t(RELATORIO.semTitulo, idioma)}
          </h2>
          {a.sectores.length > 0 && (
            <ul className="mt-5 flex flex-wrap gap-2" role="list" lang={lc}>
              {a.sectores.map((s, i) => (
                <li key={i} className="border border-[color:var(--border)] px-2.5 py-1 text-sm">
                  {s}
                </li>
              ))}
            </ul>
          )}

          {incompleto && (
            <div role="note" className="mt-8 border-l-2 border-[color:var(--signal)] pl-4 text-sm">
              <p className="rule-label text-[color:var(--signal)]">{t(RELATORIO.incompleto, idioma)}</p>
              {a.seccoesEmFalta.length > 0 && (
                <p className="mt-2 text-[color:var(--muted)]">
                  {t(RELATORIO.emFalta, idioma)}{' '}
                  {a.seccoesEmFalta.map((s) => t(RELATORIO.nomesSeccao[s], idioma)).join(', ')}.
                </p>
              )}
              {a.descartados > 0 && (
                <p className="mt-1 text-[color:var(--muted)]">
                  {t(RELATORIO.descartados, idioma).replace('{n}', String(a.descartados))}
                </p>
              )}
            </div>
          )}

          <dl className="mt-10 grid grid-cols-2 border-t border-l border-[color:var(--border)] md:grid-cols-4">
            {metricas.map((m) => (
              <div key={m.rotulo} className="border-r border-b border-[color:var(--border)] p-4 sm:p-5">
                <dt className="rule-label text-[color:var(--muted)]">{m.rotulo}</dt>
                <dd
                  className={cn(
                    'mt-3 font-[family-name:var(--font-techno)] text-2xl tabular-nums sm:text-3xl',
                    m.negativo && 'text-[color:var(--signal)]',
                  )}
                >
                  {m.valor}
                </dd>
                {m.detalhe && (
                  <dd lang={lc} className="mt-1 truncate text-sm text-[color:var(--muted)]">
                    {m.detalhe}
                  </dd>
                )}
              </div>
            ))}
          </dl>
          <details className="mt-4 text-sm text-[color:var(--muted)]">
            <summary className="cursor-pointer underline-offset-4 hover:underline">
              {t(RELATORIO.comoCalculamos, idioma)}
            </summary>
            <ul className="mt-3 grid gap-1.5" role="list">
              {RELATORIO.formulas.map((f) => (
                <li key={f.pt}>{t(f, idioma)}</li>
              ))}
            </ul>
            <p className="mt-2">{t(RELATORIO.notaFormulas, idioma)}</p>
          </details>

          <div className="mt-8 flex flex-wrap gap-3 print:hidden">
            <button type="button" onClick={copiar} className={buttonVariants({ variant: 'outline', size: 'sm' })}>
              {t(RELATORIO.copiar, idioma)}
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className={buttonVariants({ variant: 'outline', size: 'sm' })}
            >
              {t(RELATORIO.imprimir, idioma)}
            </button>
          </div>
          <p role="status" className="mt-2 min-h-5 text-sm text-[color:var(--muted)] print:hidden">
            {copia === 'ok' ? t(RELATORIO.copiado, idioma) : copia === 'falhou' ? t(RELATORIO.copiarFalhou, idioma) : ''}
          </p>
        </header>

        {/* 2. Resumo e interpretação */}
        {mostra('news-resumo') && (
          <Bloco id="news-resumo" titulo={titulo('news-resumo')}>
            {a.resumo.length > 0 && (
              <ol className="grid gap-4" lang={lc}>
                {a.resumo.map((r, i) => (
                  <li key={i} className="flex gap-5">
                    <span className="rule-label shrink-0 pt-1 tabular-nums">{String(i + 1).padStart(2, '0')}</span>
                    <span className="text-[length:var(--text-lead)]">{r}</span>
                  </li>
                ))}
              </ol>
            )}
            {a.interpretacao && (
              <div className="mt-10 grid gap-8 md:grid-cols-2">
                {a.interpretacao.oQue && (
                  <div>
                    <p className="rule-label text-[color:var(--muted)]">{t(RELATORIO.oQue, idioma)}</p>
                    <p lang={lc} className="mt-3">
                      {a.interpretacao.oQue}
                    </p>
                  </div>
                )}
                {a.interpretacao.porque && (
                  <div>
                    <p className="rule-label text-[color:var(--muted)]">{t(RELATORIO.porque, idioma)}</p>
                    <p lang={lc} className="mt-3">
                      {a.interpretacao.porque}
                    </p>
                  </div>
                )}
                {a.interpretacao.sinais.length > 0 && (
                  <div className="md:col-span-2">
                    <p className="rule-label text-[color:var(--muted)]">{t(RELATORIO.sinais, idioma)}</p>
                    <div className="mt-3">
                      <Lista itens={a.interpretacao.sinais} lang={lc} />
                    </div>
                  </div>
                )}
              </div>
            )}
          </Bloco>
        )}

        {/* 3. Impacto */}
        {mostra('news-impacto') && (
          <Bloco id="news-impacto" titulo={titulo('news-impacto')}>
            <BarrasImpacto pontuacoes={a.pontuacoes} idioma={idioma} lang={lc} />
            {a.matriz.length > 0 && (
              <div className="mt-10">
                <p className="rule-label text-[color:var(--muted)]">{t(RELATORIO.matrizTitulo, idioma)}</p>
                {/* Um número ímpar de dimensões deixava uma célula vazia: a última ocupa as duas colunas. */}
                <dl className="mt-4 grid gap-px bg-[color:var(--border)] sm:grid-cols-2 sm:[&>*:last-child:nth-child(odd)]:col-span-2">
                  {a.matriz.map((m, i) => (
                    <div key={i} className="bg-[color:var(--surface)] p-4">
                      <dt className="flex items-baseline gap-2 font-semibold">
                        <span aria-hidden className={m.direcao === 'down' ? 'text-[color:var(--signal)]' : undefined}>
                          {SETA[m.direcao]}
                        </span>
                        {nomeDaDimensao(m.dimensao, idioma)}
                        <span className="sr-only">({t(RELATORIO.direcao[m.direcao], idioma)})</span>
                      </dt>
                      {m.explicacao && (
                        <dd lang={lc} className="mt-1.5 text-sm text-[color:var(--muted)]">
                          {m.explicacao}
                        </dd>
                      )}
                    </div>
                  ))}
                </dl>
              </div>
            )}
          </Bloco>
        )}

        {/* 4. Riscos × oportunidades */}
        {mostra('news-riscos') && (
          <Bloco id="news-riscos" titulo={titulo('news-riscos')}>
            <div className="grid gap-10 md:grid-cols-2">
              <div>
                <p className="rule-label text-[color:var(--signal)]">
                  {t(RELATORIO.riscosTitulo, idioma)} · {faltaRiscos ? semDados : a.riscos.length}
                </p>
                {l.riscosOrdenados.length === 0 ? (
                  <p className="mt-4 text-sm text-[color:var(--muted)]">
                    {faltaRiscos ? semDados : t(RELATORIO.nenhum, idioma)}
                  </p>
                ) : (
                  <ul className="mt-4 grid gap-4" role="list">
                    {l.riscosOrdenados.map((r, i) => (
                      <li key={i} className="border-l-2 border-[color:var(--signal)] pl-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={cn('rule-label px-2 py-0.5', TOM_SEVERIDADE[r.severidade])}>
                            {t(ROTULO_SEVERIDADE[r.severidade], idioma)}
                          </span>
                          <span lang={lc} className="font-semibold">
                            {r.titulo}
                          </span>
                        </div>
                        <p lang={lc} className="mt-2 text-sm text-[color:var(--muted)]">
                          {r.descricao}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <p className="rule-label">
                  {t(RELATORIO.oportunidadesTitulo, idioma)} · {faltaOportunidades ? semDados : a.oportunidades.length}
                </p>
                {a.oportunidades.length === 0 ? (
                  <p className="mt-4 text-sm text-[color:var(--muted)]">
                    {faltaOportunidades ? semDados : t(RELATORIO.nenhum, idioma)}
                  </p>
                ) : (
                  <ul className="mt-4 grid gap-4" role="list" lang={lc}>
                    {a.oportunidades.map((o, i) => (
                      <li key={i} className="border-l-2 border-[color:var(--on-surface)] pl-4">
                        <div className="flex flex-wrap items-center gap-2">
                          {o.accionabilidade && (
                            <span className="rule-label border border-[color:var(--border)] px-2 py-0.5">
                              {o.accionabilidade}
                            </span>
                          )}
                          <span className="font-semibold">{o.titulo}</span>
                        </div>
                        <p className="mt-2 text-sm text-[color:var(--muted)]">{o.descricao}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </Bloco>
        )}

        {/* 5. O que fazer */}
        {mostra('news-acao') && (
          <Bloco id="news-acao" titulo={titulo('news-acao')}>
            <div className="grid gap-px bg-[color:var(--border)] md:grid-cols-3">
              {(
                [
                  [RELATORIO.agir, a.recomendacoes.agir, true],
                  [RELATORIO.monitorizar, a.recomendacoes.monitorizar, false],
                  [RELATORIO.ajustar, a.recomendacoes.ajustar, false],
                ] as const
              ).map(([rotulo, itens, primeiro]) => (
                <div key={rotulo.pt} className="bg-[color:var(--surface)] p-5">
                  <p className={cn('rule-label', primeiro ? 'text-[color:var(--signal)]' : 'text-[color:var(--muted)]')}>
                    {t(rotulo, idioma)}
                  </p>
                  <div className="mt-4">
                    {itens.length ? (
                      <Lista itens={itens} lang={lc} />
                    ) : (
                      <p className="text-sm text-[color:var(--muted)]">{t(RELATORIO.nenhum, idioma)}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-8 flex flex-col items-start gap-2 print:hidden">
              <Link href={ligacao('/diagnostico', idioma).href} className={buttonVariants({ variant: 'signal' })}>
                {t(RELATORIO.plano, idioma)}
              </Link>
              <p className="text-sm text-[color:var(--muted)]">{t(RELATORIO.planoNota, idioma)}</p>
            </div>
          </Bloco>
        )}

        {/* 6. Horizonte */}
        {a.horizonte && (
          <Bloco id="news-horizonte" titulo={titulo('news-horizonte')}>
            <dl className="grid gap-8 md:grid-cols-3">
              {(
                [
                  [RELATORIO.curto, a.horizonte.curto],
                  [RELATORIO.medio, a.horizonte.medio],
                  [RELATORIO.provavel, a.horizonte.provavel],
                ] as const
              )
                .filter(([, v]) => v)
                .map(([rotulo, v]) => (
                  <div key={rotulo.pt} className="border-t border-[color:var(--border)] pt-4">
                    <dt className="rule-label text-[color:var(--muted)]">{t(rotulo, idioma)}</dt>
                    <dd lang={lc} className="mt-3">
                      {v}
                    </dd>
                  </div>
                ))}
            </dl>
          </Bloco>
        )}

        {/* 7. Cadeias de sinal */}
        {mostra('news-cadeias') && (
          <Bloco id="news-cadeias" titulo={titulo('news-cadeias')}>
            <ul className="grid gap-3" role="list">
              {a.cadeias.map((c, i) => (
                <li
                  key={i}
                  className="flex flex-col gap-2 border border-[color:var(--border)] p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <span lang={lc} className="font-[family-name:var(--font-techno)] text-sm">
                    {c.cadeia}
                  </span>
                  <span
                    className={cn(
                      'rule-label shrink-0',
                      c.tipo === 'growth' ? 'text-[color:var(--on-surface)]' : 'text-[color:var(--signal)]',
                    )}
                  >
                    {t(ROTULO_CADEIA[c.tipo], idioma)}
                  </span>
                </li>
              ))}
            </ul>
          </Bloco>
        )}

        {/* 8. Leitura económica */}
        {a.economia && (
          <Bloco id="news-economia" titulo={titulo('news-economia')}>
            <dl className="grid gap-8 md:grid-cols-3">
              {(
                [
                  [RELATORIO.macro, a.economia.macro],
                  [RELATORIO.meso, a.economia.meso],
                  [RELATORIO.micro, a.economia.micro],
                ] as const
              )
                .filter(([, v]) => v)
                .map(([rotulo, v]) => (
                  <div key={rotulo.pt} className="border-t border-[color:var(--border)] pt-4">
                    <dt className="rule-label text-[color:var(--muted)]">{t(rotulo, idioma)}</dt>
                    <dd lang={lc} className="mt-3 text-sm">
                      {v}
                    </dd>
                  </div>
                ))}
            </dl>
          </Bloco>
        )}

        {/* 9. Estratégias */}
        {a.estrategias && (
          <Bloco id="news-estrategias" titulo={titulo('news-estrategias')}>
            <dl className="grid gap-8 md:grid-cols-2">
              {(
                [
                  [RELATORIO.red, a.estrategias.red],
                  [RELATORIO.blue, a.estrategias.blue],
                  [RELATORIO.paralelos, a.estrategias.paralelos],
                ] as const
              )
                .filter(([, v]) => v)
                .map(([rotulo, v], i) => (
                  <div key={rotulo.pt} className={cn('border-t border-[color:var(--border)] pt-4', i === 2 && 'md:col-span-2')}>
                    <dt className="rule-label text-[color:var(--muted)]">{t(rotulo, idioma)}</dt>
                    <dd lang={lc} className="mt-3 text-sm">
                      {v}
                    </dd>
                  </div>
                ))}
            </dl>
          </Bloco>
        )}

        {/* 10. Perguntas por indústria */}
        {mostra('news-perguntas') && (
          <Bloco id="news-perguntas" titulo={titulo('news-perguntas')}>
            <ul className="grid gap-6" role="list" lang={lc}>
              {a.perguntas.map((p, i) => (
                <li key={i} className="grid gap-2 border-l-2 border-[color:var(--border)] pl-4">
                  <span className="rule-label text-[color:var(--muted)]">{p.industria}</span>
                  <span className="font-semibold">{p.pergunta}</span>
                  <span className="text-sm text-[color:var(--muted)]">{p.insight}</span>
                </li>
              ))}
            </ul>
          </Bloco>
        )}

        <footer className="rule grid gap-2 pt-5 text-sm text-[color:var(--muted)]">
          {/* Dentro do artigo de propósito: o aviso sai também na versão impressa. */}
          <p>{t(NEWS.aviso, idioma)}</p>
          <p className="rule-label">{MARCA_NEWS}</p>
        </footer>
      </div>
    </article>
  );
}
