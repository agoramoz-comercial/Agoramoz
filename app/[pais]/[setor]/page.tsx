import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { AlertTriangle, Check } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { CTA } from '@/content/site';
import { Section } from '@/components/ui/Section';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { Accordion } from '@/components/ui/Accordion';
import { Card } from '@/components/ui/Card';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { SplitHeading } from '@/components/motion/SplitHeading';
import { MagneticButton } from '@/components/motion/MagneticButton';
import { ProblemGrid } from '@/components/sections/ProblemGrid';
import { ProofSection } from '@/components/sections/ProofSection';
import { OfferSection } from '@/components/sections/OfferSection';
import { FinalCta } from '@/components/sections/FinalCta';
import { Reveal } from '@/components/motion/Reveal';
import { BreadcrumbJsonLd, FaqJsonLd, ServiceJsonLd } from '@/components/seo/JsonLd';
import {
  COUNTRIES,
  SECTOR_LABELS,
  getAllSectorParams,
  getCountriesForSector,
  getSectorPage,
  renderSectorFormula,
} from '@/content/registry';
import { buildMetadata } from '@/lib/seo/site';
import type { SectorSlug } from '@/content/types';

export const dynamicParams = false;

export function generateStaticParams() {
  return getAllSectorParams();
}

type Props = { params: Promise<{ pais: string; setor: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { pais, setor } = await params;
  const page = getSectorPage(pais, setor);
  if (!page) return {};

  /**
   * hreflang apenas para os países que publicam ESTE setor. Emitir um
   * alternate para uma página que não existe é, na melhor das hipóteses,
   * ignorado pelos motores de busca.
   */
  const languages = Object.fromEntries(
    getCountriesForSector(setor as SectorSlug).map((code) => [COUNTRIES[code].locale, `/${code}/${setor}`]),
  );

  return buildMetadata({
    title: page.seo.title,
    description: page.seo.description,
    path: `/${pais}/${setor}`,
    languages: Object.keys(languages).length > 1 ? languages : undefined,
  });
}

export default async function SetorPage({ params }: Props) {
  const { pais, setor } = await params;
  const page = getSectorPage(pais, setor);
  if (!page) notFound();

  const country = COUNTRIES[page.country];

  return (
    <div lang={country.locale}>
      <ServiceJsonLd
        name={`${page.label} — ${country.name}`}
        description={page.seo.description}
        path={`/${pais}/${setor}`}
        areaServed={country.name}
      />
      <FaqJsonLd items={page.faq} />
      <BreadcrumbJsonLd
        items={[
          { name: 'Início', path: '/' },
          { name: country.name, path: `/${country.code}` },
          { name: page.label, path: `/${pais}/${setor}` },
        ]}
      />

      {/* 1 + 2 — identificação e hero orientado ao resultado */}
      <Section surface="deep" contour>
        <div className="rule flex flex-wrap items-baseline gap-x-4 gap-y-1 pt-6">
          <span className="rule-label text-[color:var(--muted)]">{country.name}</span>
          <Eyebrow>{SECTOR_LABELS[page.sector]}</Eyebrow>
        </div>
        <SplitHeading
          as="h1"
          className="mt-10 max-w-[19ch] text-[length:var(--text-display)] leading-[var(--leading-display)] font-bold tracking-[var(--tracking-display)]"
        >
          {page.hero.headline}
        </SplitHeading>

        {/* A fórmula do documento: audiência, país, resultado, mecanismo e
            obstáculo. Longa de mais para H1, essencial como posicionamento. */}
        <p className="mt-12 max-w-[56ch] border-l border-[color:var(--accent)] pl-6 text-[length:var(--text-lead)]">
          {renderSectorFormula(page)}
        </p>

        <p className="mt-8 max-w-[52ch] text-[color:var(--muted)]">{page.hero.lead}</p>

        <div className="mt-9 flex flex-col gap-3 sm:flex-row">
          <MagneticButton>
            <Button asChild size="lg">
              <Link href={`/diagnostico?pais=${page.country}&setor=${page.sector}`}>
                {CTA.primary}
                <span aria-hidden className="transition-transform duration-300 group-hover:translate-x-1">→</span>
              </Link>
            </Button>
          </MagneticButton>
          <Button asChild size="lg" variant="outline">
            <Link href="#prova-set">{CTA.secondary}</Link>
          </Button>
        </div>
      </Section>

      {/* 3 — problemas do setor */}
      <Section surface="light" aria-labelledby="h-prob-set">
        <SectionHeading id="h-prob-set" eyebrow="O problema" title="O que encontramos neste setor." />
        <ProblemGrid items={page.problems} columns={3} />
      </Section>

      {/* 4 — custo da inação */}
      <Section surface="tint" aria-labelledby="h-custo">
        <div className="grid gap-12 lg:grid-cols-[1fr_1fr] lg:gap-16">
          <div>
            <SectionHeading id="h-custo" eyebrow="Custo da inação" title="Onde é que isto custa dinheiro." max="none" />
            <p className="mt-6 text-[color:var(--muted)]">{page.costOfInaction.intro}</p>
          </div>
          <div>
            <Reveal className="space-y-3.5">
              {page.costOfInaction.items.map((i) => (
                <p key={i} data-animate className="flex items-start gap-3 text-[color:var(--muted)]">
                  <AlertTriangle aria-hidden className="mt-1 size-4 shrink-0 text-[color:var(--accent)]" />
                  {i}
                </p>
              ))}
            </Reveal>
            <p className="mt-7 border-t border-[color:var(--border)] pt-5 text-[length:var(--text-micro)] text-[color:var(--muted)]">
              {page.costOfInaction.caveat}
            </p>
          </div>
        </div>
      </Section>

      {/* 5 + 6 — mecanismo e componentes */}
      <Section surface="deep" aria-labelledby="h-sistema">
        <SectionHeading
          id="h-sistema"
          eyebrow={page.system.name}
          title="O sistema recomendado."
          lead={page.system.promise}
          max="wide"
        />
        <Reveal className="mt-12 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {page.system.steps.map((s, i) => (
            <div key={s.title} data-animate className="border-t border-[color:var(--border)] pt-5">
              <span className="font-techno font-medium text-[length:var(--text-micro)] text-[color:var(--accent)]">
                {String(i + 1).padStart(2, '0')}
              </span>
              <h3 className="mt-2 font-display text-[length:var(--text-h3)]">{s.title}</h3>
              <p className="mt-2.5 text-sm text-[color:var(--muted)]">{s.body}</p>
            </div>
          ))}
        </Reveal>
      </Section>

      <Section surface="light" aria-labelledby="h-comp-set">
        <SectionHeading id="h-comp-set" eyebrow="Componentes" title="O que o sistema inclui." />
        <Reveal className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {page.components.map((c) => (
            <Card key={c.title} data-animate>
              <h3 className="font-display text-[1.0625rem] font-semibold">{c.title}</h3>
              <p className="mt-2.5 text-sm text-[color:var(--muted)]">{c.body}</p>
            </Card>
          ))}
        </Reveal>
      </Section>

      {/* 7 + 9 + 10 — casos de uso, integrações, segurança */}
      <Section surface="tint" aria-labelledby="h-uso-set">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <SectionHeading id="h-uso-set" eyebrow="Casos de utilização" title="O que a equipa passa a conseguir fazer." max="none" />
            <Reveal className="mt-8 space-y-3.5">
              {page.useCases.map((u) => (
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
              {page.integrations.map((i) => (
                <li key={i} className="rounded-full border border-[color:var(--border)] px-4 py-1.5 text-sm text-[color:var(--muted)]">
                  {i}
                </li>
              ))}
            </ul>
            <h2 className="mt-12 font-display text-[length:var(--text-h3)]">Segurança e controlo</h2>
            <ul className="mt-6 space-y-3">
              {page.security.map((s) => (
                <li key={s} className="border-l-2 border-[color:var(--border)] pl-5 text-sm text-[color:var(--muted)]">
                  {s}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      {/* 8 + 11 — demonstração e prova */}
      <Section surface="light" id="prova-set" aria-labelledby="h-prova-set">
        <SectionHeading
          id="h-prova-set"
          eyebrow="Prova"
          title="O que podemos mostrar hoje."
          lead="Demonstrações e método. Quando existirem clientes neste setor, esta secção passa a apresentar resultados medidos e depoimentos autorizados."
          max="wide"
        />
        <ProofSection items={page.proof} />
      </Section>

      {/* 12 — oferta de entrada */}
      <Section surface="deep">
        <OfferSection href={`/diagnostico?pais=${page.country}&setor=${page.sector}`} />
      </Section>

      {/* 13 — FAQ do setor */}
      <Section surface="light" aria-labelledby="h-faq-set">
        <SectionHeading id="h-faq-set" eyebrow="Perguntas frequentes" title="O que nos perguntam neste setor." />
        <div className="mt-10 max-w-[52rem]">
          <Accordion items={page.faq} />
        </div>
      </Section>

      {/* 14 — CTA final */}
      <Section surface="deep" contour>
        <FinalCta href={`/diagnostico?pais=${page.country}&setor=${page.sector}`} />
      </Section>
    </div>
  );
}
