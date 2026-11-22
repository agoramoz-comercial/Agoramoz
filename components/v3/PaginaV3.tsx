import Image from 'next/image';
import Link from 'next/link';
import { Suspense } from 'react';
import gerson from '@/public/equipa/gerson.png';
import sheinaz from '@/public/equipa/sheinaz.png';
import { DiagnosticoEmbutido } from '@/components/form/DiagnosticoEmbutido';
import { FaqJsonLd } from '@/components/seo/JsonLd';
import {
  BotaoPilula,
  CartoesEmpilhados,
  Faixa,
  ImagemRevelada,
  Paralaxe,
  PinHorizontal,
  RevelarLinhas,
  RevelarPalavras,
} from '@/components/v3/motion';
import { IdeiasV3 } from '@/components/v3/IdeiasV3';
import { ProvaCarrossel } from '@/components/v3/ProvaCarrossel';
import { LigacaoVidro } from '@/components/v3/LigacaoVidro';
import { DIAGNOSTICO } from '@/content/i18n/diagnostico';
import { FOUNDERS } from '@/content/site';
import type { Lingua } from '@/content/types';
import { t } from '@/lib/i18n/texto';
import { INICIO_DA_LINGUA, paginaV3, textosV3 } from '@/lib/i18n/v3';

/** As capacidades de cada caminho (a ordem dos textos segue `caminhos.itens`). */
const CAPACIDADES_DO_CAMINHO = [
  ['websites-avancados', 'agentes-ia'],
  ['integracao-de-sistemas', 'automacao-de-processos', 'software-empresarial'],
  ['infraestrutura-digital', 'estabilizacao-e-evolucao'],
] as const;
const CAMINHO_DO_PROBLEMA = [1, 2, 2, 3] as const;
const PRODUTOS = ['/news', '/civico', '/cursos', '/projetos'] as const;
const MERCADOS = ['/mz', '/pt', '/br', '/global'] as const;
const FOTOS = { gerson, sheinaz } as const;

const dois = (n: number) => String(n).padStart(2, '0');

function Etiqueta({ numero, children, claro = false }: { numero?: string; children: React.ReactNode; claro?: boolean }) {
  return (
    <p className={`v3-etiqueta flex items-center gap-3 ${claro ? 'text-[var(--v3-terra)]' : 'text-[var(--v3-cinza)]'}`}>
      {numero && <span className="tabular-nums">({numero})</span>}
      <span>{children}</span>
    </p>
  );
}

/**
 * A página inicial v3 — hero ao estilo Helious (fotografia de cinema, palavra
 * gigante, pílulas) e a ordem do benchmark «Como vendem os gigantes»:
 * hero com garantias → problema → três caminhos → sistema → diagnóstico (com o
 * que fica escrito) → prova → fases → onde → quem lidera → o que estamos a
 * ver → FAQ → chamada final.
 */
