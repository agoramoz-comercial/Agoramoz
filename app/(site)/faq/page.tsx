import type { Metadata } from 'next';
import { Breadcrumbs } from '@/components/layout/Breadcrumbs';
import { FaqJsonLd } from '@/components/seo/JsonLd';
import { FinalCta } from '@/components/sections/FinalCta';
import { Accordion } from '@/components/ui/Accordion';
import { Section } from '@/components/ui/Section';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { FAQ_2026 } from '@/content/site';
import { buildMetadata } from '@/lib/seo/site';

export const metadata: Metadata = buildMetadata({
  title: 'Perguntas frequentes: diagnóstico e suporte',
  description:
    'Avaliação inicial, diagnóstico, sistemas existentes, preço fechado, propriedade do código, suporte, resultados, dados pessoais e projetos internacionais.',
  path: '/faq',
});

/** Website Final 2026, §22: objeções reais, incluindo o que não fazemos. */
export default function FaqPage() {
  const items = FAQ_2026.items.map((f) => ({ q: f.q, a: f.a }));
  return (
    <>
      <FaqJsonLd items={items} path="/faq" />
      <Section surface="deep" contour>
        <Breadcrumbs items={[{ name: 'Início', path: '/' }, { name: 'Perguntas frequentes', path: '/faq' }]} className="mb-10" />
        <SectionHeading as="h1" eyebrow={FAQ_2026.eyebrow} title={FAQ_2026.title} lead={FAQ_2026.lead} max="wide" />
      </Section>

      <Section surface="light" aria-label={FAQ_2026.eyebrow}>
        <div className="max-w-[52rem]">
          <Accordion items={items} />
        </div>
      </Section>

      <Section surface="deep" contour>
        <FinalCta />
      </Section>
    </>
  );
}
