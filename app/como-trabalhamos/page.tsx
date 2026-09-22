import type { Metadata } from 'next';
import { Section } from '@/components/ui/Section';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { ProcessTimeline } from '@/components/sections/ProcessTimeline';
import { FlowDiagram } from '@/components/home/FlowDiagram';
import { ProofSection } from '@/components/sections/ProofSection';
import { FinalCta } from '@/components/sections/FinalCta';
import { BreadcrumbJsonLd } from '@/components/seo/JsonLd';
import { PROCESS, PROOF, PROOF_SECTION, RISK_REDUCTION } from '@/content/site';
import { buildMetadata } from '@/lib/seo/site';

export const metadata: Metadata = buildMetadata({
  title: 'Como trabalhamos',
  description:
    'Diagnóstico, arquitetura, protótipo, implementação, ativação e evolução. A ferramenta é uma decisão técnica — vem depois de compreender o processo.',
  path: '/como-trabalhamos',
});

export default function ComoTrabalhamosPage() {
  return (
    <>
      <BreadcrumbJsonLd items={[{ name: 'Início', path: '/' }, { name: 'Como trabalhamos', path: '/como-trabalhamos' }]} />

      <Section surface="deep">
        <SectionHeading as="h1" eyebrow={PROCESS.eyebrow} title={PROCESS.title} lead={PROCESS.lead} max="wide" />
        <ProcessTimeline />
      </Section>

      <Section surface="light" bleed aria-label="O sistema de crescimento e operação">
        <FlowDiagram />
      </Section>

      <Section surface="tint" aria-labelledby="h-risco-ct">
        <SectionHeading id="h-risco-ct" eyebrow={RISK_REDUCTION.eyebrow} title={RISK_REDUCTION.title} lead={RISK_REDUCTION.body} max="wide" />
        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {RISK_REDUCTION.points.map((p) => (
            <p key={p} className="border-l-2 border-[color:var(--accent)] pl-5 text-[color:var(--muted)]">
              {p}
            </p>
          ))}
        </div>
      </Section>

      <Section surface="light" aria-labelledby="h-prova-ct">
        <SectionHeading id="h-prova-ct" eyebrow={PROOF_SECTION.eyebrow} title={PROOF_SECTION.title} lead={PROOF_SECTION.lead} max="wide" />
        <ProofSection items={PROOF} />
      </Section>

      <Section surface="deep">
        <FinalCta />
      </Section>
    </>
  );
}
