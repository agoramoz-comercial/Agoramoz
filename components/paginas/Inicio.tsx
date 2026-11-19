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
import { getSectorsForCountry, getSolutionSummaries } from '@/content/registry';
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
 * Página inicial do website v2 (D-50): estrutura «Conversa», identidade «Editorial».
 *
 * Nove secções, por esta ordem: topo com a pergunta e a escolha de setor; como
 * funciona; problemas (efeito 05); diagnóstico (efeitos 06, 02 e 08); o sistema
 * (efeito 03); soluções; curso; quem somos; chamada final. Os títulos de secção
 * revelam-se por linhas (efeito 01); o título do topo não, para não atrasar o LCP.
 *
 * Tudo o que se lê está no HTML servido: sem JavaScript ou com movimento
 * reduzido, a página está completa. Os números contam-se a partir dos dados.
 */

const WHATSAPP = `https://wa.me/${SITE.whatsapp.e164}`;

/** Rótulo de secção com o número e o título revelado por linhas. */
function Titulo({
  numero,
  eyebrow,
  titulo,
  id,
  className,
}: {
  numero: string;
  eyebrow: string;
  titulo: string;
  id: string;
  className?: string;
}) {
  return (
    <div className={cn('grid gap-4', className)}>
      <p className="m-0 text-sm font-semibold uppercase tracking-[0.14em] text-[color:var(--accent)]">
        <span className="tabular-nums">{numero}</span> · {eyebrow}
      </p>
      <SplitHeading
        id={id}
        className="max-w-[26ch] text-[length:clamp(2.125rem,1.4rem+2.8vw,3.75rem)] font-normal leading-[1] tracking-[-0.035em]"
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
  const cartoes = [
    { surface: 'azul', },
    { surface: 'tint' },
    { surface: 'deep' },
    { surface: 'light' },
  ] as const;

  return (
    <>
      {/* 1 — Topo: a pergunta, os dois caminhos e a escolha de setor */}
      <Section surface="light" spacing="tight" aria-label={t(INICIO.aria.apresentacao, idioma)}>
        <div className="grid items-center gap-x-14 gap-y-12 pt-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:pt-10">
          <div className="grid gap-6">
            <p className="m-0 justify-self-start rounded-full bg-[color:var(--v2-lavanda)] px-3.5 py-1.5 text-sm font-semibold text-[color:var(--v2-tinta)]">
              {t(v.selo, idioma)}
            </p>
            <h1 className="m-0 text-[length:clamp(2.5rem,1.5rem+4vw,4.75rem)] font-normal leading-[0.98] tracking-[-0.04em]">
              {t(v.titulo, idioma)}
            </h1>
            <p className="m-0 max-w-[34rem] text-lg leading-relaxed text-[color:var(--muted)]">
              <strong className="font-semibold text-[color:var(--on-surface)]">{t(v.marca, idioma)}</strong>{' '}
              {t(v.lead, idioma)}
            </p>
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
            <p className="m-0 text-sm text-[color:var(--muted)]">
              {SITE.whatsapp.display} · {SITE.email}
            </p>
          </div>

          <nav
            aria-labelledby="h-setor"
            data-surface="light"
            className="grid gap-3 rounded-[1.75rem] border border-[color:var(--border)] bg-white p-5 sm:p-7"
          >
            <h2 id="h-setor" className="m-0 text-2xl font-semibold tracking-[-0.02em]">
              {t(v.setor, idioma)}
            </h2>
            <ul className="m-0 grid list-none gap-2.5 p-0">
              {setores.map((s) => {
                const l = ligacao(s.href, idioma);
                return (
                  <li key={s.sector}>
                    <Link
                      href={l.href}
                      hrefLang={l.soPortugues ? 'pt' : undefined}
                      className="flex min-h-14 items-center justify-between gap-3 rounded-2xl bg-[color:var(--v2-papel)] px-5 py-3 text-[1.0625rem] font-semibold transition-colors hover:bg-[color:var(--v2-lavanda)]"
                    >
                      <span>
                        {t(ROTULO_SETOR[s.sector], idioma)}
                        <SoPortugues idioma={idioma} />
                      </span>
                      <ArrowRight aria-hidden className="size-5 shrink-0 text-[color:var(--accent)]" />
                    </Link>
                  </li>
                );
              })}
            </ul>
            <p className="m-0 text-sm text-[color:var(--muted)]">
              {t(v.setorNota, idioma)}{' '}
              <Link href={setoresPagina.href} hrefLang={setoresPagina.soPortugues ? 'pt' : undefined} className="font-semibold text-[color:var(--accent)] underline-offset-4 hover:underline">
                {t(v.todosSetores, idioma)}
              </Link>
            </p>
          </nav>
        </div>
      </Section>

      {/* 2 — Como funciona */}
      <Section surface="deep" spacing="tight" aria-labelledby="h-passos">
        <Titulo numero="01" eyebrow={t(v.passos.eyebrow, idioma)} titulo={t(v.passos.titulo, idioma)} id="h-passos" />
        <ol className="m-0 mt-12 grid list-none gap-4 p-0 md:grid-cols-3">
          {v.passos.itens.map((p, i) => (
            <li key={p.titulo.pt} className="grid content-start gap-3 rounded-3xl bg-[color:var(--surface-raised)] p-6">
              <span
                aria-hidden
                className="grid size-12 place-items-center rounded-full bg-[color:var(--v2-lavanda)] text-xl font-bold text-[color:var(--v2-tinta)]"
              >
                {i + 1}
              </span>
              <h3 className="m-0 mt-2 text-[1.375rem] font-semibold tracking-[-0.02em]">{t(p.titulo, idioma)}</h3>
              <p className="m-0 text-base leading-relaxed text-[color:var(--muted)]">{t(p.texto, idioma)}</p>
            </li>
          ))}
        </ol>
      </Section>

      {/* 3 — Problemas: cartões empilhados (efeito 05) */}
      <Section surface="light" spacing="tight" id="problemas" aria-labelledby="h-problemas">
        <Titulo
          numero="02"
          eyebrow={t(INICIO.problemas.eyebrow, idioma)}
          titulo={t(INICIO.problemas.titulo, idioma)}
          id="h-problemas"
        />
        <CardStack className="mt-12">
          {c.problemas.map((p, i) => (
            <article
              key={p.title}
              data-cartao
              data-surface={cartoes[i % cartoes.length].surface}
              className="sticky top-24 mb-4 grid min-h-40 content-between gap-4 rounded-[1.75rem] border border-[color:var(--border)] bg-[color:var(--surface)] p-7 text-[color:var(--on-surface)] shadow-[0_-8px_28px_rgba(12,12,16,0.08)] sm:p-9"
            >
              <span className="text-sm font-semibold tabular-nums text-[color:var(--muted)]">
                [{String(i + 1).padStart(2, '0')}]
              </span>
              <div className="grid gap-3">
                <h3 className="m-0 text-[length:clamp(1.625rem,1.2rem+1.6vw,2.5rem)] font-medium leading-[1.05] tracking-[-0.03em]">
                  {p.title}
                </h3>
                <p className="m-0 max-w-[46ch] text-base leading-relaxed text-[color:var(--muted)] sm:text-lg">{p.body}</p>
              </div>
            </article>
          ))}
        </CardStack>
      </Section>

      {/* 4 — Diagnóstico: o arco abre-se (06), os números contam (02), o botão atrai (08) */}
      <section id="diagnostico" aria-labelledby="h-diagnostico">
        <ArchReveal>
          <div className="grid justify-items-center gap-6 text-center">
            <p className="m-0 text-sm font-semibold uppercase tracking-[0.14em] text-[color:var(--muted)]">
              03 · {t(DIAGNOSTICO.eyebrow, idioma)}
            </p>
            <SplitHeading
              id="h-diagnostico"
              className="max-w-[18ch] text-[length:clamp(2.125rem,1.4rem+3vw,4rem)] font-normal leading-[1] tracking-[-0.035em]"
            >
              {t(DIAGNOSTICO.titulo, idioma)}
            </SplitHeading>
            <p className="m-0 max-w-[44ch] text-lg leading-relaxed text-[color:var(--muted)]">
              <strong className="font-semibold text-[color:var(--on-surface)]">{t(DIAGNOSTICO.nome, idioma)}.</strong>{' '}
              {t(DIAGNOSTICO.promessa, idioma)}
            </p>
            <dl className="m-0 mt-2 grid w-full grid-cols-1 gap-6 border-t border-[color:var(--hairline)] pt-6 sm:grid-cols-3">
              {[
                { n: DIAGNOSTICO.entregas.length, r: v.numeros.entregaveis },
                { n: c.processo.steps.length, r: v.numeros.fases },
                { n: solucoes.length, r: v.numeros.capacidades },
              ].map((x) => (
                <div key={x.r.pt} className="grid gap-1.5">
                  <dt className="order-2 text-sm text-[color:var(--muted)]">{t(x.r, idioma)}</dt>
                  <dd className="order-1 m-0 text-[length:clamp(3rem,2rem+3vw,4.75rem)] font-bold leading-none tracking-[-0.05em]">
                    <CountUp valor={x.n} />
                  </dd>
                </div>
              ))}
            </dl>
            <div className="mt-2 flex flex-wrap justify-center gap-3">
              <MagneticButton>
                <Button asChild size="lg" variant="claro" className="rounded-full">
                  <Link href={diagnostico.href} hrefLang={diagnostico.soPortugues ? 'pt' : undefined}>
                    {t(v.pedirDiagnostico, idioma)}
                    <ArrowRight aria-hidden className="size-5" />
                  </Link>
                </Button>
              </MagneticButton>
            </div>
          </div>
        </ArchReveal>

        <Section surface="light" spacing="tight" as="div" aria-labelledby="h-recebe">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
            <div className="grid content-start gap-6">
              <h3 id="h-recebe" className="m-0 text-[length:clamp(1.75rem,1.3rem+1.6vw,2.75rem)] font-normal tracking-[-0.03em]">
                {t(v.recebe, idioma)}
              </h3>
              <p className="m-0 rounded-3xl bg-[color:var(--v2-tinta)] p-7 text-lg leading-snug text-white">{t(v.regra, idioma)}</p>
            </div>
            <ol className="m-0 grid list-none grid-cols-1 gap-x-8 p-0 sm:grid-cols-2">
              {DIAGNOSTICO.entregas.map((e, i) => (
                <li key={e.pt} className="flex gap-4 border-t border-[color:var(--border)] py-3 text-base">
                  <span className="min-w-7 font-bold tabular-nums text-[color:var(--accent)]">{String(i + 1).padStart(2, '0')}</span>
                  {t(e, idioma)}
                </li>
              ))}
            </ol>
          </div>
        </Section>
      </section>

      {/* 5 — O sistema: a linha desenha-se com o scroll (efeito 03) */}
      <Section surface="tint" spacing="tight" aria-labelledby="h-sistema">
        <Titulo numero="04" eyebrow={c.fluxo.eyebrow} titulo={c.fluxo.title} id="h-sistema" />
        <p className="m-0 mt-6 max-w-[60ch] text-lg leading-relaxed text-[color:var(--muted)]">{c.fluxo.lead}</p>
        <ScrubLine passos={passosDoSistema} className="mt-12" />
      </Section>

      {/* 6 — Soluções */}
      <Section surface="light" spacing="tight" aria-labelledby="h-solucoes">
        <Titulo
          numero="05"
          eyebrow={t(INICIO.solucoes.eyebrow, idioma)}
          titulo={t(INICIO.solucoes.titulo, idioma)}
          id="h-solucoes"
        />
        <ul className="m-0 mt-10 grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-2 lg:grid-cols-4">
          {solucoes.map((s) => {
            const l = ligacao(s.href, idioma);
            return (
              <li key={s.slug}>
                <Link
                  href={l.href}
                  hrefLang={l.soPortugues ? 'pt' : undefined}
                  className="group grid h-full content-between gap-6 rounded-3xl border border-[color:var(--border)] bg-white p-6 transition-colors hover:border-[color:var(--accent)]"
                >
                  <span className="grid gap-2">
                    <span className="text-xl font-semibold tracking-[-0.02em]">
                      {t(RESUMO_SOLUCAO[s.slug].label, idioma)}
                      <SoPortugues idioma={idioma} />
                    </span>
                    <span className="text-sm leading-relaxed text-[color:var(--muted)]">{t(RESUMO_SOLUCAO[s.slug].short, idioma)}</span>
                  </span>
                  <ArrowUpRight aria-hidden className="size-5 text-[color:var(--accent)]" />
                </Link>
              </li>
            );
          })}
          <li>
            <Link
              href={indiceSolucoes.href}
              hrefLang={indiceSolucoes.soPortugues ? 'pt' : undefined}
              data-surface="azul"
              className="grid h-full content-between gap-6 rounded-3xl bg-[color:var(--surface)] p-6 text-[color:var(--on-surface)]"
            >
              <span className="text-xl font-semibold tracking-[-0.02em]">{t(v.verSolucoes, idioma)}</span>
              <ArrowRight aria-hidden className="size-5" />
            </Link>
          </li>
        </ul>
      </Section>

      {/* 7 — Curso publicado */}
      {curso && cursoHref && cursoDoc ? (
        <Section surface="light" spacing="none" aria-labelledby="h-curso" className="pb-[var(--space-section-tight)]">
          <div
            data-surface="tint"
            className="grid items-center gap-8 rounded-[2rem] bg-[color:var(--surface)] p-8 text-[color:var(--on-surface)] sm:p-12 lg:grid-cols-[minmax(0,1.4fr)_auto]"
          >
            <div className="grid gap-3">
              <p className="m-0 text-sm font-semibold uppercase tracking-[0.14em] text-[color:var(--accent)]">
                {t(v.curso.eyebrow, idioma)}
              </p>
              <h2 id="h-curso" className="m-0 text-[length:clamp(1.875rem,1.3rem+2vw,3rem)] font-normal leading-[1.02] tracking-[-0.03em]">
                {curso.titulo}
              </h2>
              <p className="m-0 text-lg text-[color:var(--muted)]">{t(v.curso.texto, idioma)}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg" className="rounded-full">
                <Link href={cursoHref.href} hrefLang={cursoHref.soPortugues ? 'pt' : undefined}>
                  {t(v.curso.ver, idioma)}
                  <SoPortugues idioma={idioma} herdar />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="rounded-full">
                <Link href={cursoDoc.href} hrefLang={cursoDoc.soPortugues ? 'pt' : undefined}>
                  {t(v.curso.documento, idioma)}
                </Link>
              </Button>
            </div>
          </div>
        </Section>
      ) : null}

      {/* 8 — Quem somos */}
      <Section surface="light" spacing="tight" aria-labelledby="h-quem" className="border-t border-[color:var(--border)]">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.3fr)] lg:items-start">
          <div className="grid gap-6">
            <Titulo numero="06" eyebrow={t(v.quem.eyebrow, idioma)} titulo={t(v.quem.titulo, idioma)} id="h-quem" />
            <p className="m-0 max-w-[46ch] text-lg leading-relaxed text-[color:var(--muted)]">{c.provaSecao.lead}</p>
          </div>
          <Founders idioma={idioma} className="mt-0" />
        </div>
      </Section>

      {/* 9 — Chamada final */}
      <Section surface="azul" spacing="tight" aria-labelledby="h-final">
        <div className="grid justify-items-start gap-7">
          <SplitHeading
            id="h-final"
            className="max-w-[16ch] text-[length:clamp(2.25rem,1.4rem+3.6vw,4.5rem)] font-normal leading-[0.98] tracking-[-0.04em]"
          >
            {t(v.final.titulo, idioma)}
          </SplitHeading>
          <MagneticButton>
            <Button asChild size="lg" variant="claro" className="rounded-full">
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
      </Section>
    </>
  );
}
