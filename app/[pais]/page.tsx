import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Section } from '@/components/ui/Section';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { SplitHeading } from '@/components/motion/SplitHeading';
import { ProblemGrid } from '@/components/sections/ProblemGrid';
import { SectorExplorer } from '@/components/sections/SectorExplorer';
import { SolutionsGrid } from '@/components/sections/SolutionsGrid';
import { ProcessTimeline } from '@/components/sections/ProcessTimeline';
import { OfferSection } from '@/components/sections/OfferSection';
import { FinalCta } from '@/components/sections/FinalCta';
import { BreadcrumbJsonLd } from '@/components/seo/JsonLd';
import { COUNTRY_CODES, getCountry } from '@/content/registry';
import { PROCESS } from '@/content/site';
import { buildMetadata } from '@/lib/seo/site';

export const dynamicParams = false;

export function generateStaticParams() {
  return COUNTRY_CODES.map((pais) => ({ pais }));
}

type Props = { params: Promise<{ pais: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { pais } = await params;
  const c = getCountry(pais);
  if (!c) return {};
  return buildMetadata({
    title: c.seo.title,
    description: c.seo.description,
    path: `/${c.code}`,
    // hreflang recíproco: os três hubs de país existem todos.
    languages: { 'pt-MZ': '/mz', 'pt-PT': '/pt', 'pt-BR': '/br', 'x-default': '/' },
  });
}

export default async function PaisPage({ params }: Props) {
  const { pais } = await params;
  const c = getCountry(pais);
  if (!c) notFound();

  return (
    /* `lang` no wrapper: só o layout raiz pode renderizar <html>, e o leitor
       de ecrã usa na mesma o valor mais próximo. */
    <div lang={c.locale}>
      <BreadcrumbJsonLd items={[{ name: 'Início', path: '/' }, { name: c.name, path: `/${c.code}` }]} />

      <Section surface="deep">
        <div className="rule flex items-baseline gap-4 pt-6">
          <span className="rule-label text-[color:var(--muted)]">{c.locale}</span>
          <span className="rule-label text-[color:var(--accent)]">{c.hero.eyebrow}</span>
        </div>
        <SplitHeading
          as="h1"
          className="mt-10 max-w-[19ch] text-[length:var(--text-display)] leading-[var(--leading-display)] font-bold tracking-[var(--tracking-display)]"
        >
          {c.hero.headline}
        </SplitHeading>
        <p className="mt-10 max-w-[56ch] text-[length:var(--text-lead)] text-[color:var(--muted)]">
          {c.hero.lead}
        </p>
        <p className="mt-10 max-w-[56ch] border-l border-[color:var(--accent)] pl-6 text-[length:var(--text-lead)]">
          {c.positioning}
        </p>
      </Section>

      <Section surface="light" aria-labelledby="h-prob-pais">
        <SectionHeading
          id="h-prob-pais"
          eyebrow="O problema"
          title={`O que encontramos em empresas ${c.demonym}.`}
          lead={c.voice.proofLanguage}
        />
        <ProblemGrid items={c.problems} />
      </Section>

      <Section surface="tint" id="setores" aria-labelledby="h-set-pais">
        <SectionHeading
          id="h-set-pais"
          eyebrow="Setores"
          title={`Cinco verticais prioritárias em ${c.name}.`}
          lead="Escolhidas por relevância económica, intensidade de processos e potencial de automação — não por participação contabilística no PIB."
        />
        <SectorExplorer initial={c.code} />
      </Section>

      <Section surface="light" aria-labelledby="h-sol-pais">
        <SectionHeading id="h-sol-pais" eyebrow="Soluções" title="As capacidades que aplicamos." />
        <SolutionsGrid />
      </Section>

      <Section surface="dark" aria-labelledby="h-proc-pais">
        <SectionHeading id="h-proc-pais" eyebrow={PROCESS.eyebrow} title={PROCESS.title} lead={PROCESS.lead} />
        <ProcessTimeline />
      </Section>

      <Section surface="deep">
        <OfferSection href={`/diagnostico?pais=${c.code}`} />
      </Section>

      <Section surface="light">
        <FinalCta href={`/diagnostico?pais=${c.code}`} />
      </Section>
    </div>
  );
}
