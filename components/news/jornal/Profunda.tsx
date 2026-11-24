import type { Idioma } from '@/content/types';
import { NOME_DO_PAIS } from '@/lib/news/paises';
import {
  NOME_EVIDENCIA,
  NOME_TIPO,
  type AnaliseProfunda,
  type Evidencia,
  type TipoAfirmacao,
} from '@/lib/news/profunda';
import { SeloPais } from './SeloPais';

/**
 * A análise profunda ZABATAINA 3000 como secção editorial do jornal: página
 * invertida (preto), o selo do país, o impacto em destaque, e as secções dos
 * agentes em colunas com filetes. Cada afirmação leva a etiqueta de evidência
 * (E1–E4) e o tipo (facto, estimativa, hipótese…), como no ZABATAINA 3000.
 */

const T = {
  titulo: { pt: 'Análise profunda', en: 'Deep analysis' },
  impacto: { pt: 'Impacto em', en: 'Impact on' },
  nivel: {
    alto: { pt: 'Impacto alto', en: 'High impact' },
    medio: { pt: 'Impacto médio', en: 'Medium impact' },
    baixo: { pt: 'Impacto baixo', en: 'Low impact' },
  },
  sectores: { pt: 'Sectores', en: 'Sectors' },
  riscos: { pt: 'Riscos', en: 'Risks' },
  oportunidades: { pt: 'Oportunidades', en: 'Opportunities' },
  cenarios: { pt: 'Cenários', en: 'Scenarios' },
  base: { pt: 'Base', en: 'Base case' },
  optimista: { pt: 'Optimista', en: 'Optimistic' },
  pessimista: { pt: 'Pessimista', en: 'Pessimistic' },
  gatilhos: { pt: 'Gatilhos', en: 'Triggers' },
  indicadores: { pt: 'Indicadores a vigiar', en: 'Indicators to watch' },
  accoes: { pt: 'Acções recomendadas', en: 'Recommended actions' },
  efeito: {
    positivo: { pt: 'Positivo', en: 'Positive' },
    negativo: { pt: 'Negativo', en: 'Negative' },
    misto: { pt: 'Misto', en: 'Mixed' },
    incerto: { pt: 'Incerto', en: 'Uncertain' },
  },
  prob: {
    alta: { pt: 'Probabilidade alta', en: 'High likelihood' },
    media: { pt: 'Probabilidade média', en: 'Medium likelihood' },
    baixa: { pt: 'Probabilidade baixa', en: 'Low likelihood' },
  },
  prazo: {
    imediato: { pt: 'Imediato', en: 'Now' },
    '30-dias': { pt: 'Em 30 dias', en: 'Within 30 days' },
    '90-dias': { pt: 'Em 90 dias', en: 'Within 90 days' },
  },
  nota: {
    pt: 'Gerada pelos agentes ZABATAINA 3000 a partir do documento da notícia e revista pela redacção. Os números vêm só da fonte; o que trazia outros foi retirado. E1 fonte primária · E2 secundária forte · E3 de apoio · E4 exploratória.',
    en: 'Produced by the ZABATAINA 3000 agents from the news document and reviewed by our desk. Numbers come only from the source; anything with other numbers was removed. E1 primary source · E2 strong secondary · E3 supporting · E4 exploratory.',
  },
} as const;

const l = (x: { pt: string; en: string }, i: Idioma) => (i === 'en' ? x.en : x.pt);

function Etiqueta({ e, tipo, idioma }: { e: Evidencia; tipo: TipoAfirmacao; idioma: Idioma }) {
  return (
    <span
      className="ml-2 inline-flex items-center gap-1 border border-current/40 px-1.5 py-px align-middle font-sans text-[0.6875rem] font-medium tracking-[0.06em] whitespace-nowrap uppercase"
      title={l(NOME_EVIDENCIA[e], idioma)}
    >
      {e} · {l(NOME_TIPO[tipo], idioma)}
    </span>
  );
}

function Rotulo({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="border-t-2 border-current pt-2 font-sans text-[0.75rem] font-semibold tracking-[0.2em] uppercase">
      {children}
    </h3>
  );
}

