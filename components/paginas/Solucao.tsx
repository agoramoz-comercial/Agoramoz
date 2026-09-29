import { Section } from '@/components/ui/Section';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { SplitHeading } from '@/components/motion/SplitHeading';
import { Accordion } from '@/components/ui/Accordion';
import { Card } from '@/components/ui/Card';
import { ProblemGrid } from '@/components/sections/ProblemGrid';
import { OfferSection } from '@/components/sections/OfferSection';
import { CountriesBand } from '@/components/sections/CountriesBand';
import { FinalCta } from '@/components/sections/FinalCta';
import { Reveal } from '@/components/motion/Reveal';
import { FaqJsonLd, ServiceJsonLd } from '@/components/seo/JsonLd';
import { ViewTracker } from '@/components/analytics/ViewTracker';
import { PAGINA_SOLUCAO } from '@/content/i18n/paginas';
import type { Idioma, SolutionPage } from '@/content/types';
import { caminhoNoIdioma, t } from '@/lib/i18n/texto';
import { Check } from 'lucide-react';

/**
 * A página de uma solução nos dois idiomas, com a marcação que estava em
 * `app/(site)/solucoes/[solucao]/page.tsx`. O conteúdo (`s`) já vem no idioma
 * certo; aqui só se traduzem os títulos das secções. O trilho vem da rota
 * (contrato de `lib/seo/rotas.test.ts`).
 */
export function Solucao({ s, idioma, trilho }: { s: SolutionPage; idioma: Idioma; trilho: React.ReactNode }) {
  const path = caminhoNoIdioma(`/solucoes/${s.slug}`, idioma);

  return (
    <>
      <ViewTracker event={{ name: 'service_viewed', solution: s.slug }} />
      <ServiceJsonLd name={s.label} description={s.seo.description} path={path} />
      {/*
        Com o caminho da página. Sem ele, `path` caía no `'/'` por omissão e o
        `@id` da FAQ saía `…/#faq` — o mesmo da FAQ da página inicial. Cinco
        páginas a declarar o mesmo nó com perguntas diferentes.
      */}
      <FaqJsonLd items={s.faq} path={path} />

      <Section surface="deep" contour>
        {trilho}
        <div className="rule flex items-baseline gap-4 pt-6">
          <span className="rule-label text-[color:var(--muted)]">{s.hero.eyebrow}</span>
          <span className="rule-label text-[color:var(--accent)]">{s.label}</span>
        </div>
        <SplitHeading
          as="h1"
          className="mt-10 max-w-[19ch] text-[length:var(--text-display)] leading-[var(--leading-display)] font-bold tracking-[var(--tracking-display)]"
        >
          {s.hero.h1}
        </SplitHeading>
        <p className="mt-10 max-w-[56ch] text-[length:var(--text-lead)] text-[color:var(--muted)]">
          {s.hero.lead}
        </p>
        <p className="mt-10 max-w-[56ch] border-l border-[color:var(--accent)] pl-6 text-[length:var(--text-lead)]">
          {s.result}
        </p>
      </Section>

      <Section surface="light" aria-labelledby="h-prob-sol">
        <SectionHeading
          id="h-prob-sol"
          eyebrow={t(PAGINA_SOLUCAO.problemaEyebrow, idioma)}
          title={t(PAGINA_SOLUCAO.problemaTitulo, idioma)}
        />
        <ProblemGrid items={s.problems} columns={4} />
      </Section>

      <Section surface="tint" aria-labelledby="h-comp-sol">
        <SectionHeading
          id="h-comp-sol"
          eyebrow={t(PAGINA_SOLUCAO.componentesEyebrow, idioma)}
          title={t(PAGINA_SOLUCAO.componentesTitulo, idioma)}
        />
        <Reveal className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {s.components.map((c) => (
            <Card key={c.title} data-animate>
              <h3 className="font-display text-[1.0625rem] font-semibold">{c.title}</h3>
              <p className="mt-2.5 text-sm text-[color:var(--muted)]">{c.body}</p>
            </Card>
          ))}
        </Reveal>
      </Section>

      <Section surface="light" aria-labelledby="h-uso-sol">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <SectionHeading
              id="h-uso-sol"
              eyebrow={t(PAGINA_SOLUCAO.usosEyebrow, idioma)}
              title={t(PAGINA_SOLUCAO.usosTitulo, idioma)}
              max="none"
            />
            <Reveal className="mt-8 space-y-3.5">
              {s.useCases.map((u) => (
                <p key={u} data-animate className="flex items-start gap-3 text-[color:var(--muted)]">
                  <Check aria-hidden className="mt-1 size-4 shrink-0 text-[color:var(--ok)]" />
                  {u}
                </p>
              ))}
            </Reveal>
          </div>
          <div>
            <h2 className="font-display text-[length:var(--text-h3)]">{t(PAGINA_SOLUCAO.integracoes, idioma)}</h2>
            <ul className="mt-6 flex flex-wrap gap-2">
              {s.integrations.map((i) => (
                <li key={i} className="rounded-full border border-[color:var(--border)] px-4 py-1.5 text-sm text-[color:var(--muted)]">
                  {i}
                </li>
              ))}
            </ul>
            <h2 className="mt-12 font-display text-[length:var(--text-h3)]">{t(PAGINA_SOLUCAO.seguranca, idioma)}</h2>
            <ul className="mt-6 space-y-3">
              {s.security.map((sec) => (
                <li key={sec} className="border-l-2 border-[color:var(--border)] pl-5 text-sm text-[color:var(--muted)]">
                  {sec}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      <Section surface="dark" aria-labelledby="h-proc-sol">
        <SectionHeading
          id="h-proc-sol"
          eyebrow={t(PAGINA_SOLUCAO.processoEyebrow, idioma)}
          title={t(PAGINA_SOLUCAO.processoTitulo, idioma)}
        />
        <Reveal className="mt-12 grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
          {s.process.map((p, i) => (
            <div key={p.title} data-animate className="border-t border-[color:var(--border)] pt-5">
              <span className="font-techno font-medium text-[length:var(--text-micro)] text-[color:var(--accent)]">
                {String(i + 1).padStart(2, '0')}
              </span>
              <h3 className="mt-2 font-display text-[length:var(--text-h3)]">{p.title}</h3>
              <p className="mt-2.5 text-sm text-[color:var(--muted)]">{p.body}</p>
            </div>
          ))}
        </Reveal>
      </Section>

      <Section surface="light" aria-labelledby="h-paises-sol">
        <SectionHeading
          id="h-paises-sol"
          eyebrow={t(PAGINA_SOLUCAO.mercadosEyebrow, idioma)}
          title={t(PAGINA_SOLUCAO.mercadosTitulo, idioma)}
        />
        {/* A entrada global só em inglês: é o único sítio onde o inglês é o idioma natural. */}
        <CountriesBand idioma={idioma} comGlobal={idioma === 'en'} />
      </Section>

      <Section surface="deep">
        <OfferSection idioma={idioma} />
      </Section>

      <Section surface="light" aria-labelledby="h-faq-sol">
        {/* Sem toLowerCase(): destruía o acrónimo em "Agentes de IA". */}
        <SectionHeading
          id="h-faq-sol"
          eyebrow={t(PAGINA_SOLUCAO.faqEyebrow, idioma)}
          title={t(PAGINA_SOLUCAO.faqTitulo, idioma).replace('{nome}', s.label)}
        />
        <div className="mt-10 max-w-[52rem]">
          <Accordion items={s.faq} />
        </div>
      </Section>

      <Section surface="deep" contour>
        <FinalCta idioma={idioma} />
      </Section>
    </>
  );
}
