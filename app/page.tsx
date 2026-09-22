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
import { Reveal } from '@/components/motion/Reveal';
import { FaqJsonLd } from '@/components/seo/JsonLd';
import { FOUNDERS, HOME_FAQ, HOME_PROBLEMS, PROCESS, PROOF, PROOF_SECTION, RISK_REDUCTION, SITE } from '@/content/site';
import { buildMetadata } from '@/lib/seo/site';

export const metadata: Metadata = buildMetadata({
  title: `AGORAMOZ — ${SITE.tagline}`,
  description: SITE.description,
  path: '/',
  languages: { 'pt-MZ': '/mz', 'pt-PT': '/pt', 'pt-BR': '/br', 'x-default': '/' },
});

export default function HomePage() {
  return (
    <>
      <FaqJsonLd items={HOME_FAQ} />

      {/* 2 + 3 — Hero e seletor de país/setor */}
      <Section surface="deep" spacing="tight" aria-label="Apresentação" className="lg:min-h-[calc(100svh-7.5rem)] lg:flex lg:items-center">
        <div className="grid items-start gap-14 lg:grid-cols-[1.15fr_0.85fr] lg:gap-16">
          <Hero />
          <SegmentSelector />
        </div>
      </Section>

      {/* 4 — Problemas */}
      <Section surface="light" id="problemas" aria-labelledby="h-problemas">
        <SectionHeading
          id="h-problemas"
          eyebrow="O problema"
          title="O problema raramente é falta de ferramentas. É falta de ligação entre pessoas, processos e tecnologia."
          max="wide"
        />
        <ProblemGrid items={HOME_PROBLEMS} />
      </Section>

      {/* 5 — Sistema de crescimento e operação (a secção com pin) */}
      <Section surface="deep" bleed aria-label="O sistema de crescimento e operação">
        <FlowDiagram />
      </Section>

      {/* 6 — Soluções */}
      <Section surface="light" id="solucoes" aria-labelledby="h-solucoes">
        <SectionHeading
          id="h-solucoes"
          eyebrow="Soluções"
          title="Cinco capacidades, um sistema."
          lead="Cada uma resolve um bloqueio diferente. O diagnóstico determina por qual começar — nem todas são igualmente importantes para a sua empresa."
        />
        <SolutionsGrid />
      </Section>

      {/* 7 — Países */}
      <Section surface="dark" id="mercados" aria-labelledby="h-mercados">
        <SectionHeading
          id="h-mercados"
          eyebrow="Mercados"
          title="Estratégia global. Execução adaptada a cada mercado."
          lead="O mesmo método, com linguagem, prioridades e requisitos legais próprios de cada país. Não traduzimos a mesma página três vezes."
        />
        <CountriesBand />
      </Section>

      {/* 8 — Setores */}
      <Section surface="tint" id="setores" aria-labelledby="h-setores">
        <SectionHeading
          id="h-setores"
          eyebrow="Setores"
          title="Comece pelo problema que reconhece."
          lead="Cada setor tem um custo de ineficiência diferente. Escolha o seu país e veja o que encontramos com mais frequência."
        />
        <SectorExplorer />
      </Section>

      {/* 9 — Processo */}
      <Section surface="light" id="processo" aria-labelledby="h-processo">
        <SectionHeading id="h-processo" eyebrow={PROCESS.eyebrow} title={PROCESS.title} lead={PROCESS.lead} />
        <ProcessTimeline />
      </Section>

      {/* 10 — Oferta de entrada */}
      <Section surface="deep" id="diagnostico" aria-label="Oferta de diagnóstico">
        <OfferSection />
      </Section>

      {/* 11 + 12 — Demonstrações e prova */}
      <Section surface="light" id="prova" aria-labelledby="h-prova">
        <SectionHeading
          id="h-prova"
          eyebrow={PROOF_SECTION.eyebrow}
          title={PROOF_SECTION.title}
          lead={PROOF_SECTION.lead}
          max="wide"
        />
        <ProofSection items={PROOF} />
      </Section>

      {/* 13 — Redução de risco */}
      <Section surface="tint" aria-labelledby="h-risco">
        <div className="grid gap-10 lg:grid-cols-[1fr_1fr] lg:gap-16">
          <SectionHeading
            id="h-risco"
            eyebrow={RISK_REDUCTION.eyebrow}
            title={RISK_REDUCTION.title}
            lead={RISK_REDUCTION.body}
          />
          <Reveal className="space-y-4 lg:pt-4">
            {RISK_REDUCTION.points.map((p) => (
              <p
                key={p}
                data-animate
                className="border-l-2 border-[color:var(--accent)] pl-5 text-[color:var(--muted)]"
              >
                {p}
              </p>
            ))}
          </Reveal>
        </div>
      </Section>

      {/* 14 — Fundadores */}
      <Section surface="dark" aria-labelledby="h-fundadores">
        <SectionHeading id="h-fundadores" eyebrow={FOUNDERS.eyebrow} title={FOUNDERS.title} />
        <Founders />
      </Section>

      {/* 15 — FAQ */}
      <Section surface="light" id="faq" aria-labelledby="h-faq">
        <SectionHeading id="h-faq" eyebrow="Perguntas frequentes" title="O que nos perguntam antes de avançar." />
        <div className="mt-10 max-w-[52rem]">
          <Accordion items={HOME_FAQ} />
        </div>
      </Section>

      {/* 16 — CTA final */}
      <Section surface="deep" aria-label="Solicitar diagnóstico">
        <FinalCta />
      </Section>
    </>
  );
}
