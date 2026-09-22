import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Section } from '@/components/ui/Section';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { SplitHeading } from '@/components/motion/SplitHeading';
import { Accordion } from '@/components/ui/Accordion';
import { Card } from '@/components/ui/Card';
import { ProblemGrid } from '@/components/sections/ProblemGrid';
import { OfferSection } from '@/components/sections/OfferSection';
import { CountriesBand } from '@/components/sections/CountriesBand';
import { FinalCta } from '@/components/sections/FinalCta';
import { Reveal } from '@/components/motion/Reveal';
import { BreadcrumbJsonLd, FaqJsonLd, ServiceJsonLd } from '@/components/seo/JsonLd';
import { ViewTracker } from '@/components/analytics/ViewTracker';
import { getAllSolutionParams, getSolution } from '@/content/registry';
import { buildMetadata } from '@/lib/seo/site';
import { Check } from 'lucide-react';

export const dynamicParams = false;

export function generateStaticParams() {
  return getAllSolutionParams();
}

type Props = { params: Promise<{ solucao: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { solucao } = await params;
  const s = getSolution(solucao);
  if (!s) return {};
  return buildMetadata({ title: s.seo.title, description: s.seo.description, path: `/solucoes/${s.slug}` });
}

export default async function SolucaoPage({ params }: Props) {
  const { solucao } = await params;
  const s = getSolution(solucao);
  if (!s) notFound();

  return (
    <>
      <ViewTracker event={{ name: 'service_viewed', solution: s.slug }} />
      <ServiceJsonLd name={s.label} description={s.seo.description} path={`/solucoes/${s.slug}`} />
      <FaqJsonLd items={s.faq} />
      <BreadcrumbJsonLd
        items={[
          { name: 'Início', path: '/' },
          { name: 'Soluções', path: '/solucoes' },
          { name: s.label, path: `/solucoes/${s.slug}` },
        ]}
      />

      <Section surface="deep">
        <div className="rule flex items-baseline gap-4 pt-6">
          <span className="rule-label text-[color:var(--muted)]">{s.hero.eyebrow}</span>
          <span className="rule-label text-[color:var(--accent)]">{s.label}</span>
        </div>
        <SplitHeading
          as="h1"
          className="mt-10 max-w-[19ch] text-[length:var(--text-display)] leading-[var(--leading-display)] font-bold tracking-[var(--tracking-display)]"
        >
          {s.hero.h1}
        </SplitHeading>
        <p className="mt-10 max-w-[56ch] text-[length:var(--text-lead)] text-[color:var(--muted)]">
          {s.hero.lead}
        </p>
        <p className="mt-10 max-w-[56ch] border-l border-[color:var(--accent)] pl-6 text-[length:var(--text-lead)]">
          {s.result}
        </p>
      </Section>

      <Section surface="light" aria-labelledby="h-prob-sol">
        <SectionHeading id="h-prob-sol" eyebrow="O problema" title="O que encontramos com mais frequência." />
        <ProblemGrid items={s.problems} columns={4} />
      </Section>

      <Section surface="tint" aria-labelledby="h-comp-sol">
        <SectionHeading id="h-comp-sol" eyebrow="Componentes" title="O que o sistema inclui." />
        <Reveal className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {s.components.map((c) => (
            <Card key={c.title} data-animate>
              <h3 className="font-display text-[1.0625rem] font-semibold">{c.title}</h3>
              <p className="mt-2.5 text-sm text-[color:var(--muted)]">{c.body}</p>
            </Card>
          ))}
        </Reveal>
      </Section>

      <Section surface="light" aria-labelledby="h-uso-sol">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <SectionHeading id="h-uso-sol" eyebrow="Casos de utilização" title="O que passa a acontecer sozinho." max="none" />
            <Reveal className="mt-8 space-y-3.5">
              {s.useCases.map((u) => (
                <p key={u} data-animate className="flex items-start gap-3 text-[color:var(--muted)]">
                  <Check aria-hidden className="mt-1 size-4 shrink-0 text-[color:var(--ok)]" />
                  {u}
                </p>
              ))}
            </Reveal>
          </div>
          <div>
            <h2 className="font-display text-[length:var(--text-h3)]">Integrações</h2>
            <ul className="mt-6 flex flex-wrap gap-2">
              {s.integrations.map((i) => (
                <li key={i} className="rounded-full border border-[color:var(--border)] px-4 py-1.5 text-sm text-[color:var(--muted)]">
                  {i}
                </li>
              ))}
            </ul>
            <h2 className="mt-12 font-display text-[length:var(--text-h3)]">Segurança e controlo</h2>
            <ul className="mt-6 space-y-3">
              {s.security.map((sec) => (
                <li key={sec} className="border-l-2 border-[color:var(--border)] pl-5 text-sm text-[color:var(--muted)]">
                  {sec}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      <Section surface="dark" aria-labelledby="h-proc-sol">
        <SectionHeading id="h-proc-sol" eyebrow="Processo" title="Como implementamos." />
        <Reveal className="mt-12 grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
          {s.process.map((p, i) => (
            <div key={p.title} data-animate className="border-t border-[color:var(--border)] pt-5">
              <span className="font-mono text-[length:var(--text-micro)] text-[color:var(--accent)]">
                {String(i + 1).padStart(2, '0')}
              </span>
              <h3 className="mt-2 font-display text-[length:var(--text-h3)]">{p.title}</h3>
              <p className="mt-2.5 text-sm text-[color:var(--muted)]">{p.body}</p>
            </div>
          ))}
        </Reveal>
      </Section>

      <Section surface="light" aria-labelledby="h-paises-sol">
        <SectionHeading id="h-paises-sol" eyebrow="Mercados" title="Onde aplicamos esta solução." />
        <CountriesBand />
      </Section>

      <Section surface="deep">
        <OfferSection />
      </Section>

      <Section surface="light" aria-labelledby="h-faq-sol">
        {/* Sem toLowerCase(): destruía o acrónimo em "Agentes de IA". */}
        <SectionHeading id="h-faq-sol" eyebrow="Perguntas frequentes" title={`Sobre ${s.label}.`} />
        <div className="mt-10 max-w-[52rem]">
          <Accordion items={s.faq} />
        </div>
      </Section>

      <Section surface="deep">
        <FinalCta />
      </Section>
    </>
  );
}
