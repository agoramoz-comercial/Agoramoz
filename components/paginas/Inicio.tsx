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
import { Circulos } from '@/components/v2/Circulos';
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

/**
 * Página inicial do website v2 (D-51): cores do logótipo e uma composição em
 * mosaico de blocos de cantos vivos, com tipografia gigante a atravessar blocos,
 * números empilhados e manifestos centrados. Linguagem estudada numa referência
 * editorial; código, arte e conteúdo são da AGORAMOZ.
 *
 * Por ordem: mosaico (a marca, a pergunta, os dois caminhos), escolha de setor,
 * o problema (manifesto e cartões, 05), como funciona, números (02), diagnóstico
 * (arco 06, botão 08), o sistema (linha 03), soluções, curso, quem somos, final.
 * Títulos por linhas (01) e cortina entre páginas (10).
 *
 * Onde a composição pede imagem entra a arte de círculos (`Circulos`), nas cores
 * do logótipo. Texto sobre cor é sempre preto; sobre preto, branco ou amarelo.
 */

const WHATSAPP = `https://wa.me/${SITE.whatsapp.e164}`;

/**
 * Voz dos títulos: neo-grotesca, peso médio, caixa mista, muito apertada. A altura
 * de linha vai sempre DEPOIS do tamanho em cada uso (o `cn` usa o tailwind-merge,
 * que apaga um `leading-*` anterior a um tamanho de letra).
 */
