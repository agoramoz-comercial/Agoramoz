import type { Metadata } from 'next';
import { Section } from '@/components/ui/Section';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { SplitHeading } from '@/components/motion/SplitHeading';
import { Founders } from '@/components/sections/Founders';
import { ProcessTimeline } from '@/components/sections/ProcessTimeline';
import { FinalCta } from '@/components/sections/FinalCta';
import { BreadcrumbJsonLd } from '@/components/seo/JsonLd';
import { FOUNDERS, PROCESS, RISK_REDUCTION } from '@/content/site';
import { buildMetadata } from '@/lib/seo/site';

export const metadata: Metadata = buildMetadata({
  title: 'Sobre a AGORAMOZ',
  description:
    'A AGORAMOZ constrói infraestrutura digital orientada a crescimento, produtividade e controlo operacional para empresas em Moçambique, Portugal e Brasil.',
  path: '/sobre',
});

export default function SobrePage() {
  return (
    <>
      <BreadcrumbJsonLd items={[{ name: 'Início', path: '/' }, { name: 'Sobre', path: '/sobre' }]} />

      <Section surface="deep" contour>
        <div className="rule flex items-baseline gap-4 pt-6">
          <span className="rule-label text-[color:var(--muted)]">01</span>
          <span className="rule-label text-[color:var(--accent)]">Sobre</span>
        </div>
        <SplitHeading
          as="h1"
          className="mt-10 max-w-[19ch] text-[length:var(--text-display)] leading-[var(--leading-display)] font-bold tracking-[var(--tracking-display)]"
        >
          Existimos para reduzir o custo daquilo que a tecnologia devia ter resolvido.
        </SplitHeading>
        <p className="mt-10 max-w-[56ch] text-[length:var(--text-lead)] text-[color:var(--muted)]">
          A AGORAMOZ desenvolve websites avançados, software empresarial, automações e agentes de IA.
          Não vendemos ferramentas — construímos o sistema entre o problema económico e o resultado.
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
              Não prometemos aumentos de vendas. Não apresentamos demonstrações como casos reais. Não
              recomendamos tecnologia antes de compreender o processo, a segurança e o custo de operação.
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