export function PaginaV3({ lingua }: { lingua: Lingua }) {
  const x = textosV3(lingua);
  const p = (c: string) => paginaV3(c, lingua);
  const diag = '#diagnostico';

  return (
    <>
      <FaqJsonLd items={x.faq.itens.map((f) => ({ q: f.q, a: f.a }))} path={INICIO_DA_LINGUA[lingua]} />

      {/* ------------------------------------------------------------ 1 · hero */}
      <section aria-labelledby="v3-titulo" className="v3-grao relative isolate flex min-h-[100svh] flex-col justify-end overflow-hidden">
        <Paralaxe intensidade={12} className="absolute inset-0 -z-20">
          <picture>
            <source media="(max-width: 767px)" type="image/avif" srcSet="/v3/hero-m.avif" />
            <source media="(max-width: 767px)" type="image/webp" srcSet="/v3/hero-m.webp" />
            <source type="image/avif" srcSet="/v3/hero-1920.avif" />
            <img
              src="/v3/hero-1920.webp"
              alt=""
              fetchPriority="high"
              decoding="async"
              className="h-[115%] w-full object-cover"
            />
          </picture>
        </Paralaxe>
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgb(11_10_9/0.55)_0%,rgb(11_10_9/0)_28%,rgb(11_10_9/0.1)_55%,rgb(11_10_9/0.92)_100%)]"
        />

        <div className="mx-auto w-full max-w-[110rem] px-4 pb-6 sm:px-6 sm:pb-8">
          <div className="grid items-end gap-8 lg:grid-cols-12">
            <div className="lg:col-span-8">
              <p className="v3-etiqueta mb-4 text-[var(--v3-papel)]/80">{x.hero.etiqueta}</p>
              <div aria-hidden className="v3-marca relative">
                <span className="v3-display">
                  AGORAMOZ<sup className="ms-[0.04em] align-top text-[0.28em] font-light">*</sup>
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-6 lg:col-span-4 lg:pb-[1.2vw]">
              <h1 id="v3-titulo" className="max-w-[34ch] text-[0.98rem] leading-[1.45] text-[var(--v3-papel)]">
                <span aria-hidden className="me-1">*</span>
                {x.hero.titulo}
              </h1>
              <div className="flex flex-wrap items-center gap-3">
                <BotaoPilula href={p('/diagnostico').href}>{x.hero.cta}</BotaoPilula>
                <Link
                  href={diag}
                  className="text-sm text-[var(--v3-papel)] underline decoration-[var(--v3-papel)]/40 underline-offset-4 hover:decoration-[var(--v3-papel)]"
                >
                  {x.hero.secundario}
                </Link>
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-3 border-t border-[var(--v3-linha)] pt-4 text-xs text-[var(--v3-papel)]/85 sm:flex-row sm:items-center sm:justify-between">
            <ul className="flex flex-wrap gap-x-6 gap-y-1.5">
              {x.hero.garantias.map((g) => (
                <li key={g} className="flex items-center gap-2">
                  <span aria-hidden className="h-1 w-1 rounded-full bg-[var(--v3-ambar)]" />
                  {g}
                </li>
              ))}
            </ul>
            <p className="v3-etiqueta text-[var(--v3-papel)]/70">{x.hero.local}</p>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------ 2 · o problema */}
      <section id="problema" aria-labelledby="v3-problema" className="px-4 py-28 sm:px-6 lg:py-40">
        <div className="mx-auto max-w-[110rem]">
          <Etiqueta numero="01">{x.problema.etiqueta}</Etiqueta>
          <RevelarPalavras as="h2" id="v3-problema" className="v3-titulo mt-8 max-w-[22ch]">
            {x.problema.manifesto}
          </RevelarPalavras>
          <p className="mt-10 max-w-[56ch] text-lg leading-relaxed text-[var(--v3-cinza)]">{x.hero.texto}</p>

          <ol className="mt-20 grid border-t border-[var(--v3-linha)] md:grid-cols-2 lg:grid-cols-4">
            {x.problema.itens.map((it, i) => (
              <li key={it.titulo} className="border-b border-[var(--v3-linha)] py-8 md:pe-8 lg:border-e lg:px-6 lg:first:ps-0 lg:last:border-e-0">
                <span className="v3-numeral block text-6xl text-[var(--v3-cinza)]">{dois(i + 1)}</span>
                <h3 className="mt-8 text-2xl font-medium tracking-[-0.03em]">{it.titulo}</h3>
                <p className="mt-3 text-[var(--v3-cinza)]">{it.texto}</p>
                <a
                  href={`#caminho-${CAMINHO_DO_PROBLEMA[i]}`}
                  className="mt-6 inline-flex items-center gap-2 text-sm underline decoration-[var(--v3-linha)] underline-offset-4 hover:decoration-[var(--v3-papel)]"
                >
                  <span aria-hidden className="rtl:-scale-x-100">→</span>
                  {x.problema.caminho} {CAMINHO_DO_PROBLEMA[i]} · {x.caminhos.itens[CAMINHO_DO_PROBLEMA[i] - 1]!.nome}
                </a>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ------------------------------------------------- 3 · três caminhos */}
      <section id="solucoes" aria-labelledby="v3-caminhos-t" className="v3-claro px-4 py-28 sm:px-6 lg:py-40">
        <div className="mx-auto max-w-[110rem]">
          <div className="grid gap-8 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <Etiqueta numero="02" claro>
                {x.caminhos.etiqueta}
              </Etiqueta>
            </div>
            <div className="lg:col-span-8">
              <RevelarLinhas as="h2" id="v3-caminhos-t" className="v3-titulo">
                {x.caminhos.titulo}
              </RevelarLinhas>
              <p id="v3-caminhos" className="mt-6 max-w-[52ch] text-lg text-[var(--v3-terra)]">
                {x.caminhos.lead}
              </p>
            </div>
          </div>

          <CartoesEmpilhados className="mt-20">
            {x.caminhos.itens.map((c, i) => (
              <article
                key={c.nome}
                id={`caminho-${i + 1}`}
                className="grid min-h-[62vh] scroll-mt-24 gap-10 rounded-[1.75rem] bg-[var(--v3-noite)] p-7 text-[var(--v3-papel)] sm:p-10 lg:grid-cols-12 lg:p-14"
              >
                <div className="flex flex-col justify-between gap-10 lg:col-span-7">
                  <div>
                    <p className="v3-etiqueta text-[var(--v3-cinza)]">
                      {x.caminhos.caminhoRotulo} {i + 1}
                    </p>
                    <h3 className="mt-5 text-[clamp(2rem,1.2rem+3vw,4rem)] leading-[0.98] font-medium tracking-[-0.045em]">
                      {c.nome}
                    </h3>
                    <p className="mt-6 max-w-[44ch] text-lg text-[var(--v3-cinza)]">{c.frase}</p>
                  </div>
                  <p className="text-sm">
                    <span className="v3-etiqueta me-3 text-[var(--v3-cinza)]">{x.caminhos.resolveRotulo}:</span> {c.resolve}
                  </p>
                </div>
                <div className="flex flex-col justify-between gap-8 lg:col-span-5">
                  {/* Decoração: o número vem do CSS (content), não é texto da página. */}
                  <span
                    aria-hidden
                    data-n={dois(i + 1)}
                    className="v3-numeral self-end text-[clamp(6rem,4rem+8vw,13rem)] text-[var(--v3-papel)]/15 before:content-[attr(data-n)]"
                  />
                  <ul className="border-t border-[var(--v3-linha)]">
                    {CAPACIDADES_DO_CAMINHO[i]!.map((slug) => {
                      const l = p(`/solucoes/${slug}`);
                      return (
                        <li key={slug} className="border-b border-[var(--v3-linha)]">
                          <Link
                            href={l.href}
                            hrefLang={l.hrefLang}
                            className="group flex items-center justify-between py-4 text-lg"
                          >
                            {x.caminhos.capacidades[slug]}
                            <span aria-hidden className="transition-transform duration-300 group-hover:translate-x-1 rtl:-scale-x-100 rtl:group-hover:-translate-x-1">
                              →
                            </span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </article>
            ))}
          </CartoesEmpilhados>
        </div>
      </section>

      {/* ------------------------------------------------------ 4 · o sistema */}
      <section aria-labelledby="v3-sistema" className="py-28 lg:py-0">
        <PinHorizontal>
          <div className="v3-pista-intro mx-auto flex w-full max-w-[110rem] shrink-0 flex-col justify-center px-4 sm:px-6">
            <Etiqueta numero="03">{x.sistema.etiqueta}</Etiqueta>
            <h2 id="v3-sistema" className="v3-titulo mt-8 text-[clamp(2rem,1.2rem+2.6vw,3.75rem)]">
              {x.sistema.titulo}
            </h2>
            <p className="mt-6 text-[var(--v3-cinza)]">{x.sistema.lead}</p>
          </div>
          {x.sistema.passos.map((s, i) => (
            <div
              key={s.titulo}
              className="v3-passo flex shrink-0 flex-col justify-between rounded-[1.5rem] border border-[var(--v3-linha)] bg-[var(--v3-noite-2)] p-7"
            >
              <span className="v3-numeral text-7xl text-[var(--v3-ambar)]">{dois(i + 1)}</span>
              <div className="mt-16">
                <h3 className="text-3xl font-medium tracking-[-0.035em]">{s.titulo}</h3>
                <p className="mt-3 text-[var(--v3-cinza)]">{s.texto}</p>
              </div>
            </div>
          ))}
        </PinHorizontal>
      </section>

      {/* ------------------------------------------- 5 · oferta: diagnóstico */}
      <section id="diagnostico" aria-labelledby="v3-oferta-t" className="v3-claro scroll-mt-16 px-4 py-28 sm:px-6 lg:py-40">
        <div className="mx-auto grid max-w-[110rem] gap-16 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <Etiqueta numero="04" claro>
              {x.oferta.etiqueta} · {x.oferta.nome}
            </Etiqueta>
            <RevelarLinhas as="h2" id="v3-oferta-t" className="v3-titulo mt-8">
              {x.oferta.titulo}
            </RevelarLinhas>
            <p id="v3-oferta" className="mt-6 text-lg text-[var(--v3-terra)]">
              {x.oferta.promessa}
            </p>

            <p className="v3-etiqueta mt-12 text-[var(--v3-terra)]">{x.oferta.recebe}</p>
            <ol className="mt-4 border-t border-[var(--v3-linha-escura)]">
              {DIAGNOSTICO.entregas.map((e, i) => (
                <li key={e.pt} className="flex gap-5 border-b border-[var(--v3-linha-escura)] py-3 text-[0.95rem]">
                  <span className="w-6 shrink-0 tabular-nums text-[var(--v3-terra)]">{dois(i + 1)}</span>
                  {t(e, lingua)}
                </li>
              ))}
            </ol>

            <p className="v3-etiqueta mt-12 text-[var(--v3-terra)]">{x.oferta.escrito}</p>
            <ul className="mt-4 grid gap-2">
              {x.oferta.pontos.map((pt) => (
                <li key={pt} className="flex gap-3 text-[0.95rem]">
                  <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--v3-noite)]" />
                  {pt}
                </li>
              ))}
            </ul>
            <p className="mt-8 border-s-2 border-[var(--v3-noite)] ps-4 text-[0.95rem] font-medium">{x.oferta.honestidade}</p>
          </div>

          <div className="lg:col-span-7">
            <div
              data-surface="deep"
              className="rounded-[1.75rem] bg-[var(--v3-noite)] p-5 text-[var(--v3-papel)] sm:p-8 lg:sticky lg:top-24"
            >
              <DiagnosticoEmbutido idioma={lingua} />
            </div>
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------- 6 · prova */}
      <section id="prova" aria-labelledby="v3-prova-t" className="px-4 py-28 sm:px-6 lg:py-40">
        <div className="mx-auto max-w-[110rem]">
          <div className="grid gap-8 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <Etiqueta numero="05">{x.prova.etiqueta}</Etiqueta>
            </div>
            <div className="lg:col-span-8">
              <RevelarLinhas as="h2" id="v3-prova-t" className="v3-titulo">
                {x.prova.titulo}
              </RevelarLinhas>
              <p id="v3-prova" className="mt-6 max-w-[56ch] text-lg text-[var(--v3-cinza)]">
                {x.prova.lead}
              </p>
            </div>
          </div>

          <ImagemRevelada className="mt-20">
            <ProvaCarrossel prova={x.prova} arabe={lingua === 'ar'} />
          </ImagemRevelada>
          <p className="mt-4 text-xs text-[var(--v3-cinza)]">{x.prova.dica}</p>

          {/* O canvas não tem ligações: cada produto continua a abrir a sua página. */}
          <ul className="mt-10 grid gap-px overflow-hidden rounded-[1.5rem] border border-[var(--v3-linha)] bg-[var(--v3-linha)] sm:grid-cols-2 lg:grid-cols-4">
            {x.prova.produtos.map((pr, i) => {
              const l = p(PRODUTOS[i]!);
              return (
                <li key={pr.nome} className="bg-[var(--v3-noite)]">
                  <Link
                    href={l.href}
                    hrefLang={l.hrefLang}
                    className="group flex h-full flex-col justify-between gap-6 p-6 transition-colors duration-500 hover:bg-[var(--v3-noite-2)]"
                  >
                    <div>
                      <h3 className="flex flex-wrap items-center gap-3 text-xl font-medium tracking-[-0.03em]">
                        {pr.nome}
                        {PRODUTOS[i] === '/projetos' && (
                          <span className="v3-etiqueta rounded-full border border-[var(--v3-linha)] px-2.5 py-0.5 text-[var(--v3-cinza)]">
                            {x.prova.demo}
                          </span>
                        )}
                      </h3>
                      <p className="mt-2 text-sm text-[var(--v3-cinza)]">{pr.prova}</p>
                    </div>
                    <span className="inline-flex items-center gap-3 text-sm">
                      {x.prova.abrir}
                      <span
                        aria-hidden
                        className="grid h-8 w-8 place-items-center rounded-full bg-[var(--v3-papel)] text-[var(--v3-noite)] transition-transform duration-500 group-hover:rotate-[-45deg] rtl:-scale-x-100"
                      >
                        →
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
          <p className="mt-6 text-sm text-[var(--v3-cinza)]">{x.prova.nota}</p>
        </div>
      </section>

      {/* -------------------------------------------------------- 7 · fases */}
      <section id="como" aria-labelledby="v3-fases-t" className="border-t border-[var(--v3-linha)] px-4 py-28 sm:px-6 lg:py-40">
        <div className="mx-auto max-w-[110rem]">
          <div className="grid gap-8 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <Etiqueta numero="06">{x.fases.etiqueta}</Etiqueta>
            </div>
            <div className="lg:col-span-8">
              <RevelarLinhas as="h2" id="v3-fases-t" className="v3-titulo">
                {x.fases.titulo}
              </RevelarLinhas>
              <p id="v3-fases" className="mt-6 max-w-[56ch] text-lg text-[var(--v3-cinza)]">
                {x.fases.lead}
              </p>
            </div>
          </div>

          <ol className="mt-20 border-t border-[var(--v3-linha)]">
            {x.fases.itens.map((f, i) => (
              <li key={f.titulo} className="border-b border-[var(--v3-linha)]">
                <details className="group" open={i === 0}>
                  <summary className="grid grid-cols-[3.5rem_1fr_auto] items-baseline gap-4 py-7 lg:grid-cols-[6rem_1fr_1fr_auto]">
                    <span className="v3-numeral text-3xl text-[var(--v3-cinza)]">{dois(i + 1)}</span>
                    <span className="text-[clamp(1.5rem,1.1rem+1.6vw,2.75rem)] font-medium tracking-[-0.04em]">{f.titulo}</span>
                    <span className="hidden text-[var(--v3-cinza)] lg:block">{f.pergunta}</span>
                    <span aria-hidden className="v3-mais text-3xl font-light transition-transform duration-300">
                      +
                    </span>
                  </summary>
                  <div className="grid gap-6 pb-8 lg:grid-cols-[6rem_1fr_1fr_auto] lg:gap-4">
                    <span className="hidden lg:block" />
                    <p className="text-[var(--v3-cinza)] lg:hidden">{f.pergunta}</p>
                    <div>
                      <p className="v3-etiqueta text-[var(--v3-cinza)]">{x.fases.entregavel}</p>
                      <p className="mt-2">{f.entrega}</p>
                    </div>
                    <div>
                      <p className="v3-etiqueta text-[var(--v3-cinza)]">{x.fases.decisao}</p>
                      <p className="mt-2">{f.decisao}</p>
                      <p className="mt-3 inline-block rounded-full border border-[var(--v3-ambar)]/50 px-3 py-1 text-xs text-[var(--v3-ambar)]">
                        {x.fases.pode}
                      </p>
                    </div>
                  </div>
                </details>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* -------------------------------------------- 8 · onde trabalhamos */}
      <section id="mercados" aria-labelledby="v3-onde-t" className="v3-claro overflow-hidden py-28 lg:py-40">
        <div className="mx-auto max-w-[110rem] px-4 sm:px-6">
          <div className="grid gap-8 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <Etiqueta numero="07" claro>
                {x.onde.etiqueta}
              </Etiqueta>
            </div>
            <div className="lg:col-span-8">
              <RevelarLinhas as="h2" id="v3-onde-t" className="v3-titulo">
                {x.onde.titulo}
              </RevelarLinhas>
              <p id="v3-onde" className="mt-6 max-w-[56ch] text-lg text-[var(--v3-terra)]">
                {x.onde.lead}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-16 border-y border-[var(--v3-linha-escura)] py-6">
          <Faixa itens={x.onde.mercados.map((m) => m.nome)} className="text-[clamp(3rem,2rem+5vw,7rem)] font-medium tracking-[-0.05em]" />
        </div>

        <ul className="mx-auto mt-16 grid max-w-[110rem] gap-px px-4 sm:px-6 md:grid-cols-2 lg:grid-cols-4">
          {x.onde.mercados.map((m, i) => {
            const l = p(MERCADOS[i]!);
            return (
              <li key={m.nome} className="flex flex-col justify-between gap-8 border-t border-[var(--v3-linha-escura)] py-8 lg:pe-8">
                <div>
                  <h3 className="text-2xl font-medium tracking-[-0.03em]">{m.nome}</h3>
                  <p className="mt-3 text-[var(--v3-terra)]">{m.texto}</p>
                </div>
                <Link
                  href={l.href}
                  hrefLang={l.hrefLang}
                  className="inline-flex items-center gap-2 text-sm font-medium underline decoration-[var(--v3-linha-escura)] underline-offset-4 hover:decoration-[var(--v3-noite)]"
                >
                  {x.onde.explorar} {m.nome}
                  <span aria-hidden className="rtl:-scale-x-100">→</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      {/* ---------------------------------------------------- 9 · quem lidera */}
      <section aria-labelledby="v3-equipa" className="px-4 py-28 sm:px-6 lg:py-40">
        <div className="mx-auto max-w-[110rem]">
          <div className="grid gap-8 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <Etiqueta numero="08">{x.equipa.etiqueta}</Etiqueta>
            </div>
            <RevelarLinhas as="h2" id="v3-equipa" className="v3-titulo lg:col-span-8">
              {x.equipa.titulo}
            </RevelarLinhas>
          </div>

          <ul className="mt-20 grid gap-10 md:grid-cols-2">
            {FOUNDERS.people.map((pessoa, i) => (
              <li key={pessoa.name}>
                <ImagemRevelada className="aspect-[4/5] overflow-hidden rounded-[1.5rem] bg-[var(--v3-noite-2)]">
                  <Image
                    src={FOTOS[pessoa.photo as keyof typeof FOTOS]}
                    alt={pessoa.name}
                    sizes="(min-width: 768px) 45vw, 92vw"
                    className="h-full w-full object-cover grayscale-[35%]"
                  />
                </ImagemRevelada>
                <div className="mt-6 flex items-start justify-between gap-6">
                  <div>
                    <h3 className="text-3xl font-medium tracking-[-0.035em]">{pessoa.name}</h3>
                    <p className="v3-etiqueta mt-2 text-[var(--v3-cinza)]">{x.equipa.pessoas[i]!.papel}</p>
                    <p className="mt-4 max-w-[46ch] text-[var(--v3-cinza)]">{x.equipa.pessoas[i]!.texto}</p>
                  </div>
                  <LigacaoVidro
                    href={pessoa.linkedin}
                    externa
                    rotulo={`${x.equipa.perfil}: ${pessoa.name}`}
                    material="regular"
                    appearance="dark"
                    refraction={5}
                    size="icon"
                    className="shrink-0 bg-[var(--v3-noite)]/60! text-sm text-[var(--v3-papel)] ring-1 ring-[var(--v3-linha)]"
                  >
                    in
                  </LigacaoVidro>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* -------------------------------------------- 10 · o que estamos a ver */}
      <section aria-labelledby="v3-ideias" className="v3-claro px-4 py-28 sm:px-6 lg:py-40">
        <div className="mx-auto max-w-[110rem]">
          <div className="flex flex-wrap items-end justify-between gap-8">
            <div>
              <Etiqueta numero="09" claro>
                {x.ideias.etiqueta}
              </Etiqueta>
              <h2 id="v3-ideias" className="v3-titulo mt-8">
                {x.ideias.titulo}
              </h2>
            </div>
            <BotaoPilula href={p('/news').href} variante="escuro">
              {x.ideias.ler}
            </BotaoPilula>
          </div>
          <Suspense fallback={<p className="mt-16 text-lg text-[var(--v3-terra)]">{x.ideias.vazio}</p>}>
            <IdeiasV3 lingua={lingua} vazio={x.ideias.vazio} />
          </Suspense>
        </div>
      </section>

      {/* --------------------------------------------------------- 11 · FAQ */}
      <section aria-labelledby="v3-faq" className="px-4 py-28 sm:px-6 lg:py-40">
        <div className="mx-auto grid max-w-[110rem] gap-12 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <Etiqueta numero="10">{x.faq.etiqueta}</Etiqueta>
            <h2 id="v3-faq" className="v3-titulo mt-8 text-[clamp(2rem,1.2rem+2.6vw,3.75rem)]">
              {x.faq.titulo}
            </h2>
          </div>
          <ul className="border-t border-[var(--v3-linha)] lg:col-span-8">
            {x.faq.itens.map((f) => (
              <li key={f.q} className="border-b border-[var(--v3-linha)]">
                <details>
                  <summary className="flex items-center justify-between gap-6 py-6 text-xl font-medium tracking-[-0.02em]">
                    {f.q}
                    <span aria-hidden className="v3-mais shrink-0 text-2xl font-light transition-transform duration-300">
                      +
                    </span>
                  </summary>
                  <p className="max-w-[62ch] pb-7 text-[var(--v3-cinza)]">{f.a}</p>
                </details>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ------------------------------------------------ 12 · chamada final */}
      <section aria-labelledby="v3-final" className="v3-grao relative isolate overflow-hidden px-4 py-32 sm:px-6 lg:py-48">
        <Paralaxe intensidade={18} className="absolute inset-0 -z-20">
          <picture>
            <source type="image/avif" srcSet="/v3/hero-1920.avif" />
            <img src="/v3/hero-1920.webp" alt="" loading="lazy" decoding="async" className="h-[120%] w-full object-cover" />
          </picture>
        </Paralaxe>
        <div aria-hidden className="absolute inset-0 -z-10 bg-[var(--v3-noite)]/75" />
        <div className="mx-auto max-w-[110rem]">
          <RevelarLinhas as="h2" id="v3-final" className="v3-titulo max-w-[18ch] text-[clamp(2.5rem,1.4rem+4.6vw,6.5rem)]">
            {x.final.titulo}
          </RevelarLinhas>
          <div className="mt-12 flex flex-col gap-8 sm:flex-row sm:items-end sm:justify-between">
            <p className="max-w-[48ch] text-lg text-[var(--v3-papel)]/85">{x.final.texto}</p>
            <div className="flex flex-col items-start gap-3 sm:items-end">
              <BotaoPilula href={diag}>{x.final.cta}</BotaoPilula>
              <p className="v3-etiqueta text-[var(--v3-papel)]/75">{x.final.micro}</p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
