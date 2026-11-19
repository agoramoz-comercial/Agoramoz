import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, ArrowUpRight, MessageCircle } from 'lucide-react';
import { Section } from '@/components/ui/Section';
import { Button } from '@/components/ui/Button';
import { SoPortugues } from '@/components/ui/SoPortugues';
import { SplitHeading } from '@/components/motion/SplitHeading';
import { MagneticButton } from '@/components/motion/MagneticButton';
import { CountUp } from '@/components/motion/CountUp';
import { ScrubLine } from '@/components/motion/ScrubLine';
import { CardStack } from '@/components/motion/CardStack';
import { ArchReveal } from '@/components/motion/ArchReveal';
import { Founders } from '@/components/sections/Founders';
import { SITE } from '@/content/site';
import { COUNTRY_CODES, getSectorsForCountry, getSolutionSummaries } from '@/content/registry';
import { CURSOS_ESTATICOS } from '@/content/cursos';
import { RESUMO_SOLUCAO } from '@/content/i18n/chrome';
import { ROTULO_SETOR } from '@/content/i18n/formulario';
import { DIAGNOSTICO } from '@/content/i18n/diagnostico';
import { INICIO, INICIO_V2, conteudoDoInicio } from '@/content/i18n/inicio';
import type { Idioma } from '@/content/types';
import { ligacao } from '@/lib/i18n/rotas';
import { t } from '@/lib/i18n/texto';
import { cn } from '@/lib/utils/cn';
import logoClaro from '@/public/brand/logo-transparente-claro.png';

/**
 * Página inicial do website v2 (D-50, revista em D-51): conteúdo «Conversa»,
 * cores do logótipo, composição editorial em mosaico.
 *
 * Por ordem: mosaico de abertura (a pergunta, os dois caminhos, as cores do
 * logótipo) e escolha de setor; o problema em grande e os cartões empilhados
 * (05); os números que contam (02); como funciona; o diagnóstico no meio-disco
 * do logótipo (06, 08); o sistema com a linha desenhada pelo scroll (03);
 * soluções; curso; quem somos; chamada final. Títulos por linhas (01).
 *
 * Tudo o que se lê está no HTML servido. Sem fotografias de banco: onde a
 * composição pede imagem, entram as cores e o meio-disco do próprio logótipo.
 */

const WHATSAPP = `https://wa.me/${SITE.whatsapp.e164}`;

/** Maiúsculas grandes e apertadas: a voz dos títulos v2. */
/**
 * A altura de linha (0,92) vai sempre DEPOIS do tamanho, em cada uso: o `cn`
 * usa o tailwind-merge, que apaga um `leading-*` anterior a um tamanho de letra.
 */
const DISPLAY = 'font-display font-semibold uppercase tracking-[-0.035em]';

function Titulo({
  numero,
  eyebrow,
  titulo,
  id,
  centro = false,
  className,
}: {
  numero: string;
  eyebrow: string;
  titulo: string;
  id: string;
  centro?: boolean;
  className?: string;
}) {
  return (
    <div className={cn('grid gap-5', centro && 'justify-items-center text-center', className)}>
      <p className="m-0 text-sm font-semibold uppercase tracking-[0.14em] text-[color:var(--muted)]">
        <span className="tabular-nums">{numero}</span> · {eyebrow}
      </p>
      <SplitHeading
        id={id}
        className={cn(DISPLAY, 'max-w-[30ch] text-[length:clamp(2rem,1.25rem+2.8vw,3.75rem)]', 'leading-[0.92]')}
      >
        {titulo}
      </SplitHeading>
    </div>
  );
}

