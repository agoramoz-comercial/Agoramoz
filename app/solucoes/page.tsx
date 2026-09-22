import type { Metadata } from 'next';
import { Section } from '@/components/ui/Section';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { SolutionsGrid } from '@/components/sections/SolutionsGrid';
import { FinalCta } from '@/components/sections/FinalCta';
import { BreadcrumbJsonLd } from '@/components/seo/JsonLd';
import { buildMetadata } from '@/lib/seo/site';

export const metadata: Metadata = buildMetadata({
  title: 'Soluções',
  description:
    'Websites avançados, software empresarial, automação de processos, agentes de IA e infraestrutura digital. Cinco capacidades, um sistema.',
  path: '/solucoes',
});

export default function SolucoesPage() {
  return (
    <>
      <BreadcrumbJsonLd items={[{ name: 'Início', path: '/' }, { name: 'Soluções', path: '/solucoes' }]} />
      <Section surface="deep">
        <SectionHeading
          as="h1"
          eyebrow="Soluções"
          title="Cinco capacidades. Uma decide-se por diagnóstico, não por catálogo."
          lead="Cada capacidade resolve um bloqueio diferente. Apresentá-las como igualmente importantes seria inútil para si — o diagnóstico determina por qual começar."
          max="wide"
        />
        <SolutionsGrid />
      </Section>
      <Section surface="light">
        <FinalCta />
      </Section>
    </>
  );
}
