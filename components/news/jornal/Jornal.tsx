import Image from "next/image";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { ROTULO_PRIORIDADE } from "@/content/i18n/news";
import type { Idioma } from "@/content/types";
import { fonteJornal } from "@/lib/fonts/jornal";
import { t } from "@/lib/i18n/texto";
import type { AnuncioPublico } from "@/lib/news/anuncios";
import {
  NOME_DA_SECCAO,
  SECCOES_JORNAL,
  type ArtigoDaLista,
  type SeccaoJornal,
} from "@/lib/news/artigo";
import { urlDaImagem } from "@/lib/news/imagem";
import { Outdoor } from "../Outdoor";
import { CaixaManchetes } from "./CaixaManchetes";
import { caminhoDaRevista, caminhoDoArtigo, caminhoDoJornal } from "./ligacoes";
import { SeloPais } from "./SeloPais";

/**
 * A primeira página do AGORAMOZ News como um jornal clássico: cabeça em
 * serifa entre filetes, barra com a data e a edição, manchete grande com
 * fotografia e texto em colunas, uma página invertida a preto para a segunda
 * notícia, grelha com filetes entre colunas e a revista em PDF para
 * descarregar. Tudo vem do que a redacção publicou; o que não existe não se
 * finge (sem cotações nem contagens inventadas).
 */

const TEXTO = {
  slogan: {
    pt: "Análise de negócio para quem decide em Moçambique e nos mercados lusófonos.",
    en: "Business analysis for decision-makers in Mozambique and Portuguese-speaking markets.",
  },
  tudo: { pt: "Tudo", en: "All" },
  ultimas: { pt: "Últimas", en: "Latest" },
  destaque: { pt: "Em destaque", en: "Top stories" },
  maisGostados: { pt: "Mais gostados", en: "Most liked" },
  maisArtigos: { pt: "Mais análises", en: "More analysis" },
  vazio: {
    pt: "Ainda sem artigos publicados nesta secção.",
    en: "No articles published in this section yet.",
  },
  falhou: {
    pt: "Não foi possível carregar o jornal agora. Tente de novo dentro de momentos.",
    en: "We could not load the newspaper right now. Please try again shortly.",
  },
  gostos: { pt: "gostos", en: "likes" },
  edicao: { pt: "Edição em português", en: "English edition" },
  outraEdicao: { pt: "English edition", en: "Edição em português" },
  secoes: { pt: "Secções do jornal", en: "Newspaper sections" },
  revista: { pt: "Descarregar a revista", en: "Download the magazine" },
  revistaTexto: {
    pt: "A edição desta semana em PDF: as análises publicadas, com fotografias, pronta para ler offline ou imprimir.",
    en: "This week's edition as a PDF: the published analysis, with photographs, ready to read offline or print.",
  },
  ler: { pt: "Ler a análise", en: "Read the analysis" },
  analise: { pt: "Análise de negócio", en: "Business analysis" },
} as const;

function dataCurta(iso: string, idioma: Idioma): string {
  return new Intl.DateTimeFormat(idioma === "en" ? "en-GB" : "pt-PT", {
    timeZone: "Africa/Maputo",
    day: "numeric",
    month: "short",
  }).format(new Date(iso));
}

function Kicker({ a, idioma }: { a: ArtigoDaLista; idioma: Idioma }) {
  return (
    <p className="flex flex-wrap items-center gap-2 font-sans text-[0.75rem] font-semibold tracking-[0.18em] uppercase">
      <span>{NOME_DA_SECCAO[a.seccao][idioma]}</span>
      {a.pais && <SeloPais pais={a.pais} idioma={idioma} />}
    </p>
  );
}

function Meta({ a, idioma }: { a: ArtigoDaLista; idioma: Idioma }) {
  const prioridade =
    a.prioridade === "critical" || a.prioridade === "high"
      ? a.prioridade
      : null;
  return (
    <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 font-sans text-[0.75rem] tracking-[0.08em] text-[color:var(--muted)] uppercase">
      <time dateTime={a.publicado_em}>{dataCurta(a.publicado_em, idioma)}</time>
      {a.gostos > 0 && (
        <span className="tabular-nums">
          {a.gostos.toLocaleString(idioma === "en" ? "en-GB" : "pt-PT")}{" "}
          {t(TEXTO.gostos, idioma)}
        </span>
      )}
      {prioridade && (
        <span className="border border-current px-1.5 py-px font-semibold">
          {t(ROTULO_PRIORIDADE[prioridade], idioma)}
        </span>
      )}
    </p>
  );
}

