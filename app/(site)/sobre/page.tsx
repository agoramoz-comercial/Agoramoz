import type { Metadata } from 'next';
import { Breadcrumbs } from '@/components/layout/Breadcrumbs';
import { Section } from '@/components/ui/Section';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { SplitHeading } from '@/components/motion/SplitHeading';
import { Founders } from '@/components/sections/Founders';
import { ProcessTimeline } from '@/components/sections/ProcessTimeline';
import { FinalCta } from '@/components/sections/FinalCta';
import { FOUNDERS, PROCESS, RISK_REDUCTION, SOBRE_2026 } from '@/content/site';
import { ProblemGrid } from '@/components/sections/ProblemGrid';
import { buildMetadata } from '@/lib/seo/site';

export const metadata: Metadata = buildMetadata({
  title: 'Quem somos: fundadores, princípios e método',
  description:
    'A AGORAMOZ liga estratégia operacional e implementação: processo, software, automação, integração, infraestrutura e IA, por fases controladas.',
  path: '/sobre',
});

export default function SobrePage() {
  return (
    <>
      <Section surface="deep" contour>
        <Breadcrumbs items={[{ name: 'Início', path: '/' }, { name: 'Sobre', path: '/sobre' }]} className="mb-10" />
        <div className="rule flex items-baseline gap-4 pt-6">
          <span className="rule-label text-[color:var(--muted)]">01</span>
          <span className="rule-label text-[color:var(--accent)]">Sobre</span>
        </div>
        <SplitHeading
          as="h1"
          className="mt-10 max-w-[19ch] text-[length:var(--text-display)] leading-[var(--leading-display)] font-bold tracking-[var(--tracking-display)]"
        >
          {SOBRE_2026.title}
        </SplitHeading>
        <p className="mt-10 max-w-[56ch] text-[length:var(--text-lead)] text-[color:var(--muted)]">
          {SOBRE_2026.lead}
        </p>
        <div className="rule mt-16 grid gap-12 pt-10 md:grid-cols-2 lg:grid-cols-3">
          <div>
            <h2 className="font-display text-[length:var(--text-h3)] font-semibold">O que fazemos</h2>
            <p className="mt-3 text-[color:var(--muted)]">
              Diagnóstico, arquitetura, desenvolvimento, integração, documentação, formação e suporte
              inicial. O cliente não precisa de saber programar nem de gerir ferramentas técnicas.
            </p>
          </div>
          <div>
            <h2 className="font-display text-[length:var(--text-h3)] font-semibold">O que não fazemos</h2>
            <p className="mt-3 text-[color:var(--muted)]">
              Não prometemos aumentos de vendas nem recomendamos tecnologia antes de compreender o processo,
              a segurança e o custo de operação. {SOBRE_2026.prova}
            </p>
          </div>
          <div>
            <h2 className="font-display text-[length:var(--text-h3)] font-semibold">Onde operamos</h2>
            <p className="mt-3 text-[color:var(--muted)]">
              Moçambique, Portugal e Brasil. O método é o mesmo; a linguagem, as prioridades e os
              requisitos legais de cada mercado não são.
            </p>
          </div>
        </div>
      </Section>

      <Section surface="tint" aria-labelledby="h-principios">
        <SectionHeading id="h-principios" eyebrow={SOBRE_2026.principiosTitulo} title="O que orienta cada recomendação." lead={`Como medimos: ${SOBRE_2026.comoMedimos}`} max="wide" />
        <ProblemGrid items={[...SOBRE_2026.principios]} />
      </Section>

      <Section surface="light" aria-labelledby="h-founders">
        <SectionHeading id="h-founders" eyebrow={FOUNDERS.eyebrow} title={FOUNDERS.title} />
        <Founders />
      </Section>

      <Section surface="tint" aria-labelledby="h-processo-sobre">
        <SectionHeading id="h-processo-sobre" eyebrow={PROCESS.eyebrow} title={PROCESS.title} lead={PROCESS.lead} />
        <ProcessTimeline />
      </Section>

      <Section surface="dark" aria-labelledby="h-risco-sobre">
        <SectionHeading id="h-risco-sobre" eyebrow={RISK_REDUCTION.eyebrow} title={RISK_REDUCTION.title} lead={RISK_REDUCTION.body} max="wide" />
      </Section>

      <Section surface="deep" contour>
        <FinalCta />
      </Section>
    </>
  );
}
