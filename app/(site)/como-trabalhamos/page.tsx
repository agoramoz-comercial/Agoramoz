import type { Metadata } from 'next';
import Link from 'next/link';
import { Breadcrumbs } from '@/components/layout/Breadcrumbs';
import { Section } from '@/components/ui/Section';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { ProcessTimeline } from '@/components/sections/ProcessTimeline';
import { FlowDiagram } from '@/components/home/FlowDiagram';
import { ProofSection } from '@/components/sections/ProofSection';
import { FinalCta } from '@/components/sections/FinalCta';
import { CLIENT_RESPONSIBILITIES, PROCESS, PROOF, PROOF_SECTION, RISK_REDUCTION } from '@/content/site';
import { buildMetadata } from '@/lib/seo/site';

export const metadata: Metadata = buildMetadata({
  title: 'Como trabalhamos: fases, entregáveis e decisões',
  description:
    'Enquadramento, diagnóstico, piloto, implementação, estabilização e evolução. O cliente aprova cada fase antes de assumir o compromisso da seguinte.',
  path: '/como-trabalhamos',
});

export default function ComoTrabalhamosPage() {
  return (
    <>
      <Section surface="deep" contour>
        <Breadcrumbs items={[{ name: 'Início', path: '/' }, { name: 'Como trabalhamos', path: '/como-trabalhamos' }]} className="mb-10" />
        <SectionHeading as="h1" eyebrow={PROCESS.eyebrow} title={PROCESS.title} lead={PROCESS.lead} max="wide" />
        <ProcessTimeline nivelTitulo="h2" />
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

      <Section surface="light" aria-labelledby="h-resp-ct">
        <SectionHeading id="h-resp-ct" eyebrow={CLIENT_RESPONSIBILITIES.eyebrow} title={CLIENT_RESPONSIBILITIES.title} max="wide" />
        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {CLIENT_RESPONSIBILITIES.points.map((p) => (
            <p key={p} className="border-l-2 border-[color:var(--accent)] pl-5 text-[color:var(--muted)]">
              {p}
            </p>
          ))}
        </div>
        <p className="mt-10 max-w-[60ch] text-[color:var(--muted)]">
          O detalhe do que fica documentado em cada projeto está em{' '}
          <Link href="/seguranca-qualidade" className="text-[color:var(--accent)] underline underline-offset-4">
            segurança, privacidade e qualidade
          </Link>
          ; o que acontece depois do arranque, em{' '}
          <Link href="/solucoes/estabilizacao-e-evolucao" className="text-[color:var(--accent)] underline underline-offset-4">
            estabilização e evolução
          </Link>
          .
        </p>
      </Section>

      <Section surface="tint" aria-labelledby="h-prova-ct">
        <SectionHeading id="h-prova-ct" eyebrow={PROOF_SECTION.eyebrow} title={PROOF_SECTION.title} lead={PROOF_SECTION.lead} max="wide" />
        <ProofSection items={PROOF} />
      </Section>

      <Section surface="deep" contour>
        <FinalCta />
      </Section>
    </>
  );
}
