import type { Idioma } from '@/content/types';
import { RELATORIO, ROTULO_CADEIA, ROTULO_SEVERIDADE } from '@/content/i18n/news';
import { t } from '@/lib/i18n/texto';
import type { Analise } from '@/lib/news/esquema';
import { ler } from '@/lib/news/leitura';
import { BarrasImpacto } from '../BarrasImpacto';
import { assinado } from '../formato';

/**
 * O corpo de um artigo: a análise do motor escrita como jornal — entrelinha
 * de leitura longa em serifa, intertítulos curtos, números em techno. Só
 * mostra o que a análise traz; uma secção vazia não aparece (nunca «0»).
 *
 * `meio` é o espaço do anúncio a meio do artigo (depois do impacto).
 */

function Intertitulo({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2
      id={id}
      className="mt-12 mb-4 scroll-mt-28 border-t border-[color:var(--on-surface)] pt-3 font-display text-[length:var(--text-micro)] font-semibold tracking-[0.18em] uppercase"
    >
      {children}
    </h2>
  );
}

function Paragrafo({ children }: { children: React.ReactNode }) {
  return (
    <p className="jornal-serifa mt-4 text-[1.1875rem] leading-[1.7] text-pretty first:mt-0">
      {children}
    </p>
  );
}

function Lista({ itens }: { itens: readonly string[] }) {
  return (
    <ul className="jornal-serifa mt-3 grid gap-2 text-[1.0625rem] leading-relaxed">
      {itens.map((x, i) => (
        <li key={`${i}-${x.slice(0, 24)}`} className="flex gap-3">
          <span
            aria-hidden="true"
            className="mt-[0.7em] size-1.5 shrink-0 bg-[color:var(--color-signal-600)]"
          />
          <span>{x}</span>
        </li>
      ))}
    </ul>
  );
}

const SUBTITULO = 'font-display text-[1.0625rem] font-bold';
const ROTULO_TECHNO =
  'font-techno text-[length:var(--text-micro)] font-semibold tracking-[0.12em] uppercase';

