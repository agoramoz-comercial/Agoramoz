import { Section } from '@/components/ui/Section';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { Accordion } from '@/components/ui/Accordion';
import { Hero } from '@/components/home/Hero';
import { SegmentSelector } from '@/components/home/SegmentSelector';
import { FlowDiagram } from '@/components/home/FlowDiagram';
import { ProblemGrid } from '@/components/sections/ProblemGrid';
import { SolutionsGrid } from '@/components/sections/SolutionsGrid';
import { CountriesBand } from '@/components/sections/CountriesBand';
import { SectorExplorer } from '@/components/sections/SectorExplorer';
import { ProcessTimeline } from '@/components/sections/ProcessTimeline';
import { OfferSection } from '@/components/sections/OfferSection';
import { ProofSection } from '@/components/sections/ProofSection';
import { Founders } from '@/components/sections/Founders';
import { FinalCta } from '@/components/sections/FinalCta';
import { Marquee } from '@/components/motion/Marquee';
import { Reveal } from '@/components/motion/Reveal';
import { FaqJsonLd } from '@/components/seo/JsonLd';
import { getSolutionSummaries } from '@/content/registry';
import { RESUMO_SOLUCAO } from '@/content/i18n/chrome';
import { INICIO, conteudoDoInicio } from '@/content/i18n/inicio';
import type { Idioma } from '@/content/types';
import { caminhoNoIdioma, t } from '@/lib/i18n/texto';

/**
 * A página inicial nos dois idiomas, com a marcação que estava em
 * `app/(site)/page.tsx`. As quatro entradas de mercado — PT-PT, PT-MZ, PT-BR
 * e EN num contexto global — aparecem nas duas: no seletor do topo, na faixa
 * de mercados e no filtro de setores.
 */
