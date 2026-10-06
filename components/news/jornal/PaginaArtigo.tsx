import Link from 'next/link';
import type { ReactNode } from 'react';
import { JsonLd } from '@/components/seo/JsonLd';
import { Container } from '@/components/ui/Container';
import type { Idioma } from '@/content/types';
import { fonteJornal } from '@/lib/fonts/jornal';
import type { AnuncioPublico } from '@/lib/news/anuncios';
import { NOME_DA_SECCAO, tempoDeLeitura, type ArtigoCompleto, type ArtigoDaLista } from '@/lib/news/artigo';
import { articleId, ORG_ID } from '@/lib/seo/schema/ids';
import { IDENTITY, SITE } from '@/content/site';
import { absolute } from '@/lib/seo/site';
import { Outdoor } from '../Outdoor';
import { ArtigoCorpo } from './ArtigoCorpo';
import { BotaoGosto } from './BotaoGosto';
import { caminhoDoArtigo, caminhoDoJornal, ctaDoArtigo } from './ligacoes';
import { Partilhar } from './Partilhar';

/**
 * Um artigo do AGORAMOZ News: título e entrada em serifa, assinatura da
 * redacção, gosto e partilha, a análise como corpo, o outdoor a meio e no fim,
 * e o passo seguinte (a solução da secção) com a campanha do artigo.
 */

