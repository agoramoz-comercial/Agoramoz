import type { Metadata } from 'next';
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
import {
  FOUNDERS,
  HOME_FAQ,
  HOME_PROBLEMS,
  PROCESS,
  PROOF,
  PROOF_SECTION,
  RISK_REDUCTION,
  SITE,
} from '@/content/site';
import { buildMetadata } from '@/lib/seo/site';

export const metadata: Metadata = buildMetadata({
  title: `AGORAMOZ — ${SITE.tagline}`,
  description: SITE.description,
  path: '/',
  languages: { 'pt-MZ': '/mz', 'pt-PT': '/pt', 'pt-BR': '/br', 'x-default': '/' },
  tituloAbsoluto: true,
});

export default function HomePage() {
  const capabilities = getSolutionSummaries().map((s) => s.label);

  return (
    <>
      <FaqJsonLd items={HOME_FAQ} />

      {/* 2 + 3 — Hero e seletor de país/setor */}
      <Section surface="deep" spacing="tight" index="Início" aria-label="Apresentação">
        <div className="pt-8 pb-4 lg:pt-16">
          <Hero />
        </div>
      </Section>

      <Section surface="deep" spacing="tight" aria-label="Encontre o seu caminho">
        <div className="grid lg:grid-cols-12">
          <div className="lg:col-span-7 lg:col-start-6">
            <SegmentSelector />
          </div>
        </div>
      </Section>

      {/* 4 — Problemas */}
      <Section surface="light" id="problemas" index="Problema" aria-labelledby="h-problemas">
        <SectionHeading
          id="h-problemas"
          number="02"
          eyebrow="O problema"
          title="O problema raramente é falta de ferramentas. É falta de ligação entre pessoas, processos e tecnologia."
          max="wide"
        />
        <ProblemGrid items={HOME_PROBLEMS} />
      </Section>

      {/* 5 — Sistema de crescimento e operação (a secção com pin) */}
      <Section
        surface="deep"
        spacing="none"
        index="Sistema"
        bleed
        className="py-[var(--space-section)] lg:py-0"
        aria-label="O sistema de crescimento e operação"
      >
        <FlowDiagram />
      </Section>

      {/* 6 — Soluções */}
      <Section surface="light" id="solucoes" index="Soluções" contour aria-labelledby="h-solucoes">
        <SectionHeading
          id="h-solucoes"
          number="03"
          eyebrow="Soluções"
          title="Cinco capacidades, um sistema."
          lead="Cada uma resolve um bloqueio diferente. O diagnóstico determina por qual começar — nem todas são igualmente importantes para a sua empresa."
        />
        <SolutionsGrid />
      </Section>

      {/* 7 — Países */}
      <Section surface="dark" id="mercados" index="Mercados" contour aria-labelledby="h-mercados">
        <SectionHeading
          id="h-mercados"
          number="04"
          eyebrow="Mercados"
          title="Estratégia global. Execução adaptada a cada mercado."
          lead="O mesmo método, com linguagem, prioridades e requisitos legais próprios de cada país. Não traduzimos a mesma página três vezes."
        />
        <CountriesBand />
      </Section>

      {/* Faixa de capacidades — as mesmas cinco, em movimento contínuo */}
      <Section surface="deep" spacing="none" bleed aria-hidden>
        <div className="rule border-b border-[color:var(--hairline)] py-6">
          <Marquee items={capabilities} />
        </div>
      </Section>

      {/* 8 — Setores */}
      <Section surface="deep" id="setores" index="Setores" aria-labelledby="h-setores">
        <SectionHeading
          id="h-setores"
          number="05"
          eyebrow="Setores"
          title="Comece pelo problema que reconhece."
          lead="Cada setor tem um custo de ineficiência diferente. Escolha o seu país e veja o que encontramos com mais frequência."
        />
        <SectorExplorer />
      </Section>

      {/* 9 — Processo */}
      <Section surface="light" id="processo" index="Processo" aria-labelledby="h-processo">
        <SectionHeading
          id="h-processo"
          number="06"
          eyebrow={PROCESS.eyebrow}
          title={PROCESS.title}
          lead={PROCESS.lead}
        />
        <ProcessTimeline />
      </Section>

      {/* 10 — Oferta de entrada */}
      <Section surface="deep" id="diagnostico" index="Diagnóstico" contour aria-label="Oferta de diagnóstico">
        <OfferSection />
      </Section>

      {/* 11 + 12 — Demonstrações e prova */}
      <Section surface="light" id="prova" index="Prova" aria-labelledby="h-prova">
        <SectionHeading
          id="h-prova"
          number="07"
          eyebrow={PROOF_SECTION.eyebrow}
          title={PROOF_SECTION.title}
          lead={PROOF_SECTION.lead}
          max="wide"
        />
        <ProofSection items={PROOF} />
      </Section>

      {/* 13 — Redução de risco */}
      <Section surface="tint" index="Risco" aria-labelledby="h-risco">
        <SectionHeading
          id="h-risco"
          number="08"
          eyebrow={RISK_REDUCTION.eyebrow}
          title={RISK_REDUCTION.title}
          lead={RISK_REDUCTION.body}
          max="wide"
        />
        <Reveal className="mt-16 grid gap-x-16 md:grid-cols-2">
          {RISK_REDUCTION.points.map((p, i) => (
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
      <Section surface="dark" index="Equipa" aria-labelledby="h-fundadores">
        <SectionHeading
          id="h-fundadores"
          number="09"
          eyebrow={FOUNDERS.eyebrow}
          title={FOUNDERS.title}
        />
        <Founders />
      </Section>

      {/* 15 — FAQ */}
      <Section surface="light" id="faq" index="Perguntas" aria-labelledby="h-faq">
        <SectionHeading
          id="h-faq"
          number="10"
          eyebrow="Perguntas frequentes"
          title="O que nos perguntam antes de avançar."
        />
        <div className="mt-16 grid lg:grid-cols-12">
          <div className="lg:col-span-9 lg:col-start-4">
            <Accordion items={HOME_FAQ} />
          </div>
        </div>
      </Section>

      {/* 16 — CTA final */}
      <Section surface="deep" index="Contacto" contour aria-label="Solicitar diagnóstico">
        <FinalCta />
      </Section>
    </>
  );
}