export function Inicio({ idioma }: { idioma: Idioma }) {
  const c = conteudoDoInicio(idioma);
  const capabilities = getSolutionSummaries().map((s) => t(RESUMO_SOLUCAO[s.slug].label, idioma));
  const { indice, aria } = INICIO;

  return (
    <>
      <FaqJsonLd items={c.faq} path={caminhoNoIdioma('/', idioma)} />

      {/* 2 + 3 — Hero e seletor de país/setor */}
      <Section surface="deep" spacing="tight" index={t(indice.inicio, idioma)} aria-label={t(aria.apresentacao, idioma)}>
        <div className="pt-8 pb-4 lg:pt-16">
          <Hero idioma={idioma} />
        </div>
      </Section>

      <Section surface="deep" spacing="tight" aria-label={t(aria.caminho, idioma)}>
        <div className="grid lg:grid-cols-12">
          <div className="lg:col-span-7 lg:col-start-6">
            <SegmentSelector idioma={idioma} />
          </div>
        </div>
      </Section>

      {/* 4 — Problemas */}
      <Section surface="light" id="problemas" index={t(indice.problema, idioma)} aria-labelledby="h-problemas">
        <SectionHeading
          id="h-problemas"
          number="02"
          eyebrow={t(INICIO.problemas.eyebrow, idioma)}
          title={t(INICIO.problemas.titulo, idioma)}
          max="wide"
        />
        <ProblemGrid items={c.problemas} />
      </Section>

      {/* 5 — Sistema de crescimento e operação (a secção com pin) */}
      <Section
        surface="deep"
        spacing="none"
        index={t(indice.sistema, idioma)}
        bleed
        className="py-[var(--space-section)] lg:py-0"
        aria-label={t(aria.sistema, idioma)}
      >
        <FlowDiagram idioma={idioma} />
      </Section>

      {/* 6 — Soluções */}
      <Section surface="light" id="solucoes" index={t(indice.solucoes, idioma)} contour aria-labelledby="h-solucoes">
        <SectionHeading
          id="h-solucoes"
          number="03"
          eyebrow={t(INICIO.solucoes.eyebrow, idioma)}
          title={t(INICIO.solucoes.titulo, idioma)}
          lead={t(INICIO.solucoes.lead, idioma)}
        />
        <SolutionsGrid idioma={idioma} />
      </Section>

      {/* 7 — Países, com a entrada global */}
      <Section surface="dark" id="mercados" index={t(indice.mercados, idioma)} contour aria-labelledby="h-mercados">
        <SectionHeading
          id="h-mercados"
          number="04"
          eyebrow={t(INICIO.mercados.eyebrow, idioma)}
          title={t(INICIO.mercados.titulo, idioma)}
          lead={t(INICIO.mercados.lead, idioma)}
        />
        <CountriesBand idioma={idioma} comGlobal />
      </Section>

      {/* Faixa de capacidades — as mesmas cinco, em movimento contínuo */}
      <Section surface="deep" spacing="none" bleed aria-hidden>
        <div className="rule border-b border-[color:var(--hairline)] py-6">
          <Marquee items={capabilities} />
        </div>
      </Section>

      {/* 8 — Setores, com o filtro global */}
      <Section surface="deep" id="setores" index={t(indice.setores, idioma)} aria-labelledby="h-setores">
        <SectionHeading
          id="h-setores"
          number="05"
          eyebrow={t(INICIO.setores.eyebrow, idioma)}
          title={t(INICIO.setores.titulo, idioma)}
          lead={t(INICIO.setores.lead, idioma)}
        />
        <SectorExplorer idioma={idioma} comGlobal />
      </Section>

      {/* 9 — Processo */}
      <Section surface="light" id="processo" index={t(indice.processo, idioma)} aria-labelledby="h-processo">
        <SectionHeading
          id="h-processo"
          number="06"
          eyebrow={c.processo.eyebrow}
          title={c.processo.title}
          lead={c.processo.lead}
        />
        <ProcessTimeline idioma={idioma} />
      </Section>

      {/* 10 — Oferta de entrada */}
      <Section surface="deep" id="diagnostico" index={t(indice.diagnostico, idioma)} contour aria-label={t(aria.oferta, idioma)}>
        <OfferSection idioma={idioma} />
      </Section>

      {/* 11 + 12 — Demonstrações e prova */}
      <Section surface="light" id="prova" index={t(indice.prova, idioma)} aria-labelledby="h-prova">
        <SectionHeading
          id="h-prova"
          number="07"
          eyebrow={c.provaSecao.eyebrow}
          title={c.provaSecao.title}
          lead={c.provaSecao.lead}
          max="wide"
        />
        <ProofSection items={c.prova} idioma={idioma} />
      </Section>

      {/* 13 — Redução de risco */}
      <Section surface="tint" index={t(indice.risco, idioma)} aria-labelledby="h-risco">
        <SectionHeading
          id="h-risco"
          number="08"
          eyebrow={c.risco.eyebrow}
          title={c.risco.title}
          lead={c.risco.body}
          max="wide"
        />
        <Reveal className="mt-16 grid gap-x-16 md:grid-cols-2">
          {c.risco.points.map((p, i) => (
            <p
              key={p}
              data-animate
              className="flex items-baseline gap-6 border-t border-dashed border-[color:var(--hairline)] py-6 text-[color:var(--muted)]"
            >
              <span className="rule-label shrink-0 text-[color:var(--accent)]">
                {String(i + 1).padStart(2, '0')}
              </span>
              {p}
            </p>
          ))}
        </Reveal>
      </Section>

      {/* 14 — Fundadores */}
      <Section surface="dark" index={t(indice.equipa, idioma)} aria-labelledby="h-fundadores">
        <SectionHeading
          id="h-fundadores"
          number="09"
          eyebrow={c.fundadores.eyebrow}
          title={c.fundadores.title}
        />
        <Founders idioma={idioma} />
      </Section>

      {/* 15 — FAQ */}
      <Section surface="light" id="faq" index={t(indice.perguntas, idioma)} aria-labelledby="h-faq">
        <SectionHeading
          id="h-faq"
          number="10"
          eyebrow={t(INICIO.faq.eyebrow, idioma)}
          title={t(INICIO.faq.titulo, idioma)}
        />
        <div className="mt-16 grid lg:grid-cols-12">
          <div className="lg:col-span-9 lg:col-start-4">
            <Accordion items={c.faq} />
          </div>
        </div>
      </Section>

      {/* 16 — CTA final */}
      <Section surface="deep" index={t(indice.contacto, idioma)} contour aria-label={t(aria.contacto, idioma)}>
        <FinalCta idioma={idioma} />
      </Section>
    </>
  );
}