const DISPLAY = 'font-display font-medium tracking-[-0.045em]';

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
        className={cn(DISPLAY, 'max-w-[28ch] text-[length:clamp(2.25rem,1.2rem+3.2vw,4.5rem)]', 'leading-[0.95]')}
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
  const desfasamento = ['lg:mt-0', 'lg:mt-16', 'lg:mt-6', 'lg:mt-24'];
  const numeros = [
    { n: DIAGNOSTICO.entregas.length, r: v.numeros.entregaveis },
    { n: c.processo.steps.length, r: v.numeros.fases },
    { n: solucoes.length, r: v.numeros.capacidades },
    { n: COUNTRY_CODES.length, r: v.numeros.mercados },
  ];

  return (
    <>
      {/* 1 — Mosaico de abertura: blocos de cantos vivos, tipografia a atravessar blocos */}
      <section aria-label={t(INICIO.aria.apresentacao, idioma)} className="grid lg:grid-cols-4">
        {/* A marca */}
        <div className="grid lg:row-span-2 lg:grid-rows-[minmax(0,1fr)_auto]">
          <Circulos variante="sol" className="min-h-40 lg:min-h-0" />
          <div data-surface="deep" className="grid gap-3 bg-[color:var(--surface)] p-5 text-[color:var(--on-surface)] sm:p-7">
            <p aria-hidden className={cn(DISPLAY, 'm-0 text-[length:clamp(3rem,1.6rem+3.6vw,5.5rem)]', 'leading-[0.85]')}>
              AGORA
              <br />
              MOZ
            </p>
            <p className="m-0 text-sm text-[color:var(--muted)]">{t(v.selo, idioma)}</p>
          </div>
        </div>
        <Circulos variante="mar" className="min-h-64 lg:col-span-3 lg:row-span-2 lg:min-h-[24rem]" />

        {/* A frase da marca, gigante, a atravessar para o bloco de cor */}
        <div className="relative z-10 flex min-h-64 items-end p-5 sm:p-7 lg:col-span-2 lg:min-h-[22rem]">
          <p className={cn(DISPLAY, 'm-0 text-[length:clamp(2.75rem,1.2rem+5.6vw,8rem)] lg:w-[150%] lg:shrink-0', 'leading-[0.88]')}>
            {t(v.marca, idioma)}
          </p>
        </div>
        <Circulos variante="campo" pontos className="hidden lg:block" />

        {/* A pergunta e os dois caminhos */}
        <div
          data-surface="deep"
          className="grid content-between gap-8 bg-[color:var(--surface)] p-5 text-[color:var(--on-surface)] sm:p-7 lg:row-span-2"
        >
          <div className="grid gap-5">
            <h1 className={cn(DISPLAY, 'm-0 text-[length:clamp(1.875rem,1.2rem+1.6vw,2.75rem)]', 'leading-[1.02]')}>
              {t(v.titulo, idioma)}
            </h1>
            <p className="m-0 text-base leading-relaxed text-[color:var(--muted)]">{t(v.lead, idioma)}</p>
          </div>
          <div className="grid gap-2">
            <MagneticButton className="w-full">
              <Button asChild size="lg" className="w-full justify-between rounded-none">
                <a href={WHATSAPP} target="_blank" rel="noopener noreferrer">
                  <span className="inline-flex items-center gap-2">
                    <MessageCircle aria-hidden className="size-5" />
                    {t(v.whatsapp, idioma)}
                  </span>
                  <ArrowUpRight aria-hidden className="size-5" />
                </a>
              </Button>
            </MagneticButton>
            <Button asChild size="lg" variant="claro" className="w-full justify-between rounded-none">
              <Link href={diagnostico.href} hrefLang={diagnostico.soPortugues ? 'pt' : undefined}>
                <span>
                  {t(v.pedido, idioma)}
                  <SoPortugues idioma={idioma} herdar />
                </span>
                <ArrowRight aria-hidden className="size-5" />
              </Link>
            </Button>
          </div>
        </div>

        {/* A faixa da acção, em letra grande */}
        <Link
          href={diagnostico.href}
          hrefLang={diagnostico.soPortugues ? 'pt' : undefined}
          className="flex items-center justify-between gap-6 bg-white px-5 py-4 sm:px-7 lg:col-span-3"
        >
          <span className={cn(DISPLAY, 'uppercase text-[length:clamp(2rem,1.2rem+3vw,4.5rem)]', 'leading-none')}>
            {t(v.pedirDiagnostico, idioma)}
          </span>
          <ArrowUpRight aria-hidden className="size-10 shrink-0 sm:size-14" />
        </Link>
      </section>

      {/* 2 — Escolha de setor */}
      <nav aria-labelledby="h-setor" data-surface="light" className="grid gap-px bg-[color:var(--v2-preto)] lg:grid-cols-6">
        <div className="grid content-between gap-4 bg-[color:var(--v2-papel)] p-5 sm:p-7 lg:col-span-1">
          <h2 id="h-setor" className={cn(DISPLAY, 'm-0 text-[length:clamp(1.5rem,1.1rem+1vw,2rem)]', 'leading-[1]')}>
            {t(v.setor, idioma)}
          </h2>
          <Link
            href={setoresPagina.href}
            hrefLang={setoresPagina.soPortugues ? 'pt' : undefined}
            className="text-sm font-semibold underline underline-offset-4"
          >
            {t(v.todosSetores, idioma)}
          </Link>
        </div>
        {setores.map((s) => {
          const l = ligacao(s.href, idioma);
          return (
            <Link
              key={s.sector}
              href={l.href}
              hrefLang={l.soPortugues ? 'pt' : undefined}
              className="group grid min-h-24 content-between gap-6 bg-[color:var(--v2-papel)] p-5 transition-colors hover:bg-[color:var(--v2-amarelo)] sm:p-7"
            >
              <ArrowUpRight aria-hidden className="size-6 justify-self-end" />
              <span className="text-lg font-medium leading-snug tracking-[-0.02em]">
                {t(ROTULO_SETOR[s.sector], idioma)}
                <SoPortugues idioma={idioma} />
              </span>
            </Link>
          );
        })}
      </nav>

      {/* 3 — O problema: manifesto centrado e cartões desencontrados (05) */}
      <Section surface="light" spacing="tight" id="problemas" aria-labelledby="h-problemas">
        <Titulo
          numero="01"
          eyebrow={t(INICIO.problemas.eyebrow, idioma)}
          titulo={t(INICIO.problemas.titulo, idioma)}
          id="h-problemas"
          centro
          className="mx-auto max-w-6xl"
        />
        <CardStack className="mt-14 gap-0 lg:grid-cols-4 lg:items-start lg:gap-4">
          {c.problemas.map((p, i) => (
            <article
              key={p.title}
              data-cartao
              data-surface={coresDosCartoes[i % coresDosCartoes.length]}
              className={cn(
                'sticky top-20 mb-3 grid min-h-40 content-between gap-6 bg-[color:var(--surface)] p-6 text-[color:var(--on-surface)] lg:static lg:mb-0 lg:min-h-64',
                desfasamento[i % desfasamento.length],
              )}
            >
              <span className="text-sm font-semibold tabular-nums text-[color:var(--muted)]">[{String(i + 1).padStart(2, '0')}]</span>
              <div className="grid gap-3">
                <h3 className={cn(DISPLAY, 'm-0 text-[length:clamp(1.625rem,1.2rem+1.2vw,2.25rem)]', 'leading-[1]')}>{p.title}</h3>
                <p className="m-0 text-base leading-relaxed text-[color:var(--muted)]">{p.body}</p>
              </div>
            </article>
          ))}
        </CardStack>
      </Section>

      {/* 4 — Como funciona */}
      <Section surface="deep" spacing="tight" aria-labelledby="h-passos">
        <Titulo numero="02" eyebrow={t(v.passos.eyebrow, idioma)} titulo={t(v.passos.titulo, idioma)} id="h-passos" />
        <ol className="m-0 mt-8 grid list-none gap-px bg-[color:var(--hairline)] p-0 md:grid-cols-3">
          {v.passos.itens.map((p, i) => (
            <li key={p.titulo.pt} className="grid content-start gap-4 bg-[color:var(--surface)] py-6 md:px-6 md:first:pl-0">
              <span className={cn(DISPLAY, 'text-[length:clamp(3rem,2rem+3vw,5rem)] text-[color:var(--v2-amarelo)]', 'leading-none')}>
                {String(i + 1).padStart(2, '0')}
              </span>
              <h3 className={cn(DISPLAY, 'm-0 text-[1.75rem]', 'leading-[1.05]')}>{t(p.titulo, idioma)}</h3>
              <p className="m-0 text-base leading-relaxed text-[color:var(--muted)]">{t(p.texto, idioma)}</p>
            </li>
          ))}
        </ol>
      </Section>

      {/* 5 — Números empilhados, que contam (02) */}
      <Section surface="light" spacing="tight" aria-label={t(v.numeros.rotulo, idioma)}>
        <dl className="m-0 grid">
          {numeros.map((x) => (
            <div key={x.r.pt} className="grid grid-cols-[auto_minmax(0,1fr)] items-baseline gap-x-5 border-b border-[color:var(--hairline)] py-1 last:border-b-0">
              <dt className={cn(DISPLAY, 'order-2 text-[length:clamp(1.5rem,0.6rem+3.4vw,4.75rem)] text-[color:var(--muted)]', 'leading-[1]')}>
                {t(x.r, idioma)}
              </dt>
              <dd className={cn(DISPLAY, 'order-1 m-0 text-[length:clamp(3rem,1.4rem+4.4vw,6rem)]', 'leading-[0.95]')}>
                <CountUp valor={x.n} />
              </dd>
            </div>
          ))}
        </dl>
      </Section>

      {/* 6 — Diagnóstico no meio-disco do logótipo (06), botão magnético (08) */}
      <section id="diagnostico" aria-labelledby="h-diagnostico">
        <ArchReveal>
          <div className="grid justify-items-center gap-6 text-center">
            <p className="m-0 text-sm font-semibold uppercase tracking-[0.14em]">03 · {t(DIAGNOSTICO.eyebrow, idioma)}</p>
            <SplitHeading id="h-diagnostico" className={cn(DISPLAY, 'max-w-[16ch] text-[length:clamp(2.25rem,1.3rem+3.6vw,4.75rem)]', 'leading-[0.95]')}>
              {t(DIAGNOSTICO.titulo, idioma)}
            </SplitHeading>
            <p className="m-0 max-w-[44ch] text-lg leading-relaxed">
              <strong className="font-semibold">{t(DIAGNOSTICO.nome, idioma)}.</strong> {t(DIAGNOSTICO.promessa, idioma)}
            </p>
            <MagneticButton>
              <Button asChild size="lg" variant="claro" className="rounded-none">
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
              <h3 id="h-recebe" className={cn(DISPLAY, 'm-0 text-[length:clamp(1.75rem,1.2rem+1.8vw,3rem)]', 'leading-[1]')}>
                {t(v.recebe, idioma)}
              </h3>
              <p className="m-0 bg-[color:var(--v2-preto)] p-7 text-lg leading-snug text-white">{t(v.regra, idioma)}</p>
            </div>
            <ol className="m-0 grid list-none grid-cols-1 gap-x-8 p-0 sm:grid-cols-2">
              {DIAGNOSTICO.entregas.map((e, i) => (
                <li key={e.pt} className="flex gap-4 border-t border-[color:var(--border)] py-2.5 text-base">
                  <span className="min-w-7 font-bold tabular-nums">{String(i + 1).padStart(2, '0')}</span>
                  {t(e, idioma)}
                </li>
              ))}
            </ol>
          </div>
        </Section>
      </section>

      {/* 7 — O sistema: a linha desenha-se com o scroll (03) */}
      <Section surface="deep" spacing="tight" aria-labelledby="h-sistema">
        <Titulo numero="04" eyebrow={c.fluxo.eyebrow} titulo={c.fluxo.title} id="h-sistema" />
        <p className="m-0 mt-6 max-w-[60ch] text-lg leading-relaxed text-[color:var(--muted)]">{c.fluxo.lead}</p>
        <ScrubLine passos={passosDoSistema} className="mt-10" />
      </Section>

      {/* 8 — Soluções */}
      <Section surface="light" spacing="tight" aria-labelledby="h-solucoes">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <Titulo numero="05" eyebrow={t(INICIO.solucoes.eyebrow, idioma)} titulo={t(INICIO.solucoes.titulo, idioma)} id="h-solucoes" />
          <Link
            href={indiceSolucoes.href}
            hrefLang={indiceSolucoes.soPortugues ? 'pt' : undefined}
            className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold underline underline-offset-4"
          >
            {t(v.verSolucoes, idioma)}
            <ArrowRight aria-hidden className="size-4" />
          </Link>
        </div>
        <ul className="m-0 mt-8 grid list-none grid-cols-1 gap-px bg-[color:var(--v2-preto)] p-0 sm:grid-cols-2 lg:grid-cols-4">
          {solucoes.map((s) => {
            const l = ligacao(s.href, idioma);
            return (
              <li key={s.slug} className="bg-white">
                <Link
                  href={l.href}
                  hrefLang={l.soPortugues ? 'pt' : undefined}
                  className="grid h-full min-h-40 content-between gap-6 p-6 transition-colors hover:bg-[color:var(--v2-amarelo)]"
                >
                  <ArrowUpRight aria-hidden className="size-6 justify-self-end" />
                  <span className="grid gap-2">
                    <span className={cn(DISPLAY, 'text-[1.625rem]', 'leading-[1.05]')}>
                      {t(RESUMO_SOLUCAO[s.slug].label, idioma)}
                      <SoPortugues idioma={idioma} />
                    </span>
                    <span className="text-sm leading-relaxed text-[color:var(--muted)]">{t(RESUMO_SOLUCAO[s.slug].short, idioma)}</span>
                  </span>
                </Link>
              </li>
            );
          })}
          <li aria-hidden className="hidden lg:block">
            <Circulos variante="noite" className="h-full min-h-40" />
          </li>
        </ul>
      </Section>

      {/* 9 — Curso publicado */}
      {curso && cursoHref && cursoDoc ? (
        <section aria-labelledby="h-curso" className="grid lg:grid-cols-4">
          <Circulos variante="campo" pontos className="min-h-56 lg:col-span-1" />
          <div data-surface="amarelo" className="grid content-center gap-5 bg-[color:var(--surface)] p-6 text-[color:var(--on-surface)] sm:p-10 lg:col-span-3">
            <p className="m-0 text-sm font-semibold uppercase tracking-[0.14em]">{t(v.curso.eyebrow, idioma)}</p>
            <h2 id="h-curso" className={cn(DISPLAY, 'm-0 max-w-[24ch] text-[length:clamp(2rem,1.2rem+2.6vw,3.75rem)]', 'leading-[0.98]')}>
              {curso.titulo}
            </h2>
            <p className="m-0 text-lg">{t(v.curso.texto, idioma)}</p>
            <div className="flex flex-wrap gap-2">
              <Button asChild size="lg" variant="solid" className="rounded-none">
                <Link href={cursoHref.href} hrefLang={cursoHref.soPortugues ? 'pt' : undefined}>
                  {t(v.curso.ver, idioma)}
                  <SoPortugues idioma={idioma} herdar />
                </Link>
              </Button>
              <Button asChild size="lg" variant="claro" className="rounded-none">
                <Link href={cursoDoc.href} hrefLang={cursoDoc.soPortugues ? 'pt' : undefined}>
                  {t(v.curso.documento, idioma)}
                </Link>
              </Button>
            </div>
          </div>
        </section>
      ) : null}

      {/* 10 — Quem somos */}
      <Section surface="light" spacing="tight" aria-labelledby="h-quem">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.3fr)] lg:items-start">
          <div className="grid gap-6">
            <Titulo numero="06" eyebrow={t(v.quem.eyebrow, idioma)} titulo={t(v.quem.titulo, idioma)} id="h-quem" />
            <p className="m-0 max-w-[46ch] text-lg leading-relaxed text-[color:var(--muted)]">{c.provaSecao.lead}</p>
          </div>
          <Founders idioma={idioma} className="mt-0" />
        </div>
      </Section>

      {/* 11 — Final em mosaico */}
      <section aria-labelledby="h-final" className="grid lg:grid-cols-4">
        <div data-surface="deep" className="grid content-between gap-8 bg-[color:var(--surface)] p-6 text-[color:var(--on-surface)] sm:p-10 lg:col-span-2">
          <SplitHeading id="h-final" className={cn(DISPLAY, 'max-w-[14ch] text-[length:clamp(2.5rem,1.3rem+4vw,5.75rem)]', 'leading-[0.92]')}>
            {t(v.final.titulo, idioma)}
          </SplitHeading>
          <div className="grid gap-3">
            <MagneticButton>
              <Button asChild size="lg" className="rounded-none">
                <a href={WHATSAPP} target="_blank" rel="noopener noreferrer">
                  <MessageCircle aria-hidden className="size-5" />
                  {t(v.whatsapp, idioma)} · {SITE.whatsapp.display}
                </a>
              </Button>
            </MagneticButton>
            <p className="m-0 text-base text-[color:var(--muted)]">
              {t(v.final.email, idioma)} <span className="select-all font-semibold text-[color:var(--on-surface)]">{SITE.email}</span>
            </p>
          </div>
        </div>
        <Circulos variante="sol" pontos className="min-h-64 lg:col-span-2" />
      </section>
    </>
  );
}