function Foto({
  a,
  sizes,
  proporcao = "aspect-[3/2]",
  prioridade = false,
}: {
  a: ArtigoDaLista;
  sizes: string;
  proporcao?: string;
  prioridade?: boolean;
}) {
  const src = urlDaImagem(a.imagem_caminho);
  if (!src || !a.imagem_alt) return null;
  return (
    <div
      className={`jornal-foto relative ${proporcao} overflow-hidden bg-[#e9e3d6]`}
    >
      <Image
        src={src}
        alt={a.imagem_alt}
        fill
        sizes={sizes}
        preload={prioridade}
        className="object-cover"
      />
    </div>
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
  const [manchete, segunda, ...resto] = lista;
  const destaque = resto.slice(0, 4);
  const grelha = resto.slice(4);
  const gostados = [...lista]
    .filter((a) => a.gostos > 0)
    .sort((x, y) => y.gostos - x.gostos)
    .slice(0, 5);
  const ultimas = lista.slice(0, 10);
  const en = idioma === "en";

  return (
    <div className={`${fonteJornal.variable} jornal-papel pb-24`}>
      {/* Cabeça do jornal */}
      {/* O padding fica fora do <header>: a v3 reescreve o padding-top de todos os header. */}
      <div className="pt-24 sm:pt-28">
        <Container as="header">
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 font-sans text-[0.75rem] tracking-[0.12em] uppercase">
            <span>{hoje}</span>
            <span className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <span>{t(TEXTO.edicao, idioma)}</span>
              <Link
                href={en ? "/news" : "/en/news"}
                className="underline-offset-4 hover:underline"
                hrefLang={en ? "pt" : "en"}
                lang={en ? "pt" : "en"}
              >
                {t(TEXTO.outraEdicao, idioma)}
              </Link>
              <a
                href={en ? "/en/news/feed.xml" : "/news/feed.xml"}
                type="application/rss+xml"
                className="underline-offset-4 hover:underline"
              >
                RSS
              </a>
            </span>
          </div>
          <div className="jornal-filetes mt-3 py-4 text-center sm:py-6">
            <p className="font-sans text-[0.75rem] font-semibold tracking-[0.32em] uppercase">
              {t(TEXTO.analise, idioma)}
            </p>
            <h1 className="jornal-mancha mt-2 text-[clamp(2.9rem,0.6rem+11vw,9.5rem)] uppercase">
              AGORAMOZ <span className="italic">News</span>
            </h1>
          </div>
          <div className="flex flex-col items-center justify-between gap-3 border-b border-current py-3 sm:flex-row">
            <p className="jornal-serifa text-center text-[1.0625rem] italic sm:text-left">
              {t(TEXTO.slogan, idioma)}
            </p>
            <a
              href={caminhoDaRevista(idioma)}
              download
              className="jornal-nao-imprimir inline-flex min-h-11 shrink-0 items-center gap-2 bg-[#121110] px-5 font-sans text-sm font-semibold text-[#f3efe6] hover:bg-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#121110]"
            >
              <span aria-hidden="true">↓</span> {t(TEXTO.revista, idioma)}{" "}
              <span className="opacity-70">PDF</span>
            </a>
          </div>
          <nav
            aria-label={t(TEXTO.secoes, idioma)}
            className="jornal-nao-imprimir overflow-x-auto"
          >
            <ul className="mx-auto flex w-max border-b-[3px] border-double border-current">
              {[null, ...SECCOES_JORNAL].map((s) => {
                const activa = s === seccao;
                return (
                  <li
                    key={s ?? "tudo"}
                    className="border-r border-current/25 last:border-r-0"
                  >
                    <Link
                      href={caminhoDoJornal(idioma, s)}
                      aria-current={activa ? "page" : undefined}
                      className={`inline-flex min-h-11 items-center px-4 font-sans text-[0.8125rem] font-semibold tracking-[0.08em] whitespace-nowrap uppercase ${
                        activa
                          ? "bg-[#121110] text-[#f3efe6]"
                          : "hover:underline"
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
      </div>

      {/* Faixa de últimas: os nossos títulos, nunca cotações inventadas */}
      {ultimas.length > 0 && (
        <CaixaManchetes idioma={idioma}>
          <span className="flex shrink-0 items-center bg-[#f3efe6] px-3 font-sans text-[0.75rem] font-bold tracking-[0.18em] text-[#121110] uppercase">
            {t(TEXTO.ultimas, idioma)}
          </span>
          <div className="relative min-w-0 flex-1 overflow-hidden">
            <ul className="jornal-manchetes flex w-max py-2.5">
              {[0, 1].map((copia) =>
                ultimas.map((a) => (
                  <li
                    key={`${copia}-${a.id}`}
                    aria-hidden={copia === 1 ? true : undefined}
                    className={`flex items-center whitespace-nowrap ${copia === 1 ? "jornal-manchetes-copia" : ""}`}
                  >
                    <Link
                      href={caminhoDoArtigo(a.slug, idioma)}
                      tabIndex={copia === 1 ? -1 : undefined}
                      className="jornal-serifa px-5 text-[0.9375rem] hover:underline"
                    >
                      <span className="mr-2 font-sans text-[0.6875rem] tracking-[0.14em] uppercase opacity-80">
                        {NOME_DA_SECCAO[a.seccao][idioma]}
                      </span>
                      {a.titulo}
                    </Link>
                    <span aria-hidden="true" className="opacity-60">
                      ✦
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
          <p role="alert" className="border-2 border-current px-4 py-3 text-sm">
            {t(TEXTO.falhou, idioma)}
          </p>
        ) : !manchete ? (
          <p className="jornal-serifa py-16 text-center text-xl text-[color:var(--muted)]">
            {t(TEXTO.vazio, idioma)}
          </p>
        ) : (
          <>
            {/* Manchete + coluna */}
            <div className="grid gap-10 lg:grid-cols-12">
              <article className="lg:col-span-8 lg:border-r lg:border-current/25 lg:pr-10">
                <Kicker a={manchete} idioma={idioma} />
                <h2 className="jornal-serifa mt-3 text-[clamp(2.25rem,1.2rem+4.4vw,5rem)] leading-[0.98] font-bold tracking-[-0.025em] text-balance">
                  <Link
                    href={caminhoDoArtigo(manchete.slug, idioma)}
                    className="hover:underline hover:decoration-2 hover:underline-offset-4"
                  >
                    {manchete.titulo}
                  </Link>
                </h2>
                <div className="mt-6">
                  <Foto
                    a={manchete}
                    sizes="(min-width: 1024px) 60vw, 100vw"
                    prioridade
                  />
                </div>
                {manchete.entrada && (
                  <p className="jornal-serifa jornal-justo jornal-capitular jornal-colunas jornal-colunas-2 mt-6 text-[1.1875rem] leading-[1.6]">
                    {manchete.entrada}
                  </p>
                )}
                <Meta a={manchete} idioma={idioma} />
              </article>

              <aside
                aria-labelledby="jornal-destaque"
                className="lg:col-span-4"
              >
                <h2
                  id="jornal-destaque"
                  className="jornal-filetes py-2 text-center font-sans text-[0.75rem] font-bold tracking-[0.24em] uppercase"
                >
                  {t(TEXTO.destaque, idioma)}
                </h2>
                <ol className="divide-y divide-current/20">
                  {destaque.map((a, i) => (
                    <li key={a.id} className="flex gap-4 py-4">
                      <span
                        aria-hidden="true"
                        className="jornal-serifa text-[2.25rem] leading-none font-bold opacity-40"
                      >
                        {String(i + 3).padStart(2, "0")}
                      </span>
                      <div className="min-w-0 flex-1">
                        <Kicker a={a} idioma={idioma} />
                        <h3 className="jornal-serifa mt-1 text-[1.25rem] leading-snug font-bold">
                          <Link
                            href={caminhoDoArtigo(a.slug, idioma)}
                            className="hover:underline"
                          >
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

            {/* Página invertida: a segunda notícia a preto */}
            {segunda && (
              <article className="jornal-preto mt-14 grid gap-8 p-6 sm:p-10 lg:grid-cols-12">
                <div
                  className={
                    segunda.imagem_caminho ? "lg:col-span-5" : "hidden"
                  }
                >
                  <Foto
                    a={segunda}
                    sizes="(min-width: 1024px) 40vw, 100vw"
                    proporcao="aspect-[4/5]"
                  />
                </div>
                <div
                  className={
                    segunda.imagem_caminho ? "lg:col-span-7" : "lg:col-span-12"
                  }
                >
                  <Kicker a={segunda} idioma={idioma} />
                  <h2 className="jornal-serifa mt-3 text-[clamp(2rem,1.2rem+3.2vw,4rem)] leading-[1] font-bold tracking-[-0.02em] text-balance">
                    <Link
                      href={caminhoDoArtigo(segunda.slug, idioma)}
                      className="hover:underline hover:decoration-2 hover:underline-offset-4"
                    >
                      {segunda.titulo}
                    </Link>
                  </h2>
                  {segunda.entrada && (
                    <p className="jornal-serifa jornal-justo jornal-colunas jornal-colunas-2 mt-6 text-[1.125rem] leading-[1.6]">
                      {segunda.entrada}
                    </p>
                  )}
                  <Meta a={segunda} idioma={idioma} />
                  <Link
                    href={caminhoDoArtigo(segunda.slug, idioma)}
                    className="mt-6 inline-flex min-h-11 items-center gap-2 border border-current px-5 font-sans text-sm font-semibold hover:bg-[#f3efe6] hover:text-[#0b0a09]"
                  >
                    {t(TEXTO.ler, idioma)} <span aria-hidden="true">→</span>
                  </Link>
                </div>
              </article>
            )}

            {anuncios.length > 0 && (
              <div className="mt-14">
                <Outdoor idioma={idioma} anuncios={anuncios} posicao="feed" />
              </div>
            )}

            {(grelha.length > 0 || gostados.length > 0) && (
              <div className="mt-14 grid gap-10 lg:grid-cols-12">
                <section
                  aria-labelledby="jornal-mais"
                  className="lg:col-span-8"
                >
                  <h2
                    id="jornal-mais"
                    className="jornal-filetes py-2 font-sans text-[0.75rem] font-bold tracking-[0.24em] uppercase"
                  >
                    {t(TEXTO.maisArtigos, idioma)}
                  </h2>
                  {grelha.length > 0 && (
                    <ul className="mt-2 grid sm:grid-cols-2 sm:divide-x sm:divide-current/20">
                      {grelha.map((a, i) => (
                        <li
                          key={a.id}
                          className={`border-b border-current/20 py-6 ${i % 2 === 0 ? "sm:pr-6" : "sm:pl-6"}`}
                        >
                          <Foto a={a} sizes="(min-width: 640px) 30vw, 100vw" />
                          <div className={a.imagem_caminho ? "mt-4" : ""}>
                            <Kicker a={a} idioma={idioma} />
                            <h3 className="jornal-serifa mt-2 text-[1.5rem] leading-tight font-bold text-balance">
                              <Link
                                href={caminhoDoArtigo(a.slug, idioma)}
                                className="hover:underline"
                              >
                                {a.titulo}
                              </Link>
                            </h3>
                            {a.entrada && (
                              <p className="jornal-serifa jornal-justo mt-2 line-clamp-4 text-[1.0625rem] leading-relaxed">
                                {a.entrada}
                              </p>
                            )}
                            <Meta a={a} idioma={idioma} />
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
                {gostados.length > 0 && (
                  <aside
                    aria-labelledby="jornal-gostados"
                    className="lg:col-span-4"
                  >
                    <h2
                      id="jornal-gostados"
                      className="jornal-filetes py-2 font-sans text-[0.75rem] font-bold tracking-[0.24em] uppercase"
                    >
                      {t(TEXTO.maisGostados, idioma)}
                    </h2>
                    <ol className="divide-y divide-current/20">
                      {gostados.map((a) => (
                        <li key={a.id} className="py-3">
                          <Link
                            href={caminhoDoArtigo(a.slug, idioma)}
                            className="jornal-serifa text-[1.125rem] leading-snug font-semibold hover:underline"
                          >
                            {a.titulo}
                          </Link>
                          <p className="mt-1 font-sans text-[0.75rem] text-[color:var(--muted)] tabular-nums">
                            {a.gostos.toLocaleString(en ? "en-GB" : "pt-PT")}{" "}
                            {t(TEXTO.gostos, idioma)}
                          </p>
                        </li>
                      ))}
                    </ol>
                  </aside>
                )}
              </div>
            )}

            {/* A revista */}
            <aside
              aria-labelledby="jornal-revista"
              className="jornal-preto jornal-nao-imprimir mt-16 flex flex-col items-start justify-between gap-6 p-6 sm:flex-row sm:items-center sm:p-10"
            >
              <div className="max-w-[48ch]">
                <h2
                  id="jornal-revista"
                  className="jornal-mancha text-[clamp(2rem,1.4rem+2.4vw,3.25rem)]"
                >
                  {t(TEXTO.revista, idioma)}
                </h2>
                <p className="jornal-serifa mt-3 text-[1.125rem] leading-relaxed">
                  {t(TEXTO.revistaTexto, idioma)}
                </p>
              </div>
              <a
                href={caminhoDaRevista(idioma)}
                download
                aria-label={`${t(TEXTO.revista, idioma)} (PDF)`}
                className="inline-flex min-h-12 shrink-0 items-center gap-2 bg-[#f3efe6] px-6 font-sans font-semibold text-[#0b0a09] hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f3efe6]"
              >
                <span aria-hidden="true">↓</span> PDF
              </a>
            </aside>
          </>
        )}
      </Container>
    </div>
  );
}