export function Inicio({ idioma }: { idioma: Idioma }) {
  const c = conteudoDoInicio(idioma);
  const v = INICIO_V2;
  const solucoes = getSolutionSummaries();
  const setores = getSectorsForCountry('mz');
  const diagnostico = ligacao('/diagnostico', idioma);
  const indiceSolucoes = ligacao('/solucoes', idioma);
  const setoresPagina = ligacao('/setores', idioma);
  const curso = CURSOS_ESTATICOS[0]?.curso;
  const cursoHref = curso ? ligacao(`/cursos/${curso.slug}`, idioma) : null;
  const cursoDoc = curso ? ligacao(`/cursos/${curso.slug}/documento`, idioma) : null;
  const passosDoSistema = c.fluxo.steps.map((s) => ({ titulo: s.title, texto: s.body }));
  const coresDosCartoes = ['verde', 'amarelo', 'vermelho', 'deep'] as const;
  const numeros = [
    { n: DIAGNOSTICO.entregas.length, r: v.numeros.entregaveis, cor: 'bg-[color:var(--v2-verde)]' },
    { n: c.processo.steps.length, r: v.numeros.fases, cor: 'bg-[color:var(--v2-amarelo)]' },
    { n: solucoes.length, r: v.numeros.capacidades, cor: 'bg-[color:var(--v2-vermelho)]' },
    { n: COUNTRY_CODES.length, r: v.numeros.mercados, cor: 'bg-[color:var(--v2-preto)]' },
  ];

  return (
    <>
      {/* 1 — Mosaico de abertura */}
      <section aria-label={t(INICIO.aria.apresentacao, idioma)} className="px-[var(--container-gutter)] pb-2 pt-2">
        <div className="mx-auto grid max-w-[var(--container-max)] gap-2 lg:grid-cols-12">
          {/* A pergunta */}
          <div
            data-surface="deep"
            className="relative grid content-between gap-10 overflow-hidden rounded-[1.25rem] bg-[color:var(--surface)] p-6 text-[color:var(--on-surface)] sm:p-10 lg:col-span-8 lg:row-span-2"
          >
            <div className="flex flex-wrap items-center justify-between gap-4">
              <Image src={logoClaro} alt="" priority className="h-10 w-auto sm:h-12" />
              <p className="m-0 text-sm font-semibold text-[color:var(--muted)]">{t(v.selo, idioma)}</p>
            </div>
            <div className="grid gap-7">
              <h1 className={cn(DISPLAY, 'm-0 max-w-[20ch] text-[length:clamp(2.375rem,1.2rem+3.8vw,4.75rem)]', 'leading-[0.92]')}>
                {t(v.titulo, idioma)}
              </h1>
              <p className="m-0 max-w-[40rem] text-lg leading-relaxed text-[color:var(--muted)]">{t(v.lead, idioma)}</p>
              <div className="flex flex-wrap gap-3">
                <MagneticButton>
                  <Button asChild size="lg" className="rounded-full">
                    <a href={WHATSAPP} target="_blank" rel="noopener noreferrer">
                      <MessageCircle aria-hidden className="size-5" />
                      {t(v.whatsapp, idioma)}
                    </a>
                  </Button>
                </MagneticButton>
                <Button asChild size="lg" variant="outline" className="rounded-full">
                  <Link href={diagnostico.href} hrefLang={diagnostico.soPortugues ? 'pt' : undefined}>
                    {t(v.pedido, idioma)}
                    <SoPortugues idioma={idioma} herdar />
                  </Link>
                </Button>
              </div>
            </div>
          </div>

          {/* O meio-disco do logótipo, em grande */}
          <div
            aria-hidden
            data-surface="amarelo"
            className="relative min-h-56 overflow-hidden rounded-[1.25rem] bg-[color:var(--surface)] lg:col-span-4 lg:min-h-0"
          >
            <div className="absolute inset-x-[12%] bottom-0 top-[18%] rounded-t-full bg-[color:var(--v2-vermelho)]" />
            <div className="v2-pontos absolute inset-x-0 bottom-0 h-1/2 opacity-60" />
          </div>

          {/* A frase da marca */}
          <div
            data-surface="verde"
            className="v2-campo relative grid min-h-56 content-end overflow-hidden rounded-[1.25rem] p-6 text-[color:var(--on-surface)] sm:p-8 lg:col-span-4 lg:min-h-0"
          >
            <p className={cn(DISPLAY, 'relative m-0 max-w-[14ch] text-[length:clamp(1.75rem,1.1rem+1.8vw,2.75rem)]', 'leading-[0.92]')}>
              {t(v.marca, idioma)}
            </p>
          </div>

          {/* Escolha de setor */}
          <nav
            aria-labelledby="h-setor"
            data-surface="light"
            className="grid gap-5 rounded-[1.25rem] bg-white p-6 sm:p-8 lg:col-span-12 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,3fr)] lg:items-center"
          >
            <div className="grid gap-2">
              <h2 id="h-setor" className={cn(DISPLAY, 'm-0 text-[length:clamp(1.5rem,1.1rem+1.2vw,2.25rem)]', 'leading-[0.92]')}>
                {t(v.setor, idioma)}
              </h2>
              <p className="m-0 text-sm text-[color:var(--muted)]">
                {t(v.setorNota, idioma)}{' '}
                <Link
                  href={setoresPagina.href}
                  hrefLang={setoresPagina.soPortugues ? 'pt' : undefined}
                  className="font-semibold text-[color:var(--on-surface)] underline underline-offset-4"
                >
                  {t(v.todosSetores, idioma)}
                </Link>
              </p>
            </div>
            <ul className="m-0 grid list-none grid-cols-1 gap-2 p-0 sm:grid-cols-2 lg:grid-cols-5">
              {setores.map((s) => {
                const l = ligacao(s.href, idioma);
                return (
                  <li key={s.sector}>
                    <Link
                      href={l.href}
                      hrefLang={l.soPortugues ? 'pt' : undefined}
                      className="flex h-full min-h-16 items-center justify-between gap-3 rounded-2xl bg-[color:var(--v2-papel)] px-4 py-3 font-semibold leading-snug transition-colors hover:bg-[color:var(--v2-amarelo)]"
                    >
                      <span>
                        {t(ROTULO_SETOR[s.sector], idioma)}
                        <SoPortugues idioma={idioma} />
                      </span>
                      <ArrowRight aria-hidden className="size-5 shrink-0" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      </section>

      {/* 2 — O problema, em grande, e os cartões empilhados (05) */}
      <Section surface="light" spacing="tight" id="problemas" aria-labelledby="h-problemas">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:items-start">
          <Titulo
            numero="01"
            eyebrow={t(INICIO.problemas.eyebrow, idioma)}
            titulo={t(INICIO.problemas.titulo, idioma)}
            id="h-problemas"
            className="lg:sticky lg:top-28"
          />
          <CardStack>
            {c.problemas.map((p, i) => (
              <article
                key={p.title}
                data-cartao
                data-surface={coresDosCartoes[i % coresDosCartoes.length]}
                className="sticky top-24 mb-3 grid min-h-32 content-between gap-3 rounded-[1.25rem] bg-[color:var(--surface)] p-6 text-[color:var(--on-surface)] shadow-[0_-8px_28px_rgba(10,10,11,0.10)] sm:p-8"
              >
                <span className="text-sm font-semibold tabular-nums text-[color:var(--muted)]">
                  [{String(i + 1).padStart(2, '0')}]
                </span>
                <div className="grid gap-3">
                  <h3 className={cn(DISPLAY, 'm-0 text-[length:clamp(1.625rem,1.1rem+1.6vw,2.5rem)]', 'leading-[0.92]')}>{p.title}</h3>
                  <p className="m-0 max-w-[46ch] text-base leading-relaxed text-[color:var(--muted)] sm:text-lg">{p.body}</p>
                </div>
              </article>
            ))}
          </CardStack>
        </div>
      </Section>

      {/* 3 — Números que contam (02) */}
      <Section surface="light" spacing="none" aria-label={t(v.numeros.rotulo, idioma)} className="pb-[var(--space-section-tight)]">
        <dl className="m-0 grid border-t border-[color:var(--hairline)] lg:grid-cols-4 lg:gap-8 lg:border-t-0">
          {numeros.map((x) => (
            <div
              key={x.r.pt}
              className="grid grid-cols-[auto_minmax(0,1fr)] items-baseline gap-x-6 gap-y-1 border-b border-[color:var(--hairline)] py-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] sm:items-center lg:grid-cols-1 lg:content-start lg:gap-y-3 lg:border-b-0 lg:border-t-2 lg:border-[color:var(--v2-preto)] lg:pt-5"
            >
              <dt className={cn(DISPLAY, 'order-2 col-span-2 text-[length:clamp(1.25rem,0.9rem+1.1vw,1.75rem)] text-[color:var(--muted)] sm:col-span-1 lg:max-w-[16ch]', 'leading-[0.92]')}>
                {t(x.r, idioma)}
              </dt>
              <dd className={cn(DISPLAY, 'order-1 m-0 flex items-center gap-4 text-[length:clamp(2.75rem,1.6rem+3.8vw,5.25rem)] leading-none')}>
                <span aria-hidden className={cn('inline-block size-4 shrink-0 rounded-full sm:size-6', x.cor)} />
                <CountUp valor={x.n} />
              </dd>
            </div>
          ))}
        </dl>
      </Section>

      {/* 4 — Como funciona */}
      <Section surface="deep" spacing="tight" aria-labelledby="h-passos">
        <Titulo numero="02" eyebrow={t(v.passos.eyebrow, idioma)} titulo={t(v.passos.titulo, idioma)} id="h-passos" />
        <ol className="m-0 mt-10 grid list-none gap-3 p-0 md:grid-cols-3">
          {v.passos.itens.map((p, i) => (
            <li key={p.titulo.pt} className="grid content-start gap-3 rounded-[1.25rem] bg-[color:var(--surface-raised)] p-5 sm:p-6">
              <span
                aria-hidden
                className={cn(
                  'grid size-12 place-items-center rounded-full text-xl font-bold text-[color:var(--v2-preto)]',
                  ['bg-[color:var(--v2-verde)]', 'bg-[color:var(--v2-amarelo)]', 'bg-[color:var(--v2-vermelho)]'][i % 3],
                )}
              >
                {i + 1}
              </span>
              <h3 className="m-0 mt-2 text-[1.375rem] font-semibold tracking-[-0.02em]">{t(p.titulo, idioma)}</h3>
              <p className="m-0 text-base leading-relaxed text-[color:var(--muted)]">{t(p.texto, idioma)}</p>
            </li>
          ))}
        </ol>
      </Section>

      {/* 5 — Diagnóstico no meio-disco do logótipo (06), botão magnético (08) */}
      <section id="diagnostico" aria-labelledby="h-diagnostico">
        <ArchReveal>
          <div className="grid justify-items-center gap-6 text-center">
            <p className="m-0 text-sm font-semibold uppercase tracking-[0.14em]">03 · {t(DIAGNOSTICO.eyebrow, idioma)}</p>
            <SplitHeading
              id="h-diagnostico"
              className={cn(DISPLAY, 'max-w-[16ch] text-[length:clamp(2.25rem,1.3rem+3.6vw,4.75rem)]', 'leading-[0.92]')}
            >
              {t(DIAGNOSTICO.titulo, idioma)}
            </SplitHeading>
            <p className="m-0 max-w-[44ch] text-lg leading-relaxed">
              <strong className="font-semibold">{t(DIAGNOSTICO.nome, idioma)}.</strong> {t(DIAGNOSTICO.promessa, idioma)}
            </p>
            <MagneticButton>
              <Button asChild size="lg" variant="claro" className="rounded-full">
                <Link href={diagnostico.href} hrefLang={diagnostico.soPortugues ? 'pt' : undefined}>
                  {t(v.pedirDiagnostico, idioma)}
                  <ArrowRight aria-hidden className="size-5" />
                </Link>
              </Button>
            </MagneticButton>
          </div>
        </ArchReveal>

        <Section surface="light" spacing="none" as="div" aria-labelledby="h-recebe" className="pb-[var(--space-section-tight)] pt-12">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
            <div className="grid content-start gap-6">
              <h3 id="h-recebe" className={cn(DISPLAY, 'm-0 text-[length:clamp(1.75rem,1.2rem+1.8vw,3rem)]', 'leading-[0.92]')}>
                {t(v.recebe, idioma)}
              </h3>
              <p className="m-0 rounded-[1.25rem] bg-[color:var(--v2-preto)] p-7 text-lg leading-snug text-white">{t(v.regra, idioma)}</p>
            </div>
            <ol className="m-0 grid list-none grid-cols-1 gap-x-8 p-0 sm:grid-cols-2">
              {DIAGNOSTICO.entregas.map((e, i) => (
                <li key={e.pt} className="flex gap-4 border-t border-[color:var(--border)] py-3 text-base">
                  <span className="min-w-7 font-bold tabular-nums">{String(i + 1).padStart(2, '0')}</span>
                  {t(e, idioma)}
                </li>
              ))}
            </ol>
          </div>
        </Section>
      </section>

      {/* 6 — O sistema: a linha desenha-se com o scroll (03) */}
      <Section surface="deep" spacing="tight" aria-labelledby="h-sistema">
        <Titulo numero="04" eyebrow={c.fluxo.eyebrow} titulo={c.fluxo.title} id="h-sistema" />
        <p className="m-0 mt-6 max-w-[60ch] text-lg leading-relaxed text-[color:var(--muted)]">{c.fluxo.lead}</p>
        <ScrubLine passos={passosDoSistema} className="mt-10" />
      </Section>

      {/* 7 — Soluções */}
      <Section surface="light" spacing="tight" aria-labelledby="h-solucoes">
        <Titulo
          numero="05"
          eyebrow={t(INICIO.solucoes.eyebrow, idioma)}
          titulo={t(INICIO.solucoes.titulo, idioma)}
          id="h-solucoes"
        />
        <ul className="m-0 mt-8 grid list-none grid-cols-1 gap-2 p-0 sm:grid-cols-2 lg:grid-cols-4">
          {solucoes.map((s) => {
            const l = ligacao(s.href, idioma);
            return (
              <li key={s.slug}>
                <Link
                  href={l.href}
                  hrefLang={l.soPortugues ? 'pt' : undefined}
                  className="grid h-full content-between gap-6 rounded-[1.25rem] bg-white p-6 transition-colors hover:bg-[color:var(--v2-amarelo)]"
                >
                  <span className="grid gap-2">
                    <span className="text-xl font-semibold tracking-[-0.02em]">
                      {t(RESUMO_SOLUCAO[s.slug].label, idioma)}
                      <SoPortugues idioma={idioma} />
                    </span>
                    <span className="text-sm leading-relaxed text-[color:var(--muted)]">{t(RESUMO_SOLUCAO[s.slug].short, idioma)}</span>
                  </span>
                  <ArrowUpRight aria-hidden className="size-5" />
                </Link>
              </li>
            );
          })}
          <li>
            <Link
              href={indiceSolucoes.href}
              hrefLang={indiceSolucoes.soPortugues ? 'pt' : undefined}
              data-surface="vermelho"
              className="grid h-full content-between gap-6 rounded-[1.25rem] bg-[color:var(--surface)] p-6 text-[color:var(--on-surface)]"
            >
              <span className={cn(DISPLAY, 'text-2xl', 'leading-[0.92]')}>{t(v.verSolucoes, idioma)}</span>
              <ArrowRight aria-hidden className="size-6" />
            </Link>
          </li>
        </ul>
      </Section>

      {/* 8 — Curso publicado */}
      {curso && cursoHref && cursoDoc ? (
        <Section surface="light" spacing="none" aria-labelledby="h-curso" className="pb-[var(--space-section-tight)]">
          <div
            data-surface="verde"
            className="v2-campo grid items-center gap-8 rounded-[1.25rem] p-8 text-[color:var(--on-surface)] sm:p-12 lg:grid-cols-[minmax(0,1.4fr)_auto]"
          >
            <div className="grid gap-3">
              <p className="m-0 text-sm font-semibold uppercase tracking-[0.14em]">{t(v.curso.eyebrow, idioma)}</p>
              <h2 id="h-curso" className={cn(DISPLAY, 'm-0 text-[length:clamp(1.875rem,1.2rem+2.2vw,3.25rem)]', 'leading-[0.92]')}>
                {curso.titulo}
              </h2>
              <p className="m-0 text-lg">{t(v.curso.texto, idioma)}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg" variant="solid" className="rounded-full">
                <Link href={cursoHref.href} hrefLang={cursoHref.soPortugues ? 'pt' : undefined}>
                  {t(v.curso.ver, idioma)}
                  <SoPortugues idioma={idioma} herdar />
                </Link>
              </Button>
              <Button asChild size="lg" variant="claro" className="rounded-full">
                <Link href={cursoDoc.href} hrefLang={cursoDoc.soPortugues ? 'pt' : undefined}>
                  {t(v.curso.documento, idioma)}
                </Link>
              </Button>
            </div>
          </div>
        </Section>
      ) : null}

      {/* 9 — Quem somos */}
      <Section surface="light" spacing="tight" aria-labelledby="h-quem" className="border-t border-[color:var(--border)]">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.3fr)] lg:items-start">
          <div className="grid gap-6">
            <Titulo numero="06" eyebrow={t(v.quem.eyebrow, idioma)} titulo={t(v.quem.titulo, idioma)} id="h-quem" />
            <p className="m-0 max-w-[46ch] text-lg leading-relaxed text-[color:var(--muted)]">{c.provaSecao.lead}</p>
          </div>
          <Founders idioma={idioma} className="mt-0" />
        </div>
      </Section>

      {/* 10 — Chamada final */}
      <Section surface="vermelho" spacing="tight" aria-labelledby="h-final" className="v2-nascer">
        <div className="grid justify-items-start gap-6">
          <SplitHeading
            id="h-final"
            className={cn(DISPLAY, 'max-w-[18ch] text-[length:clamp(2.25rem,1.2rem+4vw,5rem)]', 'leading-[0.92]')}
          >
            {t(v.final.titulo, idioma)}
          </SplitHeading>
          <MagneticButton>
            <Button asChild size="lg" variant="solid" className="rounded-full">
              <a href={WHATSAPP} target="_blank" rel="noopener noreferrer">
                <MessageCircle aria-hidden className="size-5" />
                {t(v.whatsapp, idioma)} · {SITE.whatsapp.display}
              </a>
            </Button>
          </MagneticButton>
          <p className="m-0 text-base">
            {t(v.final.email, idioma)} <span className="select-all font-semibold">{SITE.email}</span>
          </p>
        </div>
      </Section>
    </>
  );
}
