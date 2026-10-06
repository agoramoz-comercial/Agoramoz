import Link from 'next/link';
import { Container } from '@/components/ui/Container';
import { ROTULO_PRIORIDADE } from '@/content/i18n/news';
import type { Idioma } from '@/content/types';
import { fonteJornal } from '@/lib/fonts/jornal';
import { t } from '@/lib/i18n/texto';
import type { AnuncioPublico } from '@/lib/news/anuncios';
import { NOME_DA_SECCAO, SECCOES_JORNAL, type ArtigoDaLista, type SeccaoJornal } from '@/lib/news/artigo';
import { Outdoor } from '../Outdoor';
import { CaixaManchetes } from './CaixaManchetes';
import { caminhoDoArtigo, caminhoDoJornal } from './ligacoes';

/**
 * A primeira página do AGORAMOZ News — um jornal de negócios à maneira do WSJ
 * e da Bloomberg: cabeça com data, secções, faixa de últimas, manchete com
 * coluna, grelha e «mais gostados». Tudo vem do que a redacção publicou; o
 * que não existe não se finge (sem cotações, sem contagens inventadas).
 */

const TEXTO = {
  slogan: {
    pt: 'Análise de negócio para quem decide em Moçambique e nos mercados lusófonos.',
    en: 'Business analysis for decision-makers in Mozambique and Portuguese-speaking markets.',
  },
  tudo: { pt: 'Tudo', en: 'All' },
  ultimas: { pt: 'Últimas', en: 'Latest' },
  destaque: { pt: 'Em destaque', en: 'Top stories' },
  maisGostados: { pt: 'Mais gostados', en: 'Most liked' },
  maisArtigos: { pt: 'Mais análises', en: 'More analysis' },
  vazio: {
    pt: 'Ainda sem artigos publicados nesta secção.',
    en: 'No articles published in this section yet.',
  },
  falhou: {
    pt: 'Não foi possível carregar o jornal agora. Tente de novo dentro de momentos.',
    en: 'We could not load the newspaper right now. Please try again shortly.',
  },
  gostos: { pt: 'gostos', en: 'likes' },
  edicao: { pt: 'Edição em português', en: 'English edition' },
  outraEdicao: { pt: 'English edition', en: 'Edição em português' },
  secoes: { pt: 'Secções do jornal', en: 'Newspaper sections' },
} as const;

function dataCurta(iso: string, idioma: Idioma): string {
  return new Intl.DateTimeFormat(idioma === 'en' ? 'en-GB' : 'pt-PT', {
    timeZone: 'Africa/Maputo',
    day: 'numeric',
    month: 'short',
  }).format(new Date(iso));
}

function Seccao({ seccao, idioma }: { seccao: SeccaoJornal; idioma: Idioma }) {
  return (
    <span className="font-techno text-[length:var(--text-micro)] font-semibold tracking-[0.18em] text-[color:var(--color-signal-700)] uppercase">
      {NOME_DA_SECCAO[seccao][idioma]}
    </span>
  );
}

function Prioridade({ a, idioma }: { a: ArtigoDaLista; idioma: Idioma }) {
  if (a.prioridade !== 'critical' && a.prioridade !== 'high') return null;
  return (
    <span className="border border-current px-1.5 py-0.5 font-techno text-[0.625rem] font-semibold tracking-[0.14em] uppercase">
      {t(ROTULO_PRIORIDADE[a.prioridade], idioma)}
    </span>
  );
}

function Meta({ a, idioma }: { a: ArtigoDaLista; idioma: Idioma }) {
  return (
    <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[length:var(--text-micro)] tracking-[0.06em] text-[color:var(--muted)] uppercase">
      <time dateTime={a.publicado_em}>{dataCurta(a.publicado_em, idioma)}</time>
      {a.gostos > 0 && (
        <span className="tabular-nums">
          {a.gostos.toLocaleString(idioma === 'en' ? 'en-GB' : 'pt-PT')} {t(TEXTO.gostos, idioma)}
        </span>
      )}
      <Prioridade a={a} idioma={idioma} />
    </p>
  );
}