function dataLonga(iso: string, idioma: Idioma): string {
  return new Intl.DateTimeFormat(idioma === 'en' ? 'en-GB' : 'pt-PT', {
    timeZone: 'Africa/Maputo',
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(new Date(iso));
}

export function PaginaArtigo({
  artigo: a,
  idioma,
  anuncios,
  relacionados,
  trilho,
}: {
  artigo: ArtigoCompleto;
  idioma: Idioma;
  anuncios: readonly AnuncioPublico[];
  relacionados: readonly ArtigoDaLista[];
  /** O trilho visível + `BreadcrumbList`, vindo da página (`Breadcrumbs`). */
  trilho: ReactNode;
}) {
  const caminho = caminhoDoArtigo(a.slug, idioma);
  const url = absolute(caminho);
  const minutos = tempoDeLeitura(a.analise);
  const cta = ctaDoArtigo(a.seccao, a.slug, idioma);
  const en = idioma === 'en';
  // Autor e editor por extenso (com o mesmo @id da organização): o Google não
  // resolve com fiabilidade um @id que só existe noutro bloco JSON-LD.
  const organizacao = { '@type': 'Organization', '@id': ORG_ID, name: SITE.name, url: absolute('/') };
  const ld = {
    '@type': 'NewsArticle',
    '@id': articleId(caminho),
    headline: a.titulo.slice(0, 110),
    description: a.entrada ?? undefined,
    // Endereço estável da imagem do artigo (1200×630), sem o sufixo que o
    // Next acrescenta à rota `opengraph-image`.
    image: [absolute(`${caminho}/imagem`)],
    inLanguage: idioma,
    datePublished: a.publicado_em,
    dateModified: a.actualizado_em,
    articleSection: NOME_DA_SECCAO[a.seccao][idioma],
    isAccessibleForFree: true,
    mainEntityOfPage: url,
    url,
    author: { ...organizacao, name: 'AGORAMOZ News', url: absolute(caminhoDoJornal(idioma)) },
    publisher: { ...organizacao, logo: { '@type': 'ImageObject', ...IDENTITY.logo } },
  };

  return (
    <div
      className={`${fonteJornal.variable} bg-[color:var(--surface)] pb-24 text-[color:var(--on-surface)]`}
      data-surface="light"
    >
      <JsonLd graph={{ '@context': 'https://schema.org', '@graph': [ld] }} />
      <Container className="pt-10">
        {trilho}
        <div className="jornal-regra mt-4" />

        <article className="mx-auto mt-10 max-w-[44rem]">
          <header>
            <Link
              href={caminhoDoJornal(idioma, a.seccao)}
              className="inline-flex min-h-11 items-center font-techno text-[length:var(--text-micro)] font-semibold tracking-[0.18em] text-[color:var(--color-signal-700)] uppercase hover:underline"
            >
              {NOME_DA_SECCAO[a.seccao][idioma]}
            </Link>
            <h1 className="jornal-serifa mt-1 text-[clamp(2.125rem,1.3rem+3.4vw,3.75rem)] leading-[1.04] font-semibold tracking-[-0.015em] text-balance">
              {a.titulo}
            </h1>
            {a.entrada && (
              <p className="jornal-serifa mt-5 text-[1.375rem] leading-snug text-[color:var(--muted)]">
                {a.entrada}
              </p>
            )}
            <p className="mt-6 flex flex-wrap gap-x-3 gap-y-1 border-y border-[color:var(--border)] py-3 text-sm text-[color:var(--muted)]">
              <span className="font-medium text-[color:var(--on-surface)]">
                {en ? 'AGORAMOZ News desk' : 'Redacção AGORAMOZ News'}
              </span>
              <time dateTime={a.publicado_em}>{dataLonga(a.publicado_em, idioma)}</time>
              <span>
                {minutos} {en ? 'min read' : 'min de leitura'}
              </span>
              {a.fonte_nome &&
                (a.fonte_url ? (
                  <a
                    href={a.fonte_url}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="underline underline-offset-4"
                  >
                    {en ? 'Source' : 'Fonte'}: {a.fonte_nome}
                  </a>
                ) : (
                  <span>
                    {en ? 'Source' : 'Fonte'}: {a.fonte_nome}
                  </span>
                ))}
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
              <BotaoGosto slug={a.slug} inicial={a.gostos} idioma={idioma} />
              <Partilhar slug={a.slug} url={url} titulo={a.titulo} idioma={idioma} />
            </div>
          </header>

          <div className="mt-6">
            <ArtigoCorpo
              analise={a.analise}
              idioma={idioma}
              meio={
                anuncios.length > 0 ? (
                  <div className="my-12">
                    <Outdoor idioma={idioma} anuncios={anuncios} posicao="artigo" />
                  </div>
                ) : undefined
              }
            />
          </div>

          {a.nota_editorial && (
            <p className="jornal-serifa mt-12 border-t border-[color:var(--border)] pt-5 text-[1.0625rem] italic">
              {a.nota_editorial}
            </p>
          )}
          <p className="mt-6 text-xs text-[color:var(--muted)]">
            {en
              ? 'Analysis produced with the AGORAMOZ engine and reviewed by our desk before publication. It is not investment advice.'
              : 'Análise produzida com o motor AGORAMOZ e revista pela redacção antes de publicar. Não é aconselhamento de investimento.'}
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-y border-[color:var(--border)] py-4">
            <BotaoGosto slug={a.slug} inicial={a.gostos} idioma={idioma} />
            <Partilhar slug={a.slug} url={url} titulo={a.titulo} idioma={idioma} />
          </div>

          <aside
            aria-labelledby="artigo-cta"
            className="mt-12 bg-[color:var(--color-ink-950)] p-8 text-[color:var(--color-chalk)]"
          >
            <h2
              id="artigo-cta"
              className="font-display text-[length:var(--text-h3)] font-bold tracking-[-0.02em]"
            >
              {cta.titulo}
            </h2>
            <p className="mt-3 max-w-[56ch] text-[color:var(--color-steel-300)]">{cta.texto}</p>
            <Link
              href={cta.href}
              className="mt-6 inline-flex min-h-12 items-center gap-3 bg-[color:var(--color-signal-600)] px-6 font-display font-semibold text-white hover:bg-[color:var(--color-signal-700)]"
            >
              {cta.botao} <span aria-hidden="true">→</span>
            </Link>
          </aside>
        </article>

        {anuncios.length > 0 && (
          <div className="mt-14">
            <Outdoor idioma={idioma} anuncios={anuncios} posicao="fim" />
          </div>
        )}

        {relacionados.length > 0 && (
          <section aria-labelledby="artigo-relacionados" className="mt-14">
            <h2
              id="artigo-relacionados"
              className="border-t-4 border-[color:var(--on-surface)] pt-2 font-display text-[length:var(--text-micro)] font-semibold tracking-[0.18em] uppercase"
            >
              {en ? `More in ${NOME_DA_SECCAO[a.seccao].en}` : `Mais em ${NOME_DA_SECCAO[a.seccao].pt}`}
            </h2>
            <ul className="mt-4 grid gap-8 sm:grid-cols-3">
              {relacionados.map((r) => (
                <li key={r.id} className="border-t border-[color:var(--border)] pt-4">
                  <h3 className="jornal-serifa text-[1.25rem] leading-tight font-semibold">
                    <Link href={caminhoDoArtigo(r.slug, idioma)} className="hover:underline">
                      {r.titulo}
                    </Link>
                  </h3>
                </li>
              ))}
            </ul>
          </section>
        )}
      </Container>
    </div>
  );
}