export function ArtigoCorpo({
  analise: a,
  idioma,
  meio,
}: {
  analise: Analise;
  idioma: Idioma;
  meio?: React.ReactNode;
}) {
  const l = ler(a);
  const indicadores: [string, string | number | null][] = [
    [t(RELATORIO.impactoLiquido, idioma), l.impactoLiquido === null ? null : assinado(l.impactoLiquido)],
    [t(RELATORIO.cargaRisco, idioma), l.cargaRisco],
    [t(RELATORIO.balanco, idioma), l.balanco === null ? null : assinado(l.balanco)],
    [t(RELATORIO.dimensaoCritica, idioma), l.dimensaoCritica?.dimensao ?? null],
  ];
  const horizonte = a.horizonte
    ? (
        [
          [RELATORIO.curto, a.horizonte.curto],
          [RELATORIO.medio, a.horizonte.medio],
          [RELATORIO.provavel, a.horizonte.provavel],
        ] as const
      ).filter(([, v]) => Boolean(v))
    : [];
  const accoes = (
    [
      [RELATORIO.agir, a.recomendacoes.agir],
      [RELATORIO.monitorizar, a.recomendacoes.monitorizar],
      [RELATORIO.ajustar, a.recomendacoes.ajustar],
    ] as const
  ).filter(([, itens]) => itens.length > 0);
  const economia = a.economia
    ? (
        [
          [RELATORIO.macro, a.economia.macro],
          [RELATORIO.meso, a.economia.meso],
          [RELATORIO.micro, a.economia.micro],
        ] as const
      ).filter(([, v]) => Boolean(v))
    : [];
  const estrategias = a.estrategias
    ? (
        [
          [RELATORIO.red, a.estrategias.red],
          [RELATORIO.blue, a.estrategias.blue],
          [RELATORIO.paralelos, a.estrategias.paralelos],
        ] as const
      ).filter(([, v]) => Boolean(v))
    : [];

  return (
    <div className="max-w-[44rem]">
      {a.resumo.length > 0 && (
        <>
          <Intertitulo id="artigo-essencial">
            {idioma === 'en' ? 'The essentials' : 'O essencial'}
          </Intertitulo>
          <Lista itens={a.resumo} />
        </>
      )}

      {(a.interpretacao?.oQue || a.interpretacao?.porque) && (
        <>
          <Intertitulo id="artigo-leitura">{t(RELATORIO.oQue, idioma)}</Intertitulo>
          {a.interpretacao?.oQue && <Paragrafo>{a.interpretacao.oQue}</Paragrafo>}
          {a.interpretacao?.porque && (
            <>
              <h3 className={`mt-8 ${SUBTITULO}`}>{t(RELATORIO.porque, idioma)}</h3>
              <Paragrafo>{a.interpretacao.porque}</Paragrafo>
            </>
          )}
        </>
      )}
      {a.interpretacao && a.interpretacao.sinais.length > 0 && (
        <aside className="mt-8 border-l-4 border-[color:var(--color-energy-500)] bg-[color:var(--surface-raised)] px-5 py-4">
          <p className={ROTULO_TECHNO}>{t(RELATORIO.sinais, idioma)}</p>
          <Lista itens={a.interpretacao.sinais} />
        </aside>
      )}

      {a.pontuacoes.length > 0 && (
        <>
          <Intertitulo id="artigo-impacto">{t(RELATORIO.seccoes.impacto, idioma)}</Intertitulo>
          <dl className="mb-6 grid grid-cols-2 gap-px border border-[color:var(--border)] bg-[color:var(--border)] sm:grid-cols-4">
            {indicadores.map(([rotulo, valor]) => (
              <div key={rotulo} className="bg-[color:var(--surface)] p-4">
                <dt className="text-[length:var(--text-micro)] tracking-[0.12em] text-[color:var(--muted)] uppercase">
                  {rotulo}
                </dt>
                <dd className="mt-1 font-techno text-lg font-semibold tabular-nums">
                  {valor ?? t(RELATORIO.semDados, idioma)}
                </dd>
              </div>
            ))}
          </dl>
          <BarrasImpacto pontuacoes={a.pontuacoes} idioma={idioma} />
        </>
      )}

      {meio}

      {(a.riscos.length > 0 || a.oportunidades.length > 0) && (
        <>
          <Intertitulo id="artigo-riscos">{t(RELATORIO.seccoes.riscos, idioma)}</Intertitulo>
          <div className="grid gap-8 md:grid-cols-2">
            <div>
              <h3 className={SUBTITULO}>{t(RELATORIO.riscosTitulo, idioma)}</h3>
              {l.riscosOrdenados.length === 0 ? (
                <p className="mt-2 text-sm text-[color:var(--muted)]">{t(RELATORIO.nenhum, idioma)}</p>
              ) : (
                <ul className="mt-3 grid gap-4">
                  {l.riscosOrdenados.map((r, i) => (
                    <li key={`${i}-${r.titulo}`} className="border-t border-[color:var(--border)] pt-3">
                      <p className="flex flex-wrap items-baseline gap-2">
                        <span className={`${ROTULO_TECHNO} text-[color:var(--color-signal-700)]`}>
                          {t(ROTULO_SEVERIDADE[r.severidade], idioma)}
                        </span>
                        <span className="font-semibold">{r.titulo}</span>
                      </p>
                      <p className="jornal-serifa mt-1 leading-relaxed">{r.descricao}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <h3 className={SUBTITULO}>{t(RELATORIO.oportunidadesTitulo, idioma)}</h3>
              {a.oportunidades.length === 0 ? (
                <p className="mt-2 text-sm text-[color:var(--muted)]">{t(RELATORIO.nenhum, idioma)}</p>
              ) : (
                <ul className="mt-3 grid gap-4">
                  {a.oportunidades.map((o, i) => (
                    <li key={`${i}-${o.titulo}`} className="border-t border-[color:var(--border)] pt-3">
                      <p className="font-semibold">{o.titulo}</p>
                      <p className="jornal-serifa mt-1 leading-relaxed">{o.descricao}</p>
                      {o.accionabilidade && (
                        <p className="mt-1 text-sm text-[color:var(--muted)]">{o.accionabilidade}</p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      )}

      {horizonte.length > 0 && (
        <>
          <Intertitulo id="artigo-horizonte">{t(RELATORIO.seccoes.horizonte, idioma)}</Intertitulo>
          <dl className="grid gap-5 sm:grid-cols-3">
            {horizonte.map(([rotulo, v]) => (
              <div key={t(rotulo, idioma)}>
                <dt className={ROTULO_TECHNO}>{t(rotulo, idioma)}</dt>
                <dd className="jornal-serifa mt-2 leading-relaxed">{v}</dd>
              </div>
            ))}
          </dl>
        </>
      )}

      {accoes.length > 0 && (
        <>
          <Intertitulo id="artigo-accao">{t(RELATORIO.seccoes.acao, idioma)}</Intertitulo>
          <div className="grid gap-6 md:grid-cols-3">
            {accoes.map(([rotulo, itens]) => (
              <div key={t(rotulo, idioma)}>
                <h3 className={SUBTITULO}>{t(rotulo, idioma)}</h3>
                <Lista itens={itens} />
              </div>
            ))}
          </div>
        </>
      )}

      {economia.length > 0 && (
        <>
          <Intertitulo id="artigo-economia">{t(RELATORIO.seccoes.economia, idioma)}</Intertitulo>
          {economia.map(([rotulo, v]) => (
            <div key={t(rotulo, idioma)} className="mt-6 first:mt-0">
              <h3 className={SUBTITULO}>{t(rotulo, idioma)}</h3>
              <Paragrafo>{v}</Paragrafo>
            </div>
          ))}
        </>
      )}

      {a.cadeias.length > 0 && (
        <>
          <Intertitulo id="artigo-cadeias">{t(RELATORIO.seccoes.cadeias, idioma)}</Intertitulo>
          <ol className="grid gap-3">
            {a.cadeias.map((c, i) => (
              <li key={`${i}-${c.cadeia.slice(0, 24)}`} className="border-l-2 border-[color:var(--border)] pl-4">
                <span className={`${ROTULO_TECHNO} text-[color:var(--muted)]`}>
                  {t(ROTULO_CADEIA[c.tipo], idioma)}
                </span>
                <p className="jornal-serifa leading-relaxed">{c.cadeia}</p>
              </li>
            ))}
          </ol>
        </>
      )}

      {estrategias.length > 0 && (
        <>
          <Intertitulo id="artigo-estrategias">{t(RELATORIO.seccoes.estrategias, idioma)}</Intertitulo>
          {estrategias.map(([rotulo, v]) => (
            <div key={t(rotulo, idioma)} className="mt-6 first:mt-0">
              <h3 className={SUBTITULO}>{t(rotulo, idioma)}</h3>
              <Paragrafo>{v}</Paragrafo>
            </div>
          ))}
        </>
      )}

      {a.perguntas.length > 0 && (
        <>
          <Intertitulo id="artigo-perguntas">{t(RELATORIO.seccoes.perguntas, idioma)}</Intertitulo>
          <ul className="grid gap-5">
            {a.perguntas.map((p, i) => (
              <li key={`${i}-${p.pergunta.slice(0, 24)}`}>
                <p className={`${ROTULO_TECHNO} text-[color:var(--muted)]`}>{p.industria}</p>
                <p className="jornal-serifa mt-1 text-[1.125rem] leading-snug font-medium">{p.pergunta}</p>
                <p className="mt-1 text-sm leading-relaxed text-[color:var(--muted)]">{p.insight}</p>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