export function Jornal({
  idioma,
  artigos,
  anuncios,
  seccao,
  hoje,
}: {
  idioma: Idioma;
  /** `null` quando a leitura falhou — nunca uma lista vazia a fingir «sem notícias». */
  artigos: readonly ArtigoDaLista[] | null;
  anuncios: readonly AnuncioPublico[];
  seccao: SeccaoJornal | null;
  /** A data por extenso (Maputo), calculada na página. */
  hoje: string;
}) {
  const lista = artigos ?? [];
  const [manchete, ...resto] = lista;
  const destaque = resto.slice(0, 4);
  const grelha = resto.slice(4);
  const gostados = [...lista]
    .filter((a) => a.gostos > 0)
    .sort((x, y) => y.gostos - x.gostos)
    .slice(0, 5);
  const ultimas = lista.slice(0, 10);

  return (
    <div
      className={`${fonteJornal.variable} bg-[color:var(--surface)] pb-24 text-[color:var(--on-surface)]`}
      data-surface="light"
    >
      {/* Cabeça do jornal */}
      <Container as="header" className="pt-10">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[color:var(--border)] pb-3 text-[length:var(--text-micro)] tracking-[0.08em] text-[color:var(--muted)] uppercase">
          <span>{hoje}</span>
          <span className="flex items-center gap-4">
            <span>{t(TEXTO.edicao, idioma)}</span>
            <Link
              href={idioma === 'en' ? '/news' : '/en/news'}
              className="underline-offset-4 hover:underline"
              hrefLang={idioma === 'en' ? 'pt' : 'en'}
              lang={idioma === 'en' ? 'pt' : 'en'}
            >
              {t(TEXTO.outraEdicao, idioma)}
            </Link>
            <a
              href={idioma === 'en' ? '/en/news/feed.xml' : '/news/feed.xml'}
              type="application/rss+xml"
              className="underline-offset-4 hover:underline"
            >
              RSS
            </a>
          </span>
        </div>
        <h1 className="mt-6 font-display text-[clamp(2.75rem,1.4rem+6vw,6.5rem)] leading-[0.9] font-black tracking-[-0.045em] uppercase">
          AGORAMOZ <span className="text-[color:var(--color-signal-600)]">News</span>
        </h1>
        <p className="jornal-serifa mt-3 max-w-[60ch] text-[1.0625rem] text-[color:var(--muted)] italic">
          {t(TEXTO.slogan, idioma)}
        </p>
        <div className="jornal-regra mt-6" />
        <nav aria-label={t(TEXTO.secoes, idioma)} className="overflow-x-auto">
          <ul className="flex min-w-max gap-1 border-b border-[color:var(--border)] py-2">
            {[null, ...SECCOES_JORNAL].map((s) => {
              const activa = s === seccao;
              return (
                <li key={s ?? 'tudo'}>
                  <Link
                    href={caminhoDoJornal(idioma, s)}
                    aria-current={activa ? 'page' : undefined}
                    className={`inline-flex min-h-11 items-center px-3 font-display text-sm font-semibold whitespace-nowrap ${
                      activa
                        ? 'bg-[color:var(--on-surface)] text-[color:var(--surface)]'
                        : 'hover:bg-[color:var(--surface-raised)]'
                    }`}
                  >
                    {s ? NOME_DA_SECCAO[s][idioma] : t(TEXTO.tudo, idioma)}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </Container>

      {/* Faixa de últimas: os nossos títulos, nunca cotações inventadas */}
      {ultimas.length > 0 && (
        <CaixaManchetes idioma={idioma}>
          <span className="flex shrink-0 items-center bg-[color:var(--color-signal-600)] px-3 font-techno text-[length:var(--text-micro)] font-semibold tracking-[0.18em] text-white uppercase">
            {t(TEXTO.ultimas, idioma)}
          </span>
          <div className="relative min-w-0 flex-1 overflow-hidden">
            <ul className="jornal-manchetes flex w-max py-2.5">
              {[0, 1].map((copia) =>
                ultimas.map((a) => (
                  <li
                    key={`${copia}-${a.id}`}
                    aria-hidden={copia === 1 ? true : undefined}
                    className={`flex items-center whitespace-nowrap ${copia === 1 ? 'jornal-manchetes-copia' : ''}`}
                  >
                    <Link
                      href={caminhoDoArtigo(a.slug, idioma)}
                      tabIndex={copia === 1 ? -1 : undefined}
                      className="px-5 text-sm hover:underline"
                    >
                      <span className="mr-2 font-techno text-[length:var(--text-micro)] text-[color:var(--color-energy-500)] uppercase">
                        {NOME_DA_SECCAO[a.seccao][idioma]}
                      </span>
                      {a.titulo}
                    </Link>
                    <span aria-hidden="true" className="text-[color:var(--color-steel-600)]">
                      ◆
                    </span>
                  </li>
                )),
              )}
            </ul>
          </div>
        </CaixaManchetes>
      )}

      {anuncios.length > 0 && (
        <Container className="mt-8">
          <Outdoor idioma={idioma} anuncios={anuncios} posicao="topo" />
        </Container>
      )}

      <Container className="mt-10">
        {artigos === null ? (
          <p
            role="alert"
            className="border border-[color:var(--color-signal-600)] px-4 py-3 text-sm text-[color:var(--color-signal-700)]"
          >
            {t(TEXTO.falhou, idioma)}
          </p>
        ) : !manchete ? (
          <p className="jornal-serifa py-16 text-center text-xl text-[color:var(--muted)]">
            {t(TEXTO.vazio, idioma)}
          </p>
        ) : (
          <>
            <div className="grid gap-10 lg:grid-cols-12">
              <article className="lg:col-span-8 lg:border-r lg:border-[color:var(--border)] lg:pr-10">
                <Seccao seccao={manchete.seccao} idioma={idioma} />
                <h2 className="jornal-serifa mt-3 text-[clamp(2rem,1.2rem+3.2vw,3.75rem)] leading-[1.03] font-semibold tracking-[-0.015em] text-balance">
                  <Link
                    href={caminhoDoArtigo(manchete.slug, idioma)}
                    className="hover:underline hover:decoration-2 hover:underline-offset-4"
                  >
                    {manchete.titulo}
                  </Link>
                </h2>
                {manchete.entrada && (
                  <p className="jornal-serifa mt-5 max-w-[60ch] text-[1.25rem] leading-snug text-[color:var(--muted)]">
                    {manchete.entrada}
                  </p>
                )}
                <Meta a={manchete} idioma={idioma} />
              </article>

              <aside aria-labelledby="jornal-destaque" className="lg:col-span-4">
                <h2
                  id="jornal-destaque"
                  className="border-t-4 border-[color:var(--on-surface)] pt-2 font-display text-[length:var(--text-micro)] font-semibold tracking-[0.18em] uppercase"
                >
                  {t(TEXTO.destaque, idioma)}
                </h2>
                <ol className="mt-2 divide-y divide-[color:var(--border)]">
                  {destaque.map((a, i) => (
                    <li key={a.id} className="flex gap-4 py-4">
                      <span
                        aria-hidden="true"
                        className="font-techno text-2xl font-semibold text-[color:var(--muted)] tabular-nums"
                      >
                        {String(i + 2).padStart(2, '0')}
                      </span>
                      <div className="min-w-0">
                        <Seccao seccao={a.seccao} idioma={idioma} />
                        <h3 className="jornal-serifa mt-1 text-[1.1875rem] leading-snug font-semibold">
                          <Link href={caminhoDoArtigo(a.slug, idioma)} className="hover:underline">
                            {a.titulo}
                          </Link>
                        </h3>
                        <Meta a={a} idioma={idioma} />
                      </div>
                    </li>
                  ))}
                </ol>
              </aside>
            </div>

            {anuncios.length > 0 && (
              <div className="mt-14">
                <Outdoor idioma={idioma} anuncios={anuncios} posicao="feed" />
              </div>
            )}

            {(grelha.length > 0 || gostados.length > 0) && (
              <div className="mt-14 grid gap-10 lg:grid-cols-12">
                <section aria-labelledby="jornal-mais" className="lg:col-span-8">
                  <h2
                    id="jornal-mais"
                    className="border-t-4 border-[color:var(--on-surface)] pt-2 font-display text-[length:var(--text-micro)] font-semibold tracking-[0.18em] uppercase"
                  >
                    {t(TEXTO.maisArtigos, idioma)}
                  </h2>
                  {grelha.length > 0 && (
                    <ul className="mt-4 grid gap-x-8 gap-y-10 sm:grid-cols-2">
                      {grelha.map((a) => (
                        <li key={a.id} className="border-t border-[color:var(--border)] pt-4">
                          <Seccao seccao={a.seccao} idioma={idioma} />
                          <h3 className="jornal-serifa mt-2 text-[1.375rem] leading-tight font-semibold text-balance">
                            <Link href={caminhoDoArtigo(a.slug, idioma)} className="hover:underline">
                              {a.titulo}
                            </Link>
                          </h3>
                          {a.entrada && (
                            <p className="jornal-serifa mt-2 line-clamp-3 text-[1.0625rem] leading-relaxed text-[color:var(--muted)]">
                              {a.entrada}
                            </p>
                          )}
                          <Meta a={a} idioma={idioma} />
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
                {gostados.length > 0 && (
                  <aside aria-labelledby="jornal-gostados" className="lg:col-span-4">
                    <h2
                      id="jornal-gostados"
                      className="border-t-4 border-[color:var(--color-signal-600)] pt-2 font-display text-[length:var(--text-micro)] font-semibold tracking-[0.18em] uppercase"
                    >
                      {t(TEXTO.maisGostados, idioma)}
                    </h2>
                    <ol className="mt-2 divide-y divide-[color:var(--border)]">
                      {gostados.map((a) => (
                        <li key={a.id} className="py-3">
                          <Link
                            href={caminhoDoArtigo(a.slug, idioma)}
                            className="jornal-serifa text-[1.0625rem] leading-snug font-medium hover:underline"
                          >
                            {a.titulo}
                          </Link>
                          <p className="mt-1 font-techno text-[length:var(--text-micro)] text-[color:var(--muted)] tabular-nums">
                            {a.gostos.toLocaleString(idioma === 'en' ? 'en-GB' : 'pt-PT')}{' '}
                            {t(TEXTO.gostos, idioma)}
                          </p>
                        </li>
                      ))}
                    </ol>
                  </aside>
                )}
              </div>
            )}
          </>
        )}
      </Container>
    </div>
  );
}