export function Profunda({ analise: a, idioma }: { analise: AnaliseProfunda; idioma: Idioma }) {
  const cenarios = (['base', 'optimista', 'pessimista'] as const).filter((k) => a.cenarios[k]);
  return (
    <section aria-labelledby="profunda-titulo" className="jornal-preto my-12 px-5 py-10 sm:px-10">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-current/30 pb-3">
        <p className="font-sans text-[0.75rem] font-semibold tracking-[0.24em] uppercase">ZABATAINA 3000</p>
        <SeloPais pais={a.pais} idioma={idioma} escuro />
      </div>
      <h2 id="profunda-titulo" className="jornal-serifa mt-6 text-[clamp(2rem,1.4rem+2.6vw,3.25rem)] leading-[1] font-bold tracking-[-0.02em]">
        {l(T.titulo, idioma)}: {l(T.impacto, idioma)} {l(NOME_DO_PAIS[a.pais], idioma)}
      </h2>
      <p className="mt-2 font-sans text-[0.8125rem] tracking-[0.12em] uppercase opacity-80">{l(T.nivel[a.impacto.nivel], idioma)}</p>
      <p className="jornal-serifa jornal-capitular mt-6 text-[1.25rem] leading-[1.55]">
        {a.impacto.resumo}
        <Etiqueta e={a.impacto.evidencia} tipo={a.impacto.tipo} idioma={idioma} />
      </p>

      {a.sectores.length > 0 && (
        <div className="mt-10">
          <Rotulo>{l(T.sectores, idioma)}</Rotulo>
          <ul className="jornal-colunas jornal-colunas-2 mt-4">
            {a.sectores.map((s) => (
              <li key={s.nome} className="mb-5 break-inside-avoid">
                <p className="jornal-serifa text-[1.125rem] font-bold">
                  {s.nome} <span className="font-sans text-[0.75rem] font-medium tracking-[0.08em] uppercase opacity-80">· {l(T.efeito[s.efeito], idioma)}</span>
                </p>
                <p className="jornal-serifa mt-1 text-[1.0625rem] leading-relaxed">
                  {s.explicacao}
                  <Etiqueta e={s.evidencia} tipo={s.tipo} idioma={idioma} />
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {(a.riscos.length > 0 || a.oportunidades.length > 0) && (
        <div className="mt-10 grid gap-10 md:grid-cols-2 md:gap-0 md:divide-x md:divide-current/25">
          {a.riscos.length > 0 && (
            <div className="md:pr-8">
              <Rotulo>{l(T.riscos, idioma)}</Rotulo>
              <ul className="mt-4 grid gap-5">
                {a.riscos.map((r) => (
                  <li key={r.titulo}>
                    <p className="jornal-serifa text-[1.125rem] font-bold">{r.titulo}</p>
                    <p className="font-sans text-[0.75rem] tracking-[0.08em] uppercase opacity-80">{l(T.prob[r.probabilidade], idioma)}</p>
                    <p className="jornal-serifa mt-1 text-[1.0625rem] leading-relaxed">
                      {r.descricao}
                      <Etiqueta e={r.evidencia} tipo={r.tipo} idioma={idioma} />
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {a.oportunidades.length > 0 && (
            <div className="md:pl-8">
              <Rotulo>{l(T.oportunidades, idioma)}</Rotulo>
              <ul className="mt-4 grid gap-5">
                {a.oportunidades.map((o) => (
                  <li key={o.titulo}>
                    <p className="jornal-serifa text-[1.125rem] font-bold">{o.titulo}</p>
                    <p className="jornal-serifa mt-1 text-[1.0625rem] leading-relaxed">
                      {o.descricao}
                      <Etiqueta e={o.evidencia} tipo={o.tipo} idioma={idioma} />
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {cenarios.length > 0 && (
        <div className="mt-10">
          <Rotulo>{l(T.cenarios, idioma)}</Rotulo>
          <div className="mt-4 grid gap-6 md:grid-cols-3 md:gap-0 md:divide-x md:divide-current/25">
            {cenarios.map((k, i) => {
              const c = a.cenarios[k]!;
              return (
                <div key={k} className={i > 0 ? 'md:pl-6' : 'md:pr-6'}>
                  <p className="jornal-serifa text-[1.375rem] font-bold italic">{l(T[k], idioma)}</p>
                  <p className="jornal-serifa mt-2 text-[1.0625rem] leading-relaxed">{c.descricao}</p>
                  {c.gatilhos.length > 0 && (
                    <>
                      <p className="mt-3 font-sans text-[0.75rem] font-semibold tracking-[0.14em] uppercase opacity-80">
                        {l(T.gatilhos, idioma)}
                      </p>
                      <ul className="mt-1 list-disc pl-5 jornal-serifa text-[1rem] leading-relaxed">
                        {c.gatilhos.map((g) => (
                          <li key={g}>{g}</li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {(a.indicadores.length > 0 || a.accoes.length > 0) && (
        <div className="mt-10 grid gap-10 md:grid-cols-2 md:gap-0 md:divide-x md:divide-current/25">
          {a.indicadores.length > 0 && (
            <div className="md:pr-8">
              <Rotulo>{l(T.indicadores, idioma)}</Rotulo>
              <ol className="mt-4 grid gap-3">
                {a.indicadores.map((x, i) => (
                  <li key={x.nome} className="flex gap-3">
                    <span aria-hidden="true" className="jornal-serifa text-[1.5rem] leading-none font-bold opacity-60">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <p className="jornal-serifa text-[1.0625rem] leading-relaxed">
                      <strong>{x.nome}.</strong> {x.porque}
                    </p>
                  </li>
                ))}
              </ol>
            </div>
          )}
          {a.accoes.length > 0 && (
            <div className="md:pl-8">
              <Rotulo>{l(T.accoes, idioma)}</Rotulo>
              <ul className="mt-4 grid gap-4">
                {a.accoes.map((x) => (
                  <li key={x.accao} className="border-l-2 border-current pl-3">
                    <p className="font-sans text-[0.75rem] font-semibold tracking-[0.12em] uppercase opacity-80">
                      {l(T.prazo[x.prazo], idioma)} · {x.paraQuem}
                    </p>
                    <p className="jornal-serifa mt-1 text-[1.0625rem] leading-relaxed">{x.accao}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <p className="mt-10 border-t border-current/30 pt-4 font-sans text-[0.75rem] leading-relaxed opacity-80">{l(T.nota, idioma)}</p>
    </section>
  );
}
